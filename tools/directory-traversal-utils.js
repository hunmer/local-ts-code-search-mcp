/**
 * Directory Traversal Utilities
 *
 * 为 MCP 工具提供通用的目录遍历和文件过滤功能
 * 支持深度搜索、文件类型过滤、排除模式等
 */

const fs = require('fs');
const path = require('path');

/**
 * 遍历目录下的所有文件
 * @param {string} dirPath 目录路径
 * @param {object} options 遍历选项
 * @param {string[]} [options.allowedExtensions] 允许的文件扩展名数组
 * @param {string[]} [options.excludePatterns] 排除的文件/目录模式
 * @param {number} [options.maxDepth] 最大遍历深度，-1 表示无限制
 * @param {boolean} [options.followSymlinks] 是否跟随符号链接
 * @param {number} [options.maxFiles] 最大文件数量限制
 * @returns {Promise<string[]>} 符合条件的文件路径数组
 */
async function traverseDirectory(dirPath, options = {}) {
  const {
    allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'],
    excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
    maxDepth = -1,
    followSymlinks = false,
    maxFiles = 1000
  } = options;

  const results = [];
  const visited = new Set(); // 防止循环引用

  /**
   * 递归遍历函数
   * @param {string} currentPath 当前路径
   * @param {number} depth 当前深度
   */
  async function traverse(currentPath, depth = 0) {
    if (maxDepth >= 0 && depth > maxDepth) {
      return;
    }

    if (results.length >= maxFiles) {
      return;
    }

    try {
      const stats = fs.statSync(currentPath);
      const realPath = followSymlinks ? fs.realpathSync(currentPath) : currentPath;

      // 检查是否已访问过（防止循环）
      if (visited.has(realPath)) {
        return;
      }
      visited.add(realPath);

      if (stats.isDirectory()) {
        // 检查是否应该排除此目录
        const dirName = path.basename(currentPath);
        if (shouldExclude(dirName, excludePatterns)) {
          return;
        }

        // 遍历目录内容
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry);
          await traverse(entryPath, depth + 1);
        }
      } else if (stats.isFile()) {
        // 检查文件是否符合条件
        if (isFileAllowed(currentPath, allowedExtensions, excludePatterns)) {
          results.push(currentPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的文件/目录
      console.warn(`Warning: Cannot access ${currentPath}: ${error.message}`);
    }
  }

  await traverse(dirPath);
  return results;
}

/**
 * 检查文件是否被允许
 * @param {string} filePath 文件路径
 * @param {string[]} allowedExtensions 允许的扩展名
 * @param {string[]} excludePatterns 排除模式
 * @returns {boolean}
 */
function isFileAllowed(filePath, allowedExtensions, excludePatterns) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const relativePath = filePath;

  // 检查扩展名
  if (!allowedExtensions.includes(ext)) {
    return false;
  }

  // 检查排除模式
  return !shouldExclude(fileName, excludePatterns) &&
         !shouldExclude(relativePath, excludePatterns);
}

/**
 * 检查路径是否应该被排除
 * @param {string} pathStr 路径字符串
 * @param {string[]} excludePatterns 排除模式
 * @returns {boolean}
 */
function shouldExclude(pathStr, excludePatterns) {
  for (const pattern of excludePatterns) {
    if (pathStr.includes(pattern)) {
      return true;
    }

    // 支持简单的通配符匹配
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(pathStr)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 检查路径是否为目录
 * @param {string} filePath 文件路径
 * @param {string} codebasePath 基础代码目录
 * @returns {Promise<{isDirectory: boolean, exists: boolean, absolutePath: string}>}
 */
async function checkPathType(filePath, codebasePath) {
  try {
    // 解析绝对路径
    let absolutePath;
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
    } else {
      // 首先尝试相对于代码库目录
      absolutePath = path.resolve(codebasePath, filePath);

      // 如果不存在，尝试相对于当前工作目录
      if (!fs.existsSync(absolutePath)) {
        const cwdPath = path.resolve(filePath);
        if (fs.existsSync(cwdPath)) {
          absolutePath = cwdPath;
        }
      }
    }

    const exists = fs.existsSync(absolutePath);
    if (!exists) {
      return { isDirectory: false, exists: false, absolutePath };
    }

    const stats = fs.statSync(absolutePath);
    return {
      isDirectory: stats.isDirectory(),
      exists: true,
      absolutePath,
      isFile: stats.isFile()
    };
  } catch (error) {
    return {
      isDirectory: false,
      exists: false,
      absolutePath: filePath,
      error: error.message
    };
  }
}

/**
 * 获取文件的相对路径（相对于代码库目录）
 * @param {string} absolutePath 绝对路径
 * @param {string} codebasePath 代码库目录
 * @returns {string} 相对路径
 */
function getRelativePath(absolutePath, codebasePath) {
  try {
    const relativePath = path.relative(codebasePath, absolutePath);

    // 如果相对路径以 .. 开头，说明文件在代码库外部
    if (relativePath.startsWith('..')) {
      return path.basename(absolutePath);
    }

    return relativePath;
  } catch (error) {
    return path.basename(absolutePath);
  }
}

/**
 * 批量处理文件列表
 * @param {string[]} filePaths 文件路径列表
 * @param {Function} processor 处理函数
 * @param {object} options 处理选项
 * @param {boolean} [options.stopOnError] 遇到错误时是否停止
 * @param {number} [options.maxConcurrency] 最大并发数
 * @returns {Promise<object[]>} 处理结果数组
 */
async function batchProcessFiles(filePaths, processor, options = {}) {
  const {
    stopOnError = false,
    maxConcurrency = 3
  } = options;

  const results = [];
  const errors = [];

  // 分批处理以控制并发
  for (let i = 0; i < filePaths.length; i += maxConcurrency) {
    const batch = filePaths.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (filePath, index) => {
      try {
        const result = await processor(filePath);
        return {
          filePath,
          success: true,
          result,
          index: i + index
        };
      } catch (error) {
        const errorInfo = {
          filePath,
          success: false,
          error: error.message,
          index: i + index
        };

        errors.push(errorInfo);

        if (stopOnError) {
          throw error;
        }

        return errorInfo;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (stopOnError && errors.length > 0) {
      break;
    }
  }

  return {
    results,
    errors,
    summary: {
      total: filePaths.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    }
  };
}

/**
 * 创建进度报告器
 * @param {number} total 总数量
 * @param {string} operation 操作名称
 * @returns {Function} 进度报告函数
 */
function createProgressReporter(total, operation = 'processing') {
  let completed = 0;
  const startTime = Date.now();

  return function reportProgress(increment = 1) {
    completed += increment;
    const percentage = Math.round((completed / total) * 100);
    const elapsed = Date.now() - startTime;
    const avgTime = elapsed / completed;
    const remaining = (total - completed) * avgTime;

    return {
      completed,
      total,
      percentage,
      elapsedMs: elapsed,
      estimatedRemainingMs: remaining,
      message: `${operation}: ${completed}/${total} (${percentage}%) - ETA: ${Math.round(remaining / 1000)}s`
    };
  };
}

module.exports = {
  traverseDirectory,
  checkPathType,
  getRelativePath,
  batchProcessFiles,
  createProgressReporter,
  isFileAllowed,
  shouldExclude
};