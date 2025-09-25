/**
 * Search Local TypeScript Code Tool
 *
 * 搜索parsed目录下对应的文件，如果不存在则尝试使用analysis工具生成
 * 使用json-search.js进行搜索，使用Change Locator角色整理信息
 *
 * 现在支持目录遍历：如果filePath是目录，则遍历目录下所有符合条件的文件
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { checkPathType, traverseDirectory, getRelativePath, batchProcessFiles, createProgressReporter } = require('./directory-traversal-utils');

/**
 * 创建搜索工具的柯里化函数
 * @param {string} dataPath 数据目录路径
 * @param {string} codebasePath 代码库目录路径
 * @param {object} config 配置对象
 * @returns {function} 工具处理函数
 */
function createSearchTool(dataPath, codebasePath, config) {
  /**
   * 搜索本地TS代码
   * @param {object} args 参数对象
   * @param {string} args.filePath 文件路径或目录路径
   * @param {string} [args.query] 搜索查询参数
   * @param {string} [args.searchDir] 搜索基础目录
   * @param {string} [args.reportsDir] reports目录路径
   * @param {string} [args.parsedDir] parsed目录路径
   * @returns {Promise<object>} 搜索结果
   */
  return async function searchLocalTsCode(args) {
    try {
      const { filePath, query, searchDir, reportsDir, parsedDir } = args;

      if (!filePath) {
        throw new Error('filePath parameter is required');
      }

      // 规范化文件路径
      const normalizedPath = path.normalize(filePath);

      // 检查路径类型
      const pathInfo = await checkPathType(normalizedPath, codebasePath);

      if (!pathInfo.exists) {
        return {
          success: false,
          error: 'Path not found',
          filePath: normalizedPath,
          absolutePath: pathInfo.absolutePath,
          suggestion: 'Please check the file or directory path and ensure it exists'
        };
      }

      // 如果是目录，进行目录遍历搜索
      if (pathInfo.isDirectory) {
        return await searchDirectory(pathInfo.absolutePath, {
          query,
          searchDir,
          reportsDir,
          parsedDir,
          dataPath,
          codebasePath,
          config,
          originalPath: normalizedPath
        });
      }

      // 处理单个文件的搜索逻辑
      return await searchSingleFile(pathInfo.absolutePath, {
        query,
        searchDir,
        reportsDir,
        parsedDir,
        dataPath,
        codebasePath,
        config,
        originalPath: normalizedPath
      });

    } catch (error) {
      console.error('Search tool error:', error);
      return {
        success: false,
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      };
    }
  };
}

/**
 * 搜索单个文件
 */
