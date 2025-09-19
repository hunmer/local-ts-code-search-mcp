/**
 * Compare Directories MCP Tool
 * 
 * 使用 compare-directories.js 脚本对比 reports 和 parsed 目录，
 * 识别已生成报告但尚未解析的文件
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * 创建目录比较工具的柯里化函数
 * @param {string} dataPath 数据目录路径
 * @param {string} codebasePath 代码库目录路径
 * @param {object} config 配置对象
 * @returns {function} 工具处理函数
 */
function createCompareDirectoriesTool(dataPath, codebasePath, config) {
  /**
   * 比较 reports 和 parsed 目录
   * @param {object} args 参数对象
   * @param {string} [args.reportsDir] reports 目录路径，默认为 dataPath/reports
   * @param {string} [args.parsedDir] parsed 目录路径，默认为 dataPath/parsed
   * @param {boolean} [args.saveResult] 是否保存结果到 changes 目录，默认为 true
   * @returns {Promise<object>} 比较结果
   */
  return async function compareDirectories(args) {
    try {
      const { 
        reportsDir, 
        parsedDir, 
        saveResult = true 
      } = args;

      console.log(`Starting directory comparison...`);
      
      // 确定目录路径
      const resolvedReportsDir = resolveDirectoryPath(reportsDir, dataPath, 'reports');
      const resolvedParsedDir = resolveDirectoryPath(parsedDir, dataPath, 'parsed');
      
      console.log(`Reports directory: ${resolvedReportsDir}`);
      console.log(`Parsed directory: ${resolvedParsedDir}`);

      // 验证目录
      const validation = validateDirectories(resolvedReportsDir, resolvedParsedDir);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          details: validation.details
        };
      }

      // 运行比较脚本
      const comparisonResult = await runCompareScript(
        resolvedReportsDir, 
        resolvedParsedDir, 
        config
      );

      if (!comparisonResult.success) {
        return {
          success: false,
          error: 'Directory comparison failed',
          details: comparisonResult.error,
          stdout: comparisonResult.stdout,
          stderr: comparisonResult.stderr
        };
      }

      // 解析结果
      const parsedResult = parseComparisonOutput(comparisonResult.output);
      
      // 增强结果数据
      const enhancedResult = await enhanceComparisonResult(
        parsedResult,
        resolvedReportsDir,
        resolvedParsedDir,
        config
      );

      const result = {
        success: true,
        comparison: enhancedResult,
        directories: {
          reports: resolvedReportsDir,
          parsed: resolvedParsedDir
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool: 'compare_directories_mcp',
          command: comparisonResult.command,
          saveResult: saveResult
        },
        rawOutput: {
          stdout: comparisonResult.output,
          stderr: comparisonResult.stderr
        }
      };

      // 生成建议
      result.recommendations = generateRecommendations(enhancedResult);

      return result;

    } catch (error) {
      console.error('Compare directories tool error:', error);
      return {
        success: false,
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      };
    }
  };
}

/**
 * 解析目录路径
 */
function resolveDirectoryPath(providedPath, dataPath, defaultSubdir) {
  if (providedPath) {
    return path.isAbsolute(providedPath) ? providedPath : path.resolve(providedPath);
  }
  return path.join(dataPath, defaultSubdir);
}

/**
 * 验证目录
 */
function validateDirectories(reportsDir, parsedDir) {
  // 检查 reports 目录
  if (!fs.existsSync(reportsDir)) {
    return {
      valid: false,
      error: 'Reports directory does not exist',
      details: {
        reportsDir: reportsDir,
        exists: false,
        suggestion: 'Please run analysis_local_ts_code tool first to generate reports'
      }
    };
  }

  // 检查 parsed 目录（允许不存在，会给出警告）
  const parsedExists = fs.existsSync(parsedDir);
  
  return {
    valid: true,
    warnings: parsedExists ? [] : [`Parsed directory does not exist: ${parsedDir}`],
    details: {
      reportsDir: reportsDir,
      reportsExists: true,
      parsedDir: parsedDir,
      parsedExists: parsedExists
    }
  };
}

/**
 * 运行比较脚本
 */
