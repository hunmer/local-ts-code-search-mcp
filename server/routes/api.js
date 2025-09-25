/**
 * API路由定义
 * 处理所有Web UI相关的API请求
 */

const url = require('url');
const fs = require('fs');
const path = require('path');
const StreamingMiddleware = require('../middleware/streaming');

class ApiRouter {
  constructor(mcpServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * 处理API路由
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    try {
      // API路由匹配
      if (pathname === '/api/tools' && method === 'GET') {
        return await this.getTools(req, res);
      }

      if (pathname === '/api/call' && method === 'POST') {
        return await this.callTool(req, res);
      }

      if (pathname === '/prompts/list' && method === 'GET') {
        return await this.getPrompts(req, res);
      }

      if (pathname === '/ping' && method === 'GET') {
        return await this.ping(req, res);
      }

      if (pathname === '/api/health' && method === 'GET') {
        return await this.healthCheck(req, res);
      }

      if (pathname === '/api/config' && method === 'GET') {
        return await this.getConfig(req, res);
      }

      if (pathname === '/api/files' && method === 'GET') {
        return await this.getFiles(req, res);
      }

      if (pathname === '/api/file' && method === 'GET') {
        return await this.getFile(req, res);
      }

      if (pathname === '/api/reports' && method === 'GET') {
        return await this.getReports(req, res);
      }

      if (pathname === '/api/search' && method === 'POST') {
        return await this.searchFiles(req, res);
      }

      if (pathname === '/api/analyze' && method === 'POST') {
        return await this.analyzeCode(req, res);
      }

      if (pathname === '/api/settings' && (method === 'GET' || method === 'POST')) {
        return await this.handleSettings(req, res);
      }

      // 流式API路由
      if (pathname === '/api/stream/call' && method === 'POST') {
        return await this.streamCall(req, res);
      }

      if (pathname === '/api/stream/analyze' && method === 'POST') {
        return await this.streamAnalyze(req, res);
      }

      if (pathname === '/api/stream/search' && method === 'POST') {
        return await this.streamSearch(req, res);
      }

      if (pathname === '/api/stream/test' && method === 'GET') {
        return await this.streamTest(req, res);
      }

      // 未找到匹配的路由
      return false;
    } catch (error) {
      console.error('API route error:', error);
      this.sendError(res, 500, error.message);
      return true;
    }
  }

