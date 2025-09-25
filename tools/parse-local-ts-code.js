/**
 * Parse Local TypeScript Code Tool
 *
 * 查看reports目录下对应的文件，如果不存在则尝试使用analysis_local_ts_code生成
 * 使用Complexity Report Annotator角色来解析代码并保存到/parsed目录
 *
 * 现在支持目录遍历：如果filePath是目录，则遍历目录下所有符合条件的报告文件
 */

const fs = require('fs');
const path = require('path');
const { checkPathType, traverseDirectory, getRelativePath, batchProcessFiles, createProgressReporter } = require('./directory-traversal-utils');

/**
 * 创建解析工具的柯里化函数
 * @param {string} dataPath 数据目录路径
 * @param {string} codebasePath 代码库目录路径
 * @param {object} config 配置对象
 * @returns {function} 工具处理函数
 */
function createParseTool(dataPath, codebasePath, config) {
  /**
   * 解析本地TS代码报告
   * @param {object} args 参数对象
   * @param {string} args.filePath 文件路径或目录路径
   * @param {string} [args.reportsDir] reports目录路径，默认为 dataPath/reports
   * @param {string} [args.parsedDir] parsed目录路径，默认为 dataPath/parsed
   * @returns {Promise<object>} 解析结果
   */
  return async function parseLocalTsCode(args) {
    try {
      const { filePath, reportsDir, parsedDir } = args;

      if (!filePath) {
        throw new Error('filePath parameter is required');
      }

      // 规范化文件路径
      const normalizedPath = path.normalize(filePath);
      console.log(`Parsing path: ${normalizedPath}`);

      // 检查路径类型
      const pathInfo = await checkPathType(normalizedPath, codebasePath);

      if (!pathInfo.exists) {
        return {
          success: false,
          error: 'Path not found',
          filePath: normalizedPath,
          suggestion: 'Please check the file or directory path and ensure it exists'
        };
      }

      // 如果是目录，进行目录遍历解析
      if (pathInfo.isDirectory) {
        return await parseDirectory(pathInfo.absolutePath, {
          reportsDir,
          parsedDir,
          dataPath,
          codebasePath,
          config,
          originalPath: normalizedPath
        });
      }

      // 处理单个文件的解析逻辑
      return await parseSingleFile(pathInfo.absolutePath, {
        reportsDir,
        parsedDir,
        dataPath,
        codebasePath,
        config,
        originalPath: normalizedPath
      });

    } catch (error) {
      console.error('Parse tool error:', error);
      return {
        success: false,
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      };
    }
  };
}

/**
 * 解析单个文件
 */
async function parseSingleFile(absoluteFilePath, options) {
  const { reportsDir, parsedDir, dataPath, codebasePath, config, originalPath } = options;

  try {
    const relativePath = getRelativePath(absoluteFilePath, codebasePath);

    // 构建报告和解析文件路径
    const resolvedReportsDir = reportsDir ? path.resolve(reportsDir) : path.join(dataPath, 'reports');
    const resolvedParsedDir = parsedDir ? path.resolve(parsedDir) : path.join(dataPath, 'parsed');

    const reportPath = findReportFile(relativePath, resolvedReportsDir);
    const parsedPath = path.join(resolvedParsedDir, relativePath + '.json');

    // 确保parsed目录存在
    const parsedDirPath = path.dirname(parsedPath);
    if (!fs.existsSync(parsedDirPath)) {
      fs.mkdirSync(parsedDirPath, { recursive: true });
    }

    // 检查报告文件是否存在
    if (!reportPath || !fs.existsSync(reportPath)) {
      return {
        success: false,
        error: 'Report file not found',
        filePath: relativePath,
        searchedPath: reportPath,
        suggestion: 'Run analysis_local_ts_code first to generate the report'
      };
    }

    // 读取报告文件
    let reportData;
    try {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      reportData = JSON.parse(reportContent);
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse report file',
        details: parseError.message,
        reportPath: reportPath,
        filePath: relativePath
      };
    }

    // 读取源文件内容 - 使用报告中的filePath属性而不是relativePath
    const actualFilePath = reportData.filePath || relativePath;
    const sourceCode = await readSourceFile(actualFilePath, codebasePath);
    if (!sourceCode.success) {
      return {
        success: false,
        error: 'Failed to read source file',
        details: sourceCode.error,
        filePath: relativePath,
        actualFilePath: actualFilePath,
        reportFilePath: reportData.filePath
      };
    }

    // 应用Complexity Report Annotator角色进行解析
    const annotatorResult = await applyComplexityReportAnnotator(
      reportData,
      sourceCode.content,
      relativePath,
      config
    );

    if (!annotatorResult.success) {
      return {
        success: false,
        error: 'Complexity Report Annotator failed',
        details: annotatorResult.error,
        reportPath: reportPath,
        filePath: relativePath
      };
    }

    // 保存解析结果到parsed目录
    try {
      const outputContent = JSON.stringify(annotatorResult.data, null, 2);
      fs.writeFileSync(parsedPath, outputContent, 'utf8');
      console.log(`Parsed results saved to: ${parsedPath}`);
    } catch (saveError) {
      return {
        success: false,
        error: 'Failed to save parsed results',
        details: saveError.message,
        parsedPath: parsedPath,
        filePath: relativePath
      };
    }

    return {
      success: true,
      filePath: relativePath,
      absolutePath: absoluteFilePath,
      io: {
        source_file: relativePath,
        report_path: reportPath,
        parsed_path: parsedPath,
        normalized: annotatorResult.normalized
      },
      summary: annotatorResult.data.summary,
      annotations: annotatorResult.data.annotations,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: 'parse_local_ts_code',
        type: 'single_file',
        reportSize: fs.statSync(reportPath).size,
        parsedSize: fs.statSync(parsedPath).size
      },
      tooling: annotatorResult.data.tooling
    };

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
 * 解析整个目录
 */
