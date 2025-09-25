/**
 * Analysis Local TypeScript Code Tool
 *
 * 使用analyze-complexity.js分析TS文件复杂度，生成报告到reports目录
 * 工具会自动将结果生成到 /reports/ 对应的相对多层级目录
 *
 * 现在支持目录遍历：如果filePath是目录，则遍历目录下所有符合条件的文件
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { checkPathType, traverseDirectory, getRelativePath, batchProcessFiles, createProgressReporter } = require('./directory-traversal-utils');

/**
 * 创建分析工具的柯里化函数
 * @param {string} dataPath 数据目录路径
 * @param {string} codebasePath 代码库目录路径
 * @param {object} config 配置对象
 * @returns {function} 工具处理函数
 */
function createAnalysisTool(dataPath, codebasePath, config) {
  /**
   * 分析本地TS代码复杂度
   * @param {object} args 参数对象
   * @param {string} args.filePath 文件路径或目录路径
   * @param {string} [args.outputDir] 输出目录，默认为 'reports'
   * @returns {Promise<object>} 分析结果
   */
  return async function analysisLocalTsCode(args) {
    try {
      const { filePath, outputDir } = args;

      if (!filePath) {
        throw new Error('filePath parameter is required');
      }

      // 规范化文件路径
      const normalizedPath = path.normalize(filePath);
      console.log(`Analyzing path: ${normalizedPath}`);

      // 检查路径类型
      const pathInfo = await checkPathType(normalizedPath, codebasePath);

      if (!pathInfo.exists) {
        return {
          success: false,
          error: 'Path not found',
          filePath: normalizedPath,
          absolutePath: pathInfo.absolutePath,
          codebaseDirectory: codebasePath,
          currentWorkingDirectory: process.cwd(),
          suggestion: 'Please check the file or directory path and ensure it exists'
        };
      }

      // 如果是目录，进行目录遍历分析
      if (pathInfo.isDirectory) {
        return await analyzeDirectory(pathInfo.absolutePath, {
          outputDir,
          dataPath,
          codebasePath,
          config,
          originalPath: normalizedPath
        });
      }

      // 处理单个文件的分析逻辑
      return await analyzeSingleFile(pathInfo.absolutePath, {
        outputDir,
        dataPath,
        codebasePath,
        config,
        originalPath: normalizedPath,
        baseDir: null  // 单文件分析不需要基础目录
      });

    } catch (error) {
      console.error('Analysis tool error:', error);
      return {
        success: false,
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      };
    }
  };
}

/**
 * 分析单个文件
 */
async function analyzeSingleFile(absoluteFilePath, options) {
  const { outputDir, dataPath, codebasePath, config, originalPath, baseDir } = options;

  try {
    const relativePath = getRelativePath(absoluteFilePath, codebasePath);

    // 检查文件扩展名
    const ext = path.extname(relativePath).toLowerCase();
    const allowedExtensions = config.allowedExtensions || ['.ts', '.tsx', '.js', '.jsx'];

    if (!allowedExtensions.includes(ext)) {
      return {
        success: false,
        error: `Unsupported file extension: ${ext}`,
        filePath: relativePath,
        allowedExtensions: allowedExtensions
      };
    }

    // 运行复杂度分析
    const analysisResult = await runComplexityAnalysis(relativePath, absoluteFilePath, dataPath, codebasePath, config, outputDir, baseDir);

    if (!analysisResult.success) {
      return {
        success: false,
        error: 'Analysis execution failed',
        details: analysisResult.error,
        filePath: relativePath,
        stdout: analysisResult.stdout,
        stderr: analysisResult.stderr
      };
    }

    // 解析分析结果
    const parsedResult = parseAnalysisOutput(analysisResult.output, analysisResult.stderr);

    // 查找生成的报告文件
    const reportInfo = await findGeneratedReport(relativePath, dataPath, outputDir);

    // 询问用户是否使用parse_local_ts_code工具
    const shouldParse = await shouldOfferParseStep(reportInfo, config);

    const result = {
      success: true,
      filePath: relativePath,
      absolutePath: absoluteFilePath,
      analysis: parsedResult,
      reportFile: reportInfo,
      parseRecommendation: shouldParse,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: 'analysis_local_ts_code',
        type: 'single_file',
        command: analysisResult.command
      },
      rawOutput: {
        stdout: analysisResult.output,
        stderr: analysisResult.stderr
      }
    };

    // 如果建议解析且配置了自动解析，则提示
    if (shouldParse.recommended) {
      result.nextSteps = [
        'Run parse_local_ts_code tool to generate annotated analysis',
        `Command: parse_local_ts_code("${relativePath}")`
      ];
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      filePath: originalPath,
      absolutePath: absoluteFilePath
    };
  }
}

