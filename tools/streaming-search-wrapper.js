/**
 * 流式搜索工具包装器
 * 为现有工具添加流式输出支持
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * 创建支持流式输出的工具包装器
 * @param {function} originalTool 原始工具函数
 * @param {object} toolConfig 工具配置
 * @returns {function} 增强的工具函数
 */
function createStreamingWrapper(originalTool, toolConfig = {}) {
  const enhancedTool = async function(args, streamOptions = null) {
    // 如果没有流式选项，使用原始工具
    if (!streamOptions) {
      return await originalTool(args);
    }

    const {
      onProgress = () => {},
      onData = () => {},
      onError = () => {},
      enableProgress = true
    } = streamOptions;

    try {
      // 发送开始信号
      if (enableProgress) {
        onProgress(1, '开始处理请求...');
      }

      // 检查是否需要分析
      const result = await executeWithProgress(originalTool, args, {
        onProgress,
        onData,
        onError,
        enableProgress,
        toolConfig
      });

      return result;

    } catch (error) {
      onError(error);
      throw error;
    }
  };

  // 添加流式执行方法
  enhancedTool.streamExecute = async function(args, streamOptions) {
    return await enhancedTool(args, streamOptions);
  };

  return enhancedTool;
}

/**
 * 带进度的执行函数
 */
async function executeWithProgress(originalTool, args, options) {
  const { onProgress, onData, onError, enableProgress, toolConfig } = options;

  try {
    // 步骤1：验证参数
    if (enableProgress) onProgress(1, '验证输入参数...');

    if (!args.filePath) {
      throw new Error('filePath parameter is required');
    }

    // 步骤2：准备路径
    if (enableProgress) onProgress(1, '准备文件路径...');

    const normalizedPath = path.normalize(args.filePath);
    onData({
      type: 'path_info',
      originalPath: args.filePath,
      normalizedPath,
      timestamp: new Date().toISOString()
    });

    // 步骤3：检查文件存在
    if (enableProgress) onProgress(1, '检查目标文件...');

    // 这里可以添加更细粒度的进度报告
    const dataPath = toolConfig.dataPath || './data';
    const parsedDir = args.parsedDir || path.join(dataPath, 'parsed');
    const targetFilePath = path.join(parsedDir, normalizedPath + '.json');

    onData({
      type: 'file_check',
      targetFile: targetFilePath,
      exists: fs.existsSync(targetFilePath),
      timestamp: new Date().toISOString()
    });

    // 步骤4：执行分析（如果需要）
    if (!fs.existsSync(targetFilePath)) {
      if (enableProgress) onProgress(2, '目标文件不存在，开始分析...');

      // 如果需要分析，可以监听分析过程
      const analysisResult = await executeAnalysisWithProgress(
        args.filePath,
        toolConfig,
        { onProgress, onData, enableProgress }
      );

      if (!analysisResult.success) {
        throw new Error(`Analysis failed: ${analysisResult.error}`);
      }
    }

    // 步骤5：执行搜索
    if (enableProgress) onProgress(2, '执行搜索...');

    // 调用原始工具
    const startTime = Date.now();
    const result = await originalTool(args);
    const duration = Date.now() - startTime;

    // 发送最终结果信息
    onData({
      type: 'execution_complete',
      duration: `${duration}ms`,
      resultSize: JSON.stringify(result).length,
      timestamp: new Date().toISOString()
    });

    if (enableProgress) onProgress(2, '搜索完成');

    return result;

  } catch (error) {
    onError(error);
    throw error;
  }
}

/**
 * 带进度的分析执行
 */
async function executeAnalysisWithProgress(filePath, toolConfig, options) {
  const { onProgress, onData, enableProgress } = options;

  return new Promise((resolve) => {
    const analyzeScript = path.join(__dirname, 'analyze-complexity.js');

    if (!fs.existsSync(analyzeScript)) {
      resolve({
        success: false,
        error: `Analysis script not found: ${analyzeScript}`
      });
      return;
    }

    const codebasePath = toolConfig.codebasePath || process.cwd();
    const dataPath = toolConfig.dataPath || './data';

    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(codebasePath, filePath);

    if (enableProgress) onProgress(1, '启动分析进程...');

    const args = [analyzeScript, '-d', absoluteFilePath];
    const child = spawn('node', args, {
      cwd: dataPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;

      // 发送实时输出
      onData({
        type: 'analysis_output',
        output: output.trim(),
        timestamp: new Date().toISOString()
      });
    });

    child.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;

      // 发送错误输出
      onData({
        type: 'analysis_error',
        error: error.trim(),
        timestamp: new Date().toISOString()
      });
    });

    child.on('close', (code) => {
      if (enableProgress) onProgress(1, '分析进程完成');

      onData({
        type: 'analysis_complete',
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString()
      });

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
      onData({
        type: 'analysis_spawn_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      resolve({
        success: false,
        error: `Failed to spawn analysis process: ${error.message}`
      });
    });
  });
}

/**
 * 为现有工具添加流式支持的工厂函数
 */
function enhanceToolWithStreaming(toolName, originalToolFactory, toolConfig) {
  return function(dataPath, codebasePath, config) {
    // 获取原始工具
    const originalTool = originalToolFactory(dataPath, codebasePath, config);

    // 创建流式包装器
    const streamingWrapper = createStreamingWrapper(originalTool, {
      ...toolConfig,
      dataPath,
      codebasePath,
      config
    });

    return streamingWrapper;
  };
}

module.exports = {
  createStreamingWrapper,
  enhanceToolWithStreaming
};