async function parseDirectory(absoluteDirPath, options) {
  const { reportsDir, parsedDir, dataPath, codebasePath, config, originalPath } = options;

  try {
    console.log(`Parsing directory: ${absoluteDirPath}`);

    // 首先找到所有可用的报告文件
    const resolvedReportsDir = reportsDir ? path.resolve(reportsDir) : path.join(dataPath, 'reports');

    // 遍历reports目录找出所有报告文件（排除健康度索引文件）
    const reportFiles = await traverseDirectory(resolvedReportsDir, {
      allowedExtensions: ['.json'],
      maxFiles: config.maxFilesPerDirectory || 100,
      excludePatterns: ['node_modules', '.git', 'excellent.json', 'good.json', 'fair.json', 'poor.json', 'critical.json']
    });

    if (reportFiles.length === 0) {
      return {
        success: false,
        error: 'No report files found in directory',
        directoryPath: originalPath,
        absolutePath: absoluteDirPath,
        reportsDir: resolvedReportsDir,
        suggestion: 'Run analysis_local_ts_code on the directory first to generate reports'
      };
    }

    console.log(`Found ${reportFiles.length} report files to parse`);

    // 创建进度报告器
    const reportProgress = createProgressReporter(reportFiles.length, 'Parsing files');

    // 批量处理文件
    const processor = async (reportFilePath) => {
      // 从报告文件路径推导出源文件路径
      const relativeReportPath = path.relative(resolvedReportsDir, reportFilePath);
      const sourceFilePath = relativeReportPath.replace('.json', '');
      const absoluteSourcePath = path.resolve(codebasePath, sourceFilePath);

      const result = await parseSingleFile(absoluteSourcePath, {
        reportsDir,
        parsedDir,
        dataPath,
        codebasePath,
        config,
        originalPath: sourceFilePath
      });

      const progress = reportProgress();
      if (config.verbose) {
        console.log(progress.message);
      }

      return result;
    };

    const batchResult = await batchProcessFiles(reportFiles, processor, {
      maxConcurrency: config.maxConcurrency || 3,
      stopOnError: false
    });

    // 整理结果
    const successfulResults = batchResult.results.filter(r => r.success && r.result.success);
    const failedResults = batchResult.results.filter(r => !r.success || !r.result.success);

    // 收集所有解析数据进行聚合
    const allAnnotations = [];
    const allSummaries = [];
    const parseStatistics = {};

    for (const result of successfulResults) {
      if (result.result.annotations) {
        allAnnotations.push({
          filePath: result.result.filePath,
          annotations: result.result.annotations
        });
      }
      if (result.result.summary) {
        allSummaries.push({
          filePath: result.result.filePath,
          summary: result.result.summary
        });
      }

      // 统计解析类型
      if (result.result.annotations) {
        for (const annotation of result.result.annotations) {
          const kind = annotation.kind || 'unknown';
          parseStatistics[kind] = (parseStatistics[kind] || 0) + 1;
        }
      }
    }

    // 生成目录级聚合统计
    const aggregateStats = generateParseAggregateStats(allSummaries, parseStatistics);

    return {
      success: true,
      directoryPath: originalPath,
      absolutePath: absoluteDirPath,
      summary: {
        totalReports: reportFiles.length,
        processedFiles: batchResult.summary.total,
        successfulParses: batchResult.summary.successful,
        failedParses: batchResult.summary.failed,
        totalAnnotations: allAnnotations.reduce((sum, a) => sum + a.annotations.length, 0)
      },
      aggregateStats,
      fileResults: successfulResults.map(r => ({
        filePath: r.result.filePath,
        success: r.result.success,
        annotationCount: r.result.annotations ? r.result.annotations.length : 0,
        healthLevel: r.result.summary?.healthLevel || 'unknown',
        maintainability: r.result.summary?.maintainability || null
      })),
      failures: failedResults.map(r => ({
        filePath: r.filePath,
        error: r.error || (r.result ? r.result.error : 'Unknown error')
      })),
      allAnnotations,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: 'parse_local_ts_code',
        type: 'directory_parse',
        reportsDir: resolvedReportsDir,
        parsedDir: parsedDir ? path.resolve(parsedDir) : path.join(dataPath, 'parsed')
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
 * 生成解析聚合统计信息
 */
function generateParseAggregateStats(summaries, parseStatistics) {
  if (summaries.length === 0) {
    return {
      totalFiles: 0,
      averageMaintainability: 0,
      healthDistribution: {},
      annotationTypes: parseStatistics,
      recommendations: []
    };
  }

  let totalMaintainability = 0;
  let maintainabilityCount = 0;
  const healthDistribution = {};
  const recommendations = [];

  for (const { filePath, summary } of summaries) {
    // 可维护性统计
    if (summary.maintainability && summary.maintainability > 0) {
      totalMaintainability += summary.maintainability;
      maintainabilityCount++;
    }

    // 健康度分布
    if (summary.healthLevel) {
      const health = summary.healthLevel;
      healthDistribution[health] = (healthDistribution[health] || 0) + 1;
    }

    // 生成建议
    if (summary.maintainability < 65) {
      recommendations.push({
        type: 'low_maintainability',
        filePath,
        message: `Low maintainability (${summary.maintainability}) - needs attention`
      });
    }

    if (summary.functionCount > 15) {
      recommendations.push({
        type: 'high_function_count',
        filePath,
        message: `Many functions (${summary.functionCount}) - consider refactoring`
      });
    }
  }

  return {
    totalFiles: summaries.length,
    averageMaintainability: maintainabilityCount > 0 ? (totalMaintainability / maintainabilityCount).toFixed(2) : 0,
    healthDistribution,
    annotationTypes: parseStatistics,
    recommendations,
    summary: {
      lowMaintainabilityFiles: recommendations.filter(r => r.type === 'low_maintainability').length,
      highFunctionCountFiles: recommendations.filter(r => r.type === 'high_function_count').length
    }
  };
}

/**
 * 查找报告文件
 */
function findReportFile(filePath, reportsDir) {
  const normalizedPath = path.normalize(filePath);

  // 可能的报告文件路径
  const possiblePaths = [
    // 首先尝试去掉扩展名的版本（新的目录结构格式）
    path.join(reportsDir, path.dirname(normalizedPath), path.basename(normalizedPath, path.extname(normalizedPath)) + '.json'),
    // 保持原始路径加 .json（向后兼容）
    path.join(reportsDir, normalizedPath + '.json'),
    // 仅使用文件名（向后兼容，文件在根目录）
    path.join(reportsDir, path.basename(normalizedPath) + '.json'),
    path.join(reportsDir, path.basename(normalizedPath, path.extname(normalizedPath)) + '.json')
  ];

  for (const reportPath of possiblePaths) {
    if (fs.existsSync(reportPath)) {
      return reportPath;
    }
  }

  return null;
}

/**
 * 读取源文件内容
 */
async function readSourceFile(filePath, codebasePath) {
  try {
    // 尝试多个可能的路径，优先使用codebasePath
    const possiblePaths = [
      path.isAbsolute(filePath) ? filePath : path.resolve(codebasePath, filePath),
      path.resolve(filePath),
      path.resolve(codebasePath, 'src', filePath),
      path.resolve(codebasePath, 'app', filePath),
      path.resolve(codebasePath, 'components', filePath)
    ];

    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        return {
          success: true,
          content: content,
          path: fullPath
        };
      }
    }

    return {
      success: false,
      error: 'Source file not found in any of the expected locations',
      searchedPaths: possiblePaths
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 应用Complexity Report Annotator角色进行代码解析
 */
async function applyComplexityReportAnnotator(reportData, sourceCode, filePath, config) {
  try {
    const sourceLines = sourceCode.split('\n');

    // 构建基础摘要信息
    const summary = {
      healthLevel: reportData.healthLevel || 'unknown',
      maintainability: reportData.analysis?.aggregate?.maintainability || 0,
      loc: reportData.analysis?.aggregate?.sloc?.logical || sourceLines.length,
      functionCount: reportData.analysis?.functions?.length || 0,
      classCount: reportData.analysis?.classes?.length || 0
    };

    // 处理函数和类的注释
    const annotations = [];

    // 处理函数
    if (reportData.analysis?.functions) {
      for (const func of reportData.analysis.functions) {
        const annotation = await createFunctionAnnotation(func, sourceLines, config);
        if (annotation) {
          annotations.push(annotation);
        }
      }
    }

    // 处理类
    if (reportData.analysis?.classes) {
      for (const cls of reportData.analysis.classes) {
        const annotation = await createClassAnnotation(cls, sourceLines, config);
        if (annotation) {
          annotations.push(annotation);
        }
      }
    }

    // 如果没有函数和类，创建文件级注释
    if (annotations.length === 0) {
      const fileAnnotation = createFileAnnotation(reportData, sourceLines, filePath, config);
      annotations.push(fileAnnotation);
    }

    const result = {
      io: {
        source_file: filePath,
        report_path: 'processed',
        parsed_path: 'generated',
        normalized: {
          performed: false
        }
      },
      summary: summary,
      annotations: annotations,
      tooling: {
        commands_run: ['complexity_report_annotator'],
        errors: [],
        notes: `Processed ${annotations.length} annotations from ${reportData.analysis?.functions?.length || 0} functions and ${reportData.analysis?.classes?.length || 0} classes`
      }
    };

    return {
      success: true,
      data: result,
      normalized: result.io.normalized
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: config.verbose ? error.stack : undefined
    };
  }
}

/**
 * 创建函数注释
 */
async function createFunctionAnnotation(func, sourceLines, config) {
  const startLine = func.line || func.lineStart || 1;
  const endLine = func.lineEnd || (startLine + (func.length || 10));

  // 提取代码片段
  const snippet = extractCodeSnippet(sourceLines, startLine, endLine);

  // 生成最小化注释
  const comments = generateMinimalComments(func, 'function', config);

  // 生成设计标记
  const designFlags = generateDesignFlags(func, 'function', config);

  // 生成快速操作建议
  const quickActions = generateQuickActions(func, 'function', config);

  return {
    symbol: func.name || '<anonymous>',
    kind: 'function',
    range: {
      startLine: startLine,
      endLine: endLine
    },
    complexity: func.complexity?.cyclomatic || func.complexity || 0,
    snippet: snippet,
    minimal_comments: comments,
    design_flags: designFlags,
    quick_actions: quickActions
  };
}

/**
 * 创建类注释
 */
async function createClassAnnotation(cls, sourceLines, config) {
  const startLine = cls.line || cls.lineStart || 1;
  const endLine = cls.lineEnd || (startLine + (cls.length || 20));

  const snippet = extractCodeSnippet(sourceLines, startLine, endLine);
  const comments = generateMinimalComments(cls, 'class', config);
  const designFlags = generateDesignFlags(cls, 'class', config);
  const quickActions = generateQuickActions(cls, 'class', config);

  return {
    symbol: cls.name || '<anonymous>',
    kind: 'class',
    range: {
      startLine: startLine,
      endLine: endLine
    },
    complexity: cls.complexity?.cyclomatic || cls.methods?.reduce((sum, m) => sum + (m.complexity || 0), 0) || 0,
    snippet: snippet,
    minimal_comments: comments,
    design_flags: designFlags,
    quick_actions: quickActions
  };
}

/**
 * 创建文件级注释
 */
function createFileAnnotation(reportData, sourceLines, filePath, config) {
  const aggregate = reportData.analysis?.aggregate || {};

  return {
    symbol: path.basename(filePath, path.extname(filePath)),
    kind: 'file',
    range: {
      startLine: 1,
      endLine: sourceLines.length
    },
    complexity: aggregate.complexity?.cyclomatic || 0,
    snippet: sourceLines.slice(0, Math.min(10, sourceLines.length)).join('\n'),
    minimal_comments: [
      `File contains ${reportData.analysis?.functions?.length || 0} functions, ${reportData.analysis?.classes?.length || 0} classes`,
      `Maintainability index: ${aggregate.maintainability || 'unknown'}`,
      `Overall health: ${reportData.healthLevel || 'unknown'}`
    ],
    design_flags: generateFileDesignFlags(reportData, config),
    quick_actions: [
      { action: 'analyze-structure', why: 'Review file organization' }
    ]
  };
}

/**
 * 提取代码片段
 */
function extractCodeSnippet(sourceLines, startLine, endLine) {
  const start = Math.max(0, startLine - 1);
  const end = Math.min(sourceLines.length, endLine);
  return sourceLines.slice(start, end).join('\n').substring(0, 500); // 限制长度
}

/**
 * 生成最小化注释
 */
function generateMinimalComments(item, type, config) {
  const comments = [];

  if (type === 'function') {
    const complexity = item.complexity?.cyclomatic || item.complexity || 0;

    if (complexity > 10) {
      comments.push(`High complexity (${complexity}) - consider breaking down`);
    }

    if (item.params && item.params.length > 4) {
      comments.push(`Many parameters (${item.params.length}) - consider using object parameter`);
    }

    if (item.length > 50) {
      comments.push(`Long function (${item.length} lines) - consider extracting sub-functions`);
    }
  }

  if (type === 'class') {
    if (item.methods && item.methods.length > 10) {
      comments.push(`Large class (${item.methods.length} methods) - check single responsibility`);
    }
  }

  if (comments.length === 0) {
    comments.push(`${type.charAt(0).toUpperCase() + type.slice(1)} appears well-structured`);
  }

  return comments;
}

/**
 * 生成设计标记
 */
function generateDesignFlags(item, type, config) {
  const flags = [];

  if (type === 'function') {
    const complexity = item.complexity?.cyclomatic || item.complexity || 0;

    if (complexity > 20) {
      flags.push({
        type: 'deep-nesting',
        severity: 'high',
        evidence: `Cyclomatic complexity ${complexity}`
      });
    } else if (complexity > 10) {
      flags.push({
        type: 'deep-nesting',
        severity: 'medium',
        evidence: `Cyclomatic complexity ${complexity}`
      });
    }

    if (item.length > 100) {
      flags.push({
        type: 'god-file',
        severity: 'medium',
        evidence: `Function length ${item.length} lines`
      });
    }
  }

  return flags;
}

/**
 * 生成文件级设计标记
 */
function generateFileDesignFlags(reportData, config) {
  const flags = [];
  const aggregate = reportData.analysis?.aggregate || {};

  if (aggregate.maintainability < 50) {
    flags.push({
      type: 'low-cohesion',
      severity: 'high',
      evidence: `Low maintainability index: ${aggregate.maintainability}`
    });
  }

  const functionCount = reportData.analysis?.functions?.length || 0;
  if (functionCount > 20) {
    flags.push({
      type: 'god-file',
      severity: 'medium',
      evidence: `Too many functions: ${functionCount}`
    });
  }

  return flags;
}

/**
 * 生成快速操作建议
 */
function generateQuickActions(item, type, config) {
  const actions = [];

  if (type === 'function') {
    const complexity = item.complexity?.cyclomatic || item.complexity || 0;

    if (complexity > 10) {
      actions.push({
        action: 'reduce-branching',
        why: 'High complexity indicates complex branching logic'
      });
    }

    if (item.length > 50) {
      actions.push({
        action: 'extract-function',
        why: 'Long function can be broken into smaller pieces'
      });
    }

    if (!item.tests || item.tests === 0) {
      actions.push({
        action: 'add-tests',
        why: 'Function lacks test coverage'
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      action: 'review',
      why: 'Regular code review recommended'
    });
  }

  return actions;
}

module.exports = createParseTool;