/**
 * 分析整个目录
 */
async function analyzeDirectory(absoluteDirPath, options) {
  const { outputDir, dataPath, codebasePath, config, originalPath } = options;

  try {
    console.log(`Analyzing directory: ${absoluteDirPath}`);

    // 遍历目录获取所有符合条件的文件
    const allowedExtensions = config.allowedExtensions || ['.ts', '.tsx', '.js', '.jsx'];
    const filePaths = await traverseDirectory(absoluteDirPath, {
      allowedExtensions,
      maxFiles: config.maxFilesPerDirectory || 100,
      excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
    });

    if (filePaths.length === 0) {
      return {
        success: false,
        error: 'No supported files found in directory',
        directoryPath: originalPath,
        absolutePath: absoluteDirPath,
        searchedExtensions: allowedExtensions,
        suggestion: 'Check if the directory contains TypeScript or JavaScript files'
      };
    }

    console.log(`Found ${filePaths.length} files to analyze`);

    // 创建进度报告器
    const reportProgress = createProgressReporter(filePaths.length, 'Analyzing files');

    // 批量处理文件
    const processor = async (filePath) => {
      const result = await analyzeSingleFile(filePath, {
        outputDir,
        dataPath,
        codebasePath,
        config,
        originalPath: getRelativePath(filePath, codebasePath),
        baseDir: codebasePath  // 传递项目根目录用于保持目录结构
      });

      const progress = reportProgress();
      if (config.verbose) {
        console.log(progress.message);
      }

      return result;
    };

    const batchResult = await batchProcessFiles(filePaths, processor, {
      maxConcurrency: config.maxConcurrency || 3,
      stopOnError: false
    });

    // 整理结果
    const successfulResults = batchResult.results.filter(r => r.success && r.result.success);
    const failedResults = batchResult.results.filter(r => !r.success || !r.result.success);

    // 收集所有分析数据进行聚合
    const allAnalyses = [];
    const allReportFiles = [];
    const parseRecommendations = [];

    for (const result of successfulResults) {
      if (result.result.analysis) {
        allAnalyses.push({
          filePath: result.result.filePath,
          analysis: result.result.analysis
        });
      }
      if (result.result.reportFile) {
        allReportFiles.push(result.result.reportFile);
      }
      if (result.result.parseRecommendation && result.result.parseRecommendation.recommended) {
        parseRecommendations.push({
          filePath: result.result.filePath,
          recommendation: result.result.parseRecommendation
        });
      }
    }

    // 生成聚合分析统计
    const aggregateStats = generateAggregateStats(allAnalyses);

    return {
      success: true,
      directoryPath: originalPath,
      absolutePath: absoluteDirPath,
      summary: {
        totalFiles: filePaths.length,
        analyzedFiles: batchResult.summary.total,
        successfulAnalyses: batchResult.summary.successful,
        failedAnalyses: batchResult.summary.failed,
        reportsGenerated: allReportFiles.filter(r => r.exists).length
      },
      aggregateStats,
      fileResults: successfulResults.map(r => ({
        filePath: r.result.filePath,
        success: r.result.success,
        complexity: r.result.analysis?.details?.complexity || null,
        maintainability: r.result.analysis?.details?.maintainability || null,
        healthLevel: r.result.analysis?.details?.healthLevel || null,
        reportGenerated: r.result.reportFile?.exists || false
      })),
      failures: failedResults.map(r => ({
        filePath: r.filePath,
        error: r.error || (r.result ? r.result.error : 'Unknown error')
      })),
      parseRecommendations,
      allReportFiles: allReportFiles.filter(r => r.exists),
      metadata: {
        timestamp: new Date().toISOString(),
        tool: 'analysis_local_ts_code',
        type: 'directory_analysis'
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      directoryPath: originalPath,
      absolutePath: absoluteDirPath,
      stack: config.verbose ? error.stack : undefined
    };
  }
}

/**
 * 生成聚合统计信息
 */
function generateAggregateStats(analyses) {
  if (analyses.length === 0) {
    return {
      totalFiles: 0,
      averageComplexity: 0,
      averageMaintainability: 0,
      healthDistribution: {},
      recommendations: []
    };
  }

  let totalComplexity = 0;
  let totalMaintainability = 0;
  let complexityCount = 0;
  let maintainabilityCount = 0;
  const healthDistribution = {};
  const recommendations = [];

  for (const { filePath, analysis } of analyses) {
    if (analysis.details) {
      // 复杂度统计
      if (analysis.details.complexity) {
        totalComplexity += parseFloat(analysis.details.complexity) || 0;
        complexityCount++;
      }

      // 可维护性统计
      if (analysis.details.maintainability) {
        totalMaintainability += parseFloat(analysis.details.maintainability) || 0;
        maintainabilityCount++;
      }

      // 健康度分布
      if (analysis.details.healthLevel) {
        const health = analysis.details.healthLevel;
        healthDistribution[health] = (healthDistribution[health] || 0) + 1;
      }

      // 生成建议
      if (analysis.details.complexity > 10) {
        recommendations.push({
          type: 'high_complexity',
          filePath,
          message: `High complexity (${analysis.details.complexity}) - consider refactoring`
        });
      }

      if (analysis.details.maintainability < 65) {
        recommendations.push({
          type: 'low_maintainability',
          filePath,
          message: `Low maintainability (${analysis.details.maintainability}) - needs attention`
        });
      }
    }
  }

  return {
    totalFiles: analyses.length,
    averageComplexity: complexityCount > 0 ? (totalComplexity / complexityCount).toFixed(2) : 0,
    averageMaintainability: maintainabilityCount > 0 ? (totalMaintainability / maintainabilityCount).toFixed(2) : 0,
    healthDistribution,
    recommendations,
    summary: {
      highComplexityFiles: recommendations.filter(r => r.type === 'high_complexity').length,
      lowMaintainabilityFiles: recommendations.filter(r => r.type === 'low_maintainability').length
    }
  };
}

/**
 * 运行复杂度分析工具
 */
async function runComplexityAnalysis(filePath, absoluteSourcePath, dataPath, codebasePath, config, outputDir = 'reports', baseDir = null) {
  return new Promise((resolve) => {
    const analyzeScript = path.join(__dirname, 'analyze-complexity.js');

    if (!fs.existsSync(analyzeScript)) {
      resolve({
        success: false,
        error: `Analysis script not found: ${analyzeScript}`
      });
      return;
    }

    // 构建命令参数 - use the absolute source path and custom output directory
    const resolvedOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(dataPath, outputDir);

    // 如果提供了 baseDir，我们需要特殊处理来保持目录结构
    let targetPath, baseDirArg;
    if (baseDir) {
      // 对于目录分析，传递基础目录作为参考点
      baseDirArg = baseDir;
      targetPath = absoluteSourcePath;
    } else {
      // 对于单文件分析，使用项目根目录作为基础目录，而不是文件路径
      baseDirArg = codebasePath;
      targetPath = absoluteSourcePath;
    }

    const args = [analyzeScript, '-d', targetPath, '-o', resolvedOutputDir, '--base', baseDirArg];
    const command = `node ${args.join(' ')}`;

    // 设置工作目录为dataPath
    const cwd = dataPath;

    // 确保工作目录存在
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }

    console.log(`Running: ${command}`);
    console.log(`Working directory: ${cwd}`);
    console.log(`Analysis script path: ${analyzeScript}`);
    console.log(`File to analyze: ${absoluteSourcePath}`);

    const child = spawn('node', args, {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: config.tools?.analyzeComplexity?.timeout || 30000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (config.verbose) {
        console.log('[ANALYSIS STDOUT]:', chunk);
      }
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (config.verbose) {
        console.log('[ANALYSIS STDERR]:', chunk);
      }
    });

    child.on('close', (code) => {
      console.log(`Analysis process exited with code: ${code}`);

      if (code === 0 || stdout.trim()) {
        // 即使退出码不为0，如果有输出也认为部分成功
        resolve({
          success: true,
          output: stdout,
          stderr: stderr,
          command: command,
          exitCode: code
        });
      } else {
        resolve({
          success: false,
          error: `Analysis failed with exit code ${code}`,
          stderr: stderr,
          stdout: stdout,
          command: command,
          exitCode: code
        });
      }
    });

    child.on('error', (error) => {
      console.error('Analysis process error:', error);
      resolve({
        success: false,
        error: `Failed to spawn analysis process: ${error.message}`,
        command: command
      });
    });

    // 超时处理
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Analysis process timed out',
          command: command
        });
      }
    }, config.tools?.analyzeComplexity?.timeout || 30000);
  });
}

/**
 * 解析分析输出
 */
function parseAnalysisOutput(stdout, stderr) {
  const result = {
    summary: 'Analysis completed',
    details: {},
    warnings: [],
    errors: []
  };

  // 解析标准输出中的信息
  if (stdout) {
    const lines = stdout.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // 解析各种输出模式
      if (line.includes('Analyzing')) {
        result.details.analyzedFile = line.replace('Analyzing', '').trim();
      } else if (line.includes('Health Level:')) {
        result.details.healthLevel = line.split(':')[1].trim();
      } else if (line.includes('Maintainability:')) {
        result.details.maintainability = parseFloat(line.split(':')[1].trim());
      } else if (line.includes('Complexity:')) {
        result.details.complexity = parseFloat(line.split(':')[1].trim());
      } else if (line.includes('LOC:')) {
        result.details.linesOfCode = parseInt(line.split(':')[1].trim());
      } else if (line.includes('Functions:')) {
        result.details.functionCount = parseInt(line.split(':')[1].trim());
      } else if (line.includes('Classes:')) {
        result.details.classCount = parseInt(line.split(':')[1].trim());
      } else if (line.includes('Report saved to:')) {
        result.details.reportPath = line.split('Report saved to:')[1].trim();
      }
    }
  }

  // 解析错误输出
  if (stderr) {
    const errorLines = stderr.split('\n').filter(line => line.trim());
    for (const line of errorLines) {
      if (line.toLowerCase().includes('warning')) {
        result.warnings.push(line);
      } else if (line.toLowerCase().includes('error')) {
        result.errors.push(line);
      }
    }
  }

  return result;
}