  /**
   * 获取可用工具列表
   */
  async getTools(req, res) {
    try {
      const tools = await this.mcpServer.handleMCPRequest({ method: 'tools/list' });
      this.sendJson(res, tools);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 调用MCP工具
   */
  async callTool(req, res) {
    try {
      const body = await this.readRequestBody(req);
      const { tool, args } = JSON.parse(body);
      const result = await this.mcpServer.callTool(tool, args);
      this.sendJson(res, result);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 获取可用Prompts列表
   */
  async getPrompts(req, res) {
    try {
      const prompts = await this.mcpServer.handleMCPRequest({ method: 'prompts/list' });
      this.sendJson(res, prompts);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * Ping端点 - 连通性测试
   */
  async ping(req, res) {
    try {
      const pingResult = await this.mcpServer.handleMCPRequest({ method: 'ping' });
      this.sendJson(res, pingResult);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(req, res) {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    this.sendJson(res, status);
  }

  /**
   * 获取服务器配置
   */
  async getConfig(req, res) {
    const config = {
      sourcePath: this.mcpServer.codebasePath,
      reportPath: `${this.mcpServer.dataPath}/reports`,
      parsedPath: `${this.mcpServer.dataPath}/parsed`,
      port: this.mcpServer.port,
      maxFileSize: this.mcpServer.config.maxFileSize,
      allowedExtensions: this.mcpServer.config.allowedExtensions
    };
    this.sendJson(res, config);
  }

  /**
   * 获取文件列表
   */
  async getFiles(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const { path: searchPath, type } = parsedUrl.query;
      
      let targetPath = searchPath || this.mcpServer.codebasePath;
      
      // 如果指定了type，显示特定类型的文件
      if (type === 'reports') {
        targetPath = `${this.mcpServer.dataPath}/reports`;
      } else if (type === 'parsed') {
        targetPath = `${this.mcpServer.dataPath}/parsed`;
      }
      
      // 使用文件系统直接列出文件，因为list_files工具不存在
      let result;
      try {
        const files = fs.readdirSync(targetPath).filter(file => {
          const fullPath = path.join(targetPath, file);
          return fs.statSync(fullPath).isFile();
        });
        result = { files };
      } catch (error) {
        throw new Error(`Cannot read directory: ${error.message}`);
      }
      
      this.sendJson(res, result);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 获取单个文件内容
   */
  async getFile(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const { path: filePath } = parsedUrl.query;
      
      if (!filePath) {
        this.sendError(res, 400, 'File path is required');
        return;
      }
      
      // 使用文件系统直接读取文件，因为read_file工具不存在
      let result;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        result = { content };
      } catch (error) {
        throw new Error(`Cannot read file: ${error.message}`);
      }
      
      this.sendJson(res, result);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 获取报告数据
   */
  async getReports(req, res) {
    try {
      const reportPath = `${this.mcpServer.dataPath}/reports`;
      
      // 使用文件系统直接操作
      const reports = {};
      try {
        if (fs.existsSync(reportPath)) {
          const files = fs.readdirSync(reportPath).filter(file => file.endsWith('.json'));
          
          for (const file of files) {
            try {
              const filePath = path.join(reportPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const reportData = JSON.parse(content);
              reports[file] = reportData;
            } catch (error) {
              console.error(`Error reading report file ${file}:`, error);
            }
          }
        }
      } catch (error) {
        throw new Error(`Cannot read reports directory: ${error.message}`);
      }
      
      this.sendJson(res, reports);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 搜索文件
   */
  async searchFiles(req, res) {
    try {
      const body = await this.readRequestBody(req);
      const { query, path, options } = JSON.parse(body);
      
      // 使用search_local_ts_code工具进行搜索
      const result = await this.mcpServer.callTool('search_local_ts_code', {
        filePath: path || this.mcpServer.codebasePath,
        query: query,
        ...options
      });
      
      this.sendJson(res, result);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 代码分析
   */
  async analyzeCode(req, res) {
    try {
      const body = await this.readRequestBody(req);
      const { filePath, type } = JSON.parse(body);
      
      let result;
      if (type === 'parse') {
        result = await this.mcpServer.callTool('parse_local_ts_code', {
          filePath: filePath
        });
      } else if (type === 'analyze') {
        result = await this.mcpServer.callTool('analysis_local_ts_code', {
          filePath: filePath
        });
      } else {
        this.sendError(res, 400, 'Invalid analysis type');
        return;
      }
      
      this.sendJson(res, result);
    } catch (error) {
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 处理设置
   */
  async handleSettings(req, res) {
    const method = req.method;
    
    if (method === 'GET') {
      try {
        // 加载保存的用户设置
        const configPath = path.join(this.mcpServer.dataPath, 'user-settings.json');
        const userSettings = this.loadUserSettings(configPath);
        
        // 合并环境变量和用户设置
        const settings = {
          ai: {
            site: userSettings.ai?.site || process.env.AI_SITE || 'openai',
            apiKey: userSettings.ai?.apiKey ? '***' : (process.env.AI_API_KEY ? '***' : null),
            model: userSettings.ai?.model || process.env.AI_MODEL || 'gpt-3.5-turbo',
            temperature: userSettings.ai?.temperature !== undefined ? userSettings.ai.temperature : (parseFloat(process.env.AI_TEMPERATURE) || 0.7),
            maxTokens: userSettings.ai?.maxTokens !== undefined ? userSettings.ai.maxTokens : (parseInt(process.env.AI_MAX_TOKENS) || 2000)
          },
          server: {
            dataPath: this.mcpServer.dataPath,
            codebasePath: this.mcpServer.codebasePath,
            port: this.mcpServer.port
          },
          meta: {
            hasUserSettings: Object.keys(userSettings).length > 0,
            lastUpdated: userSettings.lastUpdated || null
          }
        };
        
        this.sendJson(res, settings);
      } catch (error) {
        this.sendError(res, 500, error.message);
      }
    } else if (method === 'POST') {
      try {
        const body = await this.readRequestBody(req);
        const newSettings = JSON.parse(body);
        
        // 实现设置保存逻辑
        const configPath = path.join(this.mcpServer.dataPath, 'user-settings.json');
        const success = await this.saveUserSettings(configPath, newSettings);
        
        if (success) {
          // 同步到环境变量（在当前进程中有效）
          if (newSettings.ai) {
            if (newSettings.ai.site) process.env.AI_SITE = newSettings.ai.site;
            if (newSettings.ai.apiKey && newSettings.ai.apiKey !== '***') {
              process.env.AI_API_KEY = newSettings.ai.apiKey;
            }
            if (newSettings.ai.model) process.env.AI_MODEL = newSettings.ai.model;
            if (newSettings.ai.temperature !== undefined) {
              process.env.AI_TEMPERATURE = newSettings.ai.temperature.toString();
            }
            if (newSettings.ai.maxTokens !== undefined) {
              process.env.AI_MAX_TOKENS = newSettings.ai.maxTokens.toString();
            }
          }
          
          this.sendJson(res, { 
            success: true, 
            message: '设置保存成功！重启服务器后生效。',
            saved: true
          });
        } else {
          this.sendError(res, 500, '保存设置失败');
        }
      } catch (error) {
        this.sendError(res, 400, error.message);
      }
    }
  }

  /**
   * 保存用户设置
   */
  async saveUserSettings(configPath, settings) {
    try {
      // 确保目录存在
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 读取现有设置（如果存在）
      let existingSettings = {};
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          existingSettings = JSON.parse(content);
        } catch (error) {
          console.warn('读取现有设置失败，将创建新设置文件');
        }
      }
      
      // 合并设置
      const mergedSettings = {
        ...existingSettings,
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      // 写入文件
      fs.writeFileSync(configPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
      
      console.log('用户设置已保存到:', configPath);
      return true;
    } catch (error) {
      console.error('保存用户设置失败:', error);
      return false;
    }
  }

  /**
   * 加载用户设置
   */
  loadUserSettings(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('加载用户设置失败:', error);
    }
    return {};
  }

  /**
   * 读取请求体
   */
  readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * 发送JSON响应
   */
  sendJson(res, data) {
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
  }

  /**
   * 发送错误响应
   */
  sendError(res, statusCode, message) {
    if (!res.headersSent) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  }

  /**
   * 流式工具调用
   */
  async streamCall(req, res) {
    StreamingMiddleware.setupSSE(res);

    try {
      const body = await this.readRequestBody(req);
      const { tool, args, options = {} } = JSON.parse(body);

      StreamingMiddleware.setupCleanup(req, res);

      const toolHandler = this.mcpServer.tools.get(tool);
      if (!toolHandler) {
        StreamingMiddleware.sendSSEData(res, { error: `Unknown tool: ${tool}` }, 'error');
        StreamingMiddleware.endStream(res);
        return true;
      }

      // 执行流式工具调用
      await StreamingMiddleware.executeStreamingTool(
        res,
        toolHandler.handler,
        args,
        {
          enableProgress: options.enableProgress !== false,
          estimatedSteps: options.estimatedSteps || 10,
          chunkSize: options.chunkSize || 1024 * 4
        }
      );

      StreamingMiddleware.endStream(res, { type: 'completed', timestamp: new Date().toISOString() });

    } catch (error) {
      console.error('Stream call error:', error);
      StreamingMiddleware.sendSSEData(res, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 'error');
      StreamingMiddleware.endStream(res);
    }

    return true;
  }

  /**
   * 流式代码分析
   */
  async streamAnalyze(req, res) {
    StreamingMiddleware.setupSSE(res);

    try {
      const body = await this.readRequestBody(req);
      const { filePath, type, options = {} } = JSON.parse(body);

      StreamingMiddleware.setupCleanup(req, res);

      let toolName;
      if (type === 'parse') {
        toolName = 'parse_local_ts_code';
      } else if (type === 'analyze') {
        toolName = 'analysis_local_ts_code';
      } else {
        StreamingMiddleware.sendSSEData(res, { error: 'Invalid analysis type' }, 'error');
        StreamingMiddleware.endStream(res);
        return true;
      }

      const toolHandler = this.mcpServer.tools.get(toolName);
      if (!toolHandler) {
        StreamingMiddleware.sendSSEData(res, { error: `Tool not found: ${toolName}` }, 'error');
        StreamingMiddleware.endStream(res);
        return true;
      }

      // 执行流式分析
      await StreamingMiddleware.executeStreamingTool(
        res,
        toolHandler.handler,
        { filePath },
        {
          enableProgress: options.enableProgress !== false,
          estimatedSteps: type === 'analyze' ? 15 : 8, // analyze 更复杂
          chunkSize: options.chunkSize || 1024 * 8
        }
      );

      StreamingMiddleware.endStream(res, { type: 'completed', timestamp: new Date().toISOString() });

    } catch (error) {
      console.error('Stream analyze error:', error);
      StreamingMiddleware.sendSSEData(res, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 'error');
      StreamingMiddleware.endStream(res);
    }

    return true;
  }

  /**
   * 流式搜索
   */
  async streamSearch(req, res) {
    StreamingMiddleware.setupSSE(res);

    try {
      const body = await this.readRequestBody(req);
      const { query, path: searchPath, options = {} } = JSON.parse(body);

      StreamingMiddleware.setupCleanup(req, res);

      const toolHandler = this.mcpServer.tools.get('search_local_ts_code');
      if (!toolHandler) {
        StreamingMiddleware.sendSSEData(res, { error: 'Search tool not found' }, 'error');
        StreamingMiddleware.endStream(res);
        return true;
      }

      // 执行流式搜索
      await StreamingMiddleware.executeStreamingTool(
        res,
        toolHandler.handler,
        {
          filePath: searchPath || this.mcpServer.codebasePath,
          query: query,
          ...options
        },
        {
          enableProgress: options.enableProgress !== false,
          estimatedSteps: 12,
          chunkSize: options.chunkSize || 1024 * 6
        }
      );

      StreamingMiddleware.endStream(res, { type: 'completed', timestamp: new Date().toISOString() });

    } catch (error) {
      console.error('Stream search error:', error);
      StreamingMiddleware.sendSSEData(res, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 'error');
      StreamingMiddleware.endStream(res);
    }

    return true;
  }

  /**
   * 流式测试端点
   */
  async streamTest(req, res) {
    StreamingMiddleware.setupSSE(res);
    StreamingMiddleware.setupCleanup(req, res);

    try {
      const progressReporter = StreamingMiddleware.createProgressReporter(res, 10);

      StreamingMiddleware.sendSSEData(res, {
        message: '开始流式测试...',
        timestamp: new Date().toISOString()
      }, 'info');

      // 模拟一些处理步骤
      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

        progressReporter.update(1, `执行步骤 ${i}/10`);

        StreamingMiddleware.sendSSEData(res, {
          step: i,
          message: `完成步骤 ${i}`,
          timestamp: new Date().toISOString(),
          data: { stepResult: `步骤 ${i} 的结果数据` }
        }, 'step');
      }

      progressReporter.complete('测试完成');

      StreamingMiddleware.sendSSEData(res, {
        message: '所有测试步骤完成',
        totalSteps: 10,
        duration: '5秒',
        timestamp: new Date().toISOString()
      }, 'final');

      StreamingMiddleware.endStream(res, {
        type: 'test_completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Stream test error:', error);
      StreamingMiddleware.sendSSEData(res, {
        error: error.message
      }, 'error');
      StreamingMiddleware.endStream(res);
    }

    return true;
  }
}

module.exports = ApiRouter;