async function searchSingleFile(absoluteFilePath, options) {
  const { query, searchDir, reportsDir, parsedDir, dataPath, codebasePath, config, originalPath } = options;

  try {
    const relativePath = getRelativePath(absoluteFilePath, codebasePath);

    // 确定目录路径
    const resolvedParsedDir = parsedDir ? path.resolve(parsedDir) : path.join(dataPath, 'parsed');
    const targetFilePath = path.join(resolvedParsedDir, relativePath + '.json');

    console.log(`Searching for: ${relativePath}`);
    console.log(`Target file: ${targetFilePath}`);

    // 检查parsed目录下是否存在对应文件
    if (!fs.existsSync(targetFilePath)) {
      console.log('Parsed file not found, attempting to analyze...');

      // 尝试使用analysis_local_ts_code生成文件
      try {
        const outputDir = reportsDir || path.join(dataPath, 'reports');
        const analysisResult = await runAnalysis(relativePath, codebasePath, dataPath, config, outputDir);
        if (!analysisResult.success) {
          return {
            success: false,
            error: 'Failed to generate analysis for the file',
            details: analysisResult.error,
            filePath: relativePath,
            suggestion: 'Please ensure the source file exists and is a valid TypeScript/JavaScript file'
          };
        }
      } catch (analysisError) {
        return {
          success: false,
          error: 'Analysis failed',
          details: analysisError.message,
          filePath: relativePath
        };
      }
    }

    // 使用json-search.js搜索文件
    const searchOptions = {
      searchDir: searchDir,
      reportsDir: reportsDir,
      parsedDir: parsedDir
    };
    const searchResult = await runJsonSearch(targetFilePath, query, config, searchOptions);

    if (!searchResult.success) {
      return {
        success: false,
        error: 'Search failed',
        details: searchResult.error,
        filePath: relativePath
      };
    }

    // 使用Change Locator角色整理信息
    const locatorResult = await applyChangeLocator(searchResult.data, {
      filePath: relativePath,
      query: query || 'general_search'
    });

    return {
      success: true,
      filePath: relativePath,
      absolutePath: absoluteFilePath,
      searchQuery: query,
      results: searchResult.data,
      changeLocatorAnalysis: locatorResult,
      metadata: {
        targetFile: targetFilePath,
        timestamp: new Date().toISOString(),
        tool: 'search_local_ts_code',
        type: 'single_file'
      }
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
 * 搜索整个目录
 */
async function searchDirectory(absoluteDirPath, options) {
  const { query, searchDir, reportsDir, parsedDir, dataPath, codebasePath, config, originalPath } = options;

  try {
    console.log(`Searching directory: ${absoluteDirPath}`);

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

    console.log(`Found ${filePaths.length} files to search`);

    // 创建进度报告器
    const reportProgress = createProgressReporter(filePaths.length, 'Searching files');

    // 批量处理文件
    const processor = async (filePath) => {
      const result = await searchSingleFile(filePath, {
        query,
        searchDir,
        reportsDir,
        parsedDir,
        dataPath,
        codebasePath,
        config,
        originalPath: getRelativePath(filePath, codebasePath)
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

    // 合并所有搜索结果
    const allSearchResults = [];
    const allChangeLocatorAnalyses = [];

    for (const result of successfulResults) {
      if (result.result.results && result.result.results.length > 0) {
        allSearchResults.push(...result.result.results);
      }
      if (result.result.changeLocatorAnalysis) {
        allChangeLocatorAnalyses.push({
          filePath: result.result.filePath,
          analysis: result.result.changeLocatorAnalysis
        });
      }
    }

    // 生成目录级别的Change Locator分析
    const directoryLocatorAnalysis = await applyChangeLocator(allSearchResults, {
      filePath: originalPath,
      query: query || 'directory_search',
      isDirectory: true,
      fileCount: filePaths.length,
      matchCount: allSearchResults.length
    });

    return {
      success: true,
      directoryPath: originalPath,
      absolutePath: absoluteDirPath,
      searchQuery: query,
      summary: {
        totalFiles: filePaths.length,
        searchedFiles: batchResult.summary.total,
        successfulSearches: batchResult.summary.successful,
        failedSearches: batchResult.summary.failed,
        totalMatches: allSearchResults.length
      },
      results: allSearchResults,
      fileResults: successfulResults.map(r => ({
        filePath: r.result.filePath,
        matchCount: r.result.results ? r.result.results.length : 0,
        success: r.result.success
      })),
      failures: failedResults.map(r => ({
        filePath: r.filePath,
        error: r.error || (r.result ? r.result.error : 'Unknown error')
      })),
      changeLocatorAnalysis: directoryLocatorAnalysis,
      individualAnalyses: allChangeLocatorAnalyses,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: 'search_local_ts_code',
        type: 'directory_search'
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
 * 运行分析工具生成数据
 */
async function runAnalysis(filePath, codebasePath, dataPath, config, outputDir = null) {
  return new Promise((resolve) => {
    const analyzeScript = path.join(__dirname, 'analyze-complexity.js');

    if (!fs.existsSync(analyzeScript)) {
      resolve({
        success: false,
        error: `Analysis script not found: ${analyzeScript}`
      });
      return;
    }

    // 使用codebasePath解析源文件路径
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(codebasePath, filePath);

    // 确保数据目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    // 构建命令参数
    const args = [analyzeScript, '-d', absoluteFilePath];
    if (outputDir) {
      args.push('-o', outputDir);
    }

    const child = spawn('node', args, {
      cwd: dataPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: stdout,
          error: stderr
        });
      } else {
        resolve({
          success: false,
          error: `Analysis failed with exit code ${code}`,
          stderr: stderr,
          stdout: stdout
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn analysis process: ${error.message}`
      });
    });
  });
}

/**
 * 运行JSON搜索工具
 */
async function runJsonSearch(targetFile, query, config, searchOptions = {}) {
  return new Promise((resolve) => {
    const searchScript = path.join(__dirname, 'json-search.js');

    if (!fs.existsSync(searchScript)) {
      resolve({
        success: false,
        error: `Search script not found: ${searchScript}`
      });
      return;
    }

    // 构建搜索参数
    const args = ['node', searchScript, '--target', targetFile];

    // 添加目录参数
    if (searchOptions.searchDir) {
      args.push('--search-dir', searchOptions.searchDir);
    }
    if (searchOptions.reportsDir) {
      args.push('--reports-dir', searchOptions.reportsDir);
    }
    if (searchOptions.parsedDir) {
      args.push('--parsed-dir', searchOptions.parsedDir);
    }

    if (query) {
      // 尝试解析查询参数
      try {
        const queryParams = parseSearchQuery(query);
        if (queryParams.function) {
          args.push('--function', queryParams.function);
        }
        if (queryParams.dependencies) {
          args.push('--dependencies', queryParams.dependencies);
        }
        if (queryParams.jsonpath) {
          args.push('--use', 'jsonpath', queryParams.jsonpath);
        }
      } catch (parseError) {
        // 如果解析失败，将查询作为函数名搜索
        args.push('--function', query);
      }
    }

    args.push('--verbose');

    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      try {
        // 解析JSON输出
        let results = [];
        if (stdout.trim()) {
          // json-search.js输出不是纯JSON，需要解析
          results = parseJsonSearchOutput(stdout);
        }

        resolve({
          success: true,
          data: results,
          rawOutput: stdout,
          stderr: stderr
        });
      } catch (parseError) {
        resolve({
          success: false,
          error: `Failed to parse search results: ${parseError.message}`,
          rawOutput: stdout,
          stderr: stderr
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn search process: ${error.message}`
      });
    });
  });
}

/**
 * 解析搜索查询参数
 */
function parseSearchQuery(query) {
  if (typeof query === 'string') {
    try {
      return JSON.parse(query);
    } catch {
      return { function: query };
    }
  }
  return query || {};
}

/**
 * 解析json-search.js的输出
 */
function parseJsonSearchOutput(output) {
  const lines = output.split('\n').filter(line => line.trim());
  const results = [];

  let currentResult = null;
  for (const line of lines) {
    if (line.match(/^\d+\.\s+/)) {
      // 新的结果项
      if (currentResult) {
        results.push(currentResult);
      }

      const match = line.match(/^(\d+)\.\s+(.+?)\s+\((.+?)\)$/);
      if (match) {
        currentResult = {
          index: parseInt(match[1]),
          file: match[2],
          type: match[3],
          details: {}
        };
      }
    } else if (currentResult && line.includes(':')) {
      // 详细信息行
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        currentResult.details[key] = value;
      }
    }
  }

  if (currentResult) {
    results.push(currentResult);
  }

  return results;
}

/**
 * 应用Change Locator角色进行信息整理
 */
async function applyChangeLocator(searchData, context) {
  try {
    // 模拟Change Locator的分析逻辑
    const analysis = {
      matches: [],
      plan_draft: {
        summary: context.isDirectory
          ? `Directory search analysis for ${context.filePath} (${context.fileCount} files, ${context.matchCount} matches)`
          : `Code search analysis for ${context.filePath}`,
        steps: [],
        risks: []
      },
      tooling: {
        lookups: [`search_local_ts_code: ${context.filePath}`],
        errors: [],
        notes: context.isDirectory
          ? `Found ${searchData.length} matches across ${context.fileCount} files`
          : `Found ${searchData.length} matches`
      }
    };

    // 处理搜索结果
    for (const item of searchData) {
      const match = {
        file: item.file || context.filePath,
        symbol: extractSymbolFromResult(item),
        kind: determineSymbolKind(item),
        evidence: {
          from: 'search',
          signals: extractSignals(item)
        },
        confidence: calculateConfidence(item),
        impact: assessImpact(item),
        suggested_actions: generateSuggestedActions(item)
      };

      analysis.matches.push(match);
    }

    // 生成计划草案
    if (analysis.matches.length > 0) {
      analysis.plan_draft.steps.push({
        id: 'STEP-1',
        title: context.isDirectory
          ? 'Review directory search results and determine actions for each file'
          : 'Review search results and determine next actions',
        can_parallel: true,
        file_map: analysis.matches.map(match => ({
          path: match.file,
          action: 'review',
          why: 'Found in search results'
        })),
        acceptance_checks: ['Review completed', 'Actions determined'],
        dev_constraints: ['Focus on matched symbols only']
      });
    }

    return analysis;

  } catch (error) {
    return {
      error: `Change Locator analysis failed: ${error.message}`,
      matches: [],
      tooling: {
        lookups: [],
        errors: [error.message],
        notes: 'Analysis failed'
      }
    };
  }
}

/**
 * 辅助函数：从搜索结果中提取符号名
 */
function extractSymbolFromResult(result) {
  if (result.details && result.details.Functions) {
    const funcMatch = result.details.Functions.match(/- (\w+)/);
    return funcMatch ? funcMatch[1] : 'unknown';
  }
  return result.file ? path.basename(result.file, path.extname(result.file)) : 'unknown';
}

/**
 * 辅助函数：确定符号类型
 */
function determineSymbolKind(result) {
  if (result.details) {
    if (result.details.Functions) return 'function';
    if (result.details.Annotations) return 'component';
    if (result.type === 'report') return 'file';
  }
  return 'unknown';
}

/**
 * 辅助函数：提取信号
 */
function extractSignals(result) {
  const signals = [];
  if (result.details) {
    Object.keys(result.details).forEach(key => {
      signals.push(`${key}: ${result.details[key]}`);
    });
  }
  return signals;
}

/**
 * 辅助函数：计算置信度
 */
function calculateConfidence(result) {
  let confidence = 0.5; // 基础置信度

  if (result.details) {
    if (result.details.Health) confidence += 0.2;
    if (result.details.Maintainability) confidence += 0.2;
    if (result.details.Functions) confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * 辅助函数：评估影响程度
 */
function assessImpact(result) {
  if (result.details && result.details.Health) {
    const health = result.details.Health.toLowerCase();
    if (health.includes('poor') || health.includes('critical')) return 'high';
    if (health.includes('fair')) return 'medium';
  }
  return 'low';
}

/**
 * 辅助函数：生成建议操作
 */
function generateSuggestedActions(result) {
  const actions = [];

  if (result.type === 'parsed') {
    actions.push({ action: 'review', why: 'Parsed data available for analysis' });
  }

  if (result.details && result.details.Health) {
    const health = result.details.Health.toLowerCase();
    if (health.includes('poor')) {
      actions.push({ action: 'refactor', why: 'Health indicates code quality issues' });
    }
  }

  if (actions.length === 0) {
    actions.push({ action: 'examine', why: 'Found in search results' });
  }

  return actions;
}

module.exports = createSearchTool;