async function runCompareScript(reportsDir, parsedDir, config) {
  return new Promise((resolve) => {
    const compareScript = path.join(__dirname, 'compare-directories.js');
    
    if (!fs.existsSync(compareScript)) {
      resolve({
        success: false,
        error: `Compare directories script not found: ${compareScript}`
      });
      return;
    }

    // 构建命令参数
    const args = [compareScript, '--reports', reportsDir, '--parsed', parsedDir];
    const command = `node ${args.join(' ')}`;
    
    console.log(`Running: ${command}`);

    const child = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: config.tools?.compareDirectories?.timeout || 30000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (config.verbose) {
        console.log('[COMPARE STDOUT]:', chunk);
      }
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (config.verbose) {
        console.log('[COMPARE STDERR]:', chunk);
      }
    });

    child.on('close', (code) => {
      console.log(`Compare process exited with code: ${code}`);
      
      if (code === 0 || stdout.trim()) {
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
          error: `Compare failed with exit code ${code}`,
          stderr: stderr,
          stdout: stdout,
          command: command,
          exitCode: code
        });
      }
    });

    child.on('error', (error) => {
      console.error('Compare process error:', error);
      resolve({
        success: false,
        error: `Failed to spawn compare process: ${error.message}`,
        command: command
      });
    });

    // 超时处理
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Compare process timed out',
          command: command
        });
      }
    }, config.tools?.compareDirectories?.timeout || 30000);
  });
}

/**
 * 解析比较输出
 */
function parseComparisonOutput(stdout) {
  try {
    // 脚本输出的是JSON格式
    const lines = stdout.split('\n').filter(line => line.trim());
    
    // 查找JSON输出行
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        try {
          return JSON.parse(line);
        } catch (e) {
          // 继续尝试下一行
        }
      }
    }
    
    // 如果没找到JSON，尝试解析整个stdout
    return JSON.parse(stdout);
  } catch (error) {
    console.warn('Failed to parse comparison output as JSON:', error.message);
    return {
      timestamp: new Date().toISOString(),
      comparison: {
        statistics: {
          totalReportsFiles: 0,
          totalParsedFiles: 0,
          missingInParsedCount: 0
        },
        missingInParsed: [],
        parseError: error.message,
        rawOutput: stdout
      }
    };
  }
}

/**
 * 增强比较结果
 */
async function enhanceComparisonResult(parsedResult, reportsDir, parsedDir, config) {
  const comparison = parsedResult.comparison || {};
  const statistics = comparison.statistics || {};
  const missingFiles = comparison.missingInParsed || [];
  
  // 分析缺失文件的模式
  const patterns = analyzeFilePatterns(missingFiles);
  const categories = categorizeFiles(missingFiles);
  
  // 计算健康度分布（如果有健康度索引文件）
  const healthDistribution = await analyzeHealthDistribution(reportsDir);
  
  // 预估解析工作量
  const workloadEstimate = estimateParseWorkload(missingFiles, statistics);
  
  return {
    ...comparison,
    analysis: {
      patterns: patterns,
      categories: categories,
      healthDistribution: healthDistribution,
      workloadEstimate: workloadEstimate
    },
    summary: {
      completionRate: statistics.totalReportsFiles > 0 
        ? ((statistics.totalParsedFiles / statistics.totalReportsFiles) * 100).toFixed(1) + '%'
        : '0%',
      remainingWork: statistics.missingInParsedCount,
      priorityFiles: identifyPriorityFiles(missingFiles, healthDistribution)
    }
  };
}

/**
 * 分析文件模式
 */
function analyzeFilePatterns(files) {
  const patterns = {
    byDirectory: {},
    byExtension: {},
    byType: {}
  };
  
  files.forEach(file => {
    // 按目录分组
    const dir = path.dirname(file);
    patterns.byDirectory[dir] = (patterns.byDirectory[dir] || 0) + 1;
    
    // 按扩展名分组
    const ext = path.extname(file);
    patterns.byExtension[ext] = (patterns.byExtension[ext] || 0) + 1;
    
    // 按文件类型分组
    const type = categorizeFileType(file);
    patterns.byType[type] = (patterns.byType[type] || 0) + 1;
  });
  
  return patterns;
}

/**
 * 文件分类
 */
function categorizeFiles(files) {
  const categories = {
    components: [],
    services: [],
    utilities: [],
    types: [],
    tests: [],
    config: [],
    other: []
  };
  
  files.forEach(file => {
    const category = categorizeFileType(file);
    if (categories[category]) {
      categories[category].push(file);
    } else {
      categories.other.push(file);
    }
  });
  
  return categories;
}