/**
 * 查找生成的报告文件
 */
async function findGeneratedReport(filePath, dataPath, outputDir = 'reports') {
  const reportsDir = path.isAbsolute(outputDir) ? outputDir : path.join(dataPath, outputDir);
  const normalizedPath = path.normalize(filePath);

  // 可能的报告文件路径
  const possiblePaths = [
    path.join(reportsDir, normalizedPath + '.json'),
    path.join(reportsDir, path.basename(normalizedPath) + '.json'),
    path.join(reportsDir, path.basename(normalizedPath, path.extname(normalizedPath)) + '.json')
  ];

  for (const reportPath of possiblePaths) {
    if (fs.existsSync(reportPath)) {
      try {
        const stats = fs.statSync(reportPath);
        const content = fs.readFileSync(reportPath, 'utf8');
        const jsonData = JSON.parse(content);

        return {
          path: reportPath,
          relativePath: path.relative(reportsDir, reportPath),
          size: stats.size,
          mtime: stats.mtime,
          exists: true,
          valid: true,
          preview: {
            healthLevel: jsonData.healthLevel,
            maintainability: jsonData.analysis?.aggregate?.maintainability,
            complexity: jsonData.analysis?.aggregate?.complexity?.cyclomatic,
            functionCount: jsonData.analysis?.functions?.length || 0
          }
        };
      } catch (error) {
        return {
          path: reportPath,
          exists: true,
          valid: false,
          error: `Failed to parse report: ${error.message}`
        };
      }
    }
  }

  return {
    exists: false,
    searchedPaths: possiblePaths,
    suggestion: 'Report file may not have been generated or saved to a different location'
  };
}

/**
 * 判断是否应该建议执行parse步骤
 */
async function shouldOfferParseStep(reportInfo, config) {
  if (!reportInfo.exists) {
    return {
      recommended: false,
      reason: 'No report file found to parse'
    };
  }

  if (!reportInfo.valid) {
    return {
      recommended: false,
      reason: 'Report file is invalid or corrupted'
    };
  }

  // 检查parsed目录中是否已有解析结果
  const parsedPath = reportInfo.path.replace('/reports/', '/parsed/');
  if (fs.existsSync(parsedPath)) {
    const parsedStats = fs.statSync(parsedPath);
    const reportStats = fs.statSync(reportInfo.path);

    if (parsedStats.mtime >= reportStats.mtime) {
      return {
        recommended: false,
        reason: 'Parsed version is up to date',
        existing: parsedPath
      };
    }
  }

  // 基于复杂度和健康度决定是否建议解析
  const preview = reportInfo.preview || {};

  let priority = 'low';
  let reasons = [];

  if (preview.complexity > 10) {
    priority = 'high';
    reasons.push(`High complexity (${preview.complexity})`);
  }

  if (preview.maintainability < 65) {
    priority = 'high';
    reasons.push(`Low maintainability (${preview.maintainability})`);
  }

  if (preview.functionCount > 10) {
    priority = 'medium';
    reasons.push(`Many functions (${preview.functionCount})`);
  }

  return {
    recommended: true,
    priority: priority,
    reasons: reasons,
    reportPath: reportInfo.path,
    message: `Analysis complete. ${reasons.length > 0 ? 'Consider parsing for detailed insights: ' + reasons.join(', ') : 'Ready for parsing.'}`
  };
}

module.exports = createAnalysisTool;