/**
 * 确定文件类型
 */
function categorizeFileType(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  
  if (fileName.includes('component') || dirName.includes('component')) {
    return 'components';
  } else if (fileName.includes('service') || dirName.includes('service')) {
    return 'services';
  } else if (fileName.includes('util') || dirName.includes('util')) {
    return 'utilities';
  } else if (fileName.includes('type') || fileName.includes('.d.')) {
    return 'types';
  } else if (fileName.includes('test') || fileName.includes('spec')) {
    return 'tests';
  } else if (fileName.includes('config') || fileName.includes('setting')) {
    return 'config';
  }
  
  return 'other';
}

/**
 * 分析健康度分布
 */
async function analyzeHealthDistribution(reportsDir) {
  const healthLevels = ['excellent', 'good', 'fair', 'poor', 'critical'];
  const distribution = {};
  
  for (const level of healthLevels) {
    const healthFile = path.join(reportsDir, `${level}.json`);
    if (fs.existsSync(healthFile)) {
      try {
        const content = fs.readFileSync(healthFile, 'utf8');
        const data = JSON.parse(content);
        distribution[level] = Array.isArray(data) ? data.length : 0;
      } catch (error) {
        distribution[level] = 0;
      }
    } else {
      distribution[level] = 0;
    }
  }
  
  return distribution;
}

/**
 * 预估解析工作量
 */
function estimateParseWorkload(missingFiles, statistics) {
  const totalFiles = statistics.totalReportsFiles || 0;
  const parsedFiles = statistics.totalParsedFiles || 0;
  const remainingFiles = missingFiles.length;
  
  // 简单的线性预估
  const averageTimePerFile = 2; // 假设每个文件平均2分钟
  const estimatedMinutes = remainingFiles * averageTimePerFile;
  
  return {
    totalFiles: totalFiles,
    completedFiles: parsedFiles,
    remainingFiles: remainingFiles,
    estimatedTimeMinutes: estimatedMinutes,
    estimatedTimeHours: Math.round(estimatedMinutes / 60 * 10) / 10,
    completionPercentage: totalFiles > 0 ? Math.round((parsedFiles / totalFiles) * 100) : 0
  };
}

/**
 * 识别优先处理文件
 */
function identifyPriorityFiles(missingFiles, healthDistribution) {
  // 简单的优先级策略：
  // 1. 复杂度高的文件
  // 2. 核心组件和服务
  // 3. 工具函数
  
  const priorityPatterns = [
    /service/i,
    /component/i,
    /controller/i,
    /handler/i,
    /manager/i,
    /core/i,
    /main/i,
    /index/i
  ];
  
  const priorityFiles = missingFiles.filter(file => {
    return priorityPatterns.some(pattern => pattern.test(file));
  });
  
  return priorityFiles.slice(0, 10); // 返回前10个优先文件
}

/**
 * 生成建议
 */
function generateRecommendations(comparisonResult) {
  const recommendations = [];
  const statistics = comparisonResult.statistics || {};
  const missingCount = statistics.missingInParsedCount || 0;
  
  if (missingCount === 0) {
    recommendations.push({
      type: 'success',
      message: 'All report files have been parsed! Directory sync is complete.',
      action: 'none'
    });
  } else {
    recommendations.push({
      type: 'action',
      message: `${missingCount} files need to be parsed`,
      action: 'parse_missing_files',
      details: `Consider running parse_local_ts_code for the missing files`
    });
    
    if (comparisonResult.summary?.priorityFiles?.length > 0) {
      recommendations.push({
        type: 'priority',
        message: `Focus on ${comparisonResult.summary.priorityFiles.length} priority files first`,
        action: 'parse_priority_files',
        files: comparisonResult.summary.priorityFiles
      });
    }
    
    if (comparisonResult.analysis?.categories) {
      const categories = comparisonResult.analysis.categories;
      const largestCategory = Object.keys(categories).reduce((a, b) => 
        categories[a].length > categories[b].length ? a : b
      );
      
      if (categories[largestCategory].length > 5) {
        recommendations.push({
          type: 'batch',
          message: `Consider batch processing ${categories[largestCategory].length} ${largestCategory} files`,
          action: 'batch_parse',
          category: largestCategory,
          files: categories[largestCategory]
        });
      }
    }
  }
  
  return recommendations;
}

module.exports = createCompareDirectoriesTool;