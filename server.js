#!/usr/bin/env node

/**
 * Local TypeScript Code Search MCP Server
 * 
 * MCP协议服务器，提供TypeScript代码搜索、分析和prompt模板功能
 * 
 * 启动参数:
 * --data-path: 数据保存目录 (默认: ./data)
 * --port: WebUI端口 (默认: 8879)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const yaml = require('js-yaml');

// 导入工具函数
const searchLocalTsCode = require('./tools/search-local-ts-code');
const analysisLocalTsCode = require('./tools/analysis-local-ts-code');
const saveChangeLocatorResult = require('./tools/save-change-locator-result');
const compareDirectoriesTool = require('./tools/compare-directories-mcp');
const parseLocalTsCode = require('./tools/parse-local-ts-code');
const { enhanceToolWithStreaming } = require('./tools/streaming-search-wrapper');

class MCPServer {
  constructor(options = {}) {
    this.dataPath = options.dataPath || path.join(__dirname, 'data');
    this.codebasePath = options.codebasePath || process.cwd();
    this.port = options.port || 8879;  // Web UI端口
    this.apiPort = options.apiPort || this.port + 1;  // API端口，默认为Web UI端口+1
    this.enableWebUI = options.enableWebUI !== false;  // 默认启用Web UI
    this.config = this.loadConfig();
    
    // 确保数据目录存在
    this.ensureDirectories();
    
    // 注册工具和prompts
    this.tools = new Map();
    this.prompts = new Map();
    this.registerTools();
    this.registerPrompts();
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    const configPath = path.join(__dirname, 'config', 'default.json');
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}: ${error.message}`);
    }
    
    return {
      maxFileSize: '10MB',
      allowedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      outputFormat: 'json',
      verbose: false
    };
  }

  /**
   * 确保必要目录存在
   */
  ensureDirectories() {
    const dirs = [
      this.dataPath,
      path.join(this.dataPath, 'reports'),
      path.join(this.dataPath, 'parsed'),
      path.join(this.dataPath, 'changes')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.error(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * 注册MCP工具
   */
  registerTools() {
    // 1. 搜索本地TS代码工具
    this.tools.set('search_local_ts_code', {
      name: 'search_local_ts_code',
      description: '搜索parsed目录下的TS代码文件，如果不存在则尝试分析生成',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: '要搜索的文件路径或目录路径。如果是目录，将遍历目录下所有符合条件的文件'
          },
          query: {
            type: 'string', 
            description: '搜索查询参数，可选',
            optional: true
          },
          searchDir: {
            type: 'string',
            description: '搜索基础目录路径（可选）'
          },
          reportsDir: {
            type: 'string',
            description: 'reports目录路径（可选）'
          },
          parsedDir: {
            type: 'string',
            description: 'parsed目录路径（可选）'
          }
        },
        required: ['filePath']
      },
      handler: searchLocalTsCode(this.dataPath, this.codebasePath, this.config)
    });

    // 2. 分析本地TS代码工具
    this.tools.set('analysis_local_ts_code', {
      name: 'analysis_local_ts_code',
      description: '使用analyze-complexity.js分析TS文件复杂度',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: '要分析的文件路径或目录路径。如果是目录，将遍历目录下所有符合条件的文件'
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（可选，默认为reports）'
          }
        },
        required: ['filePath']
      },
      handler: analysisLocalTsCode(this.dataPath, this.codebasePath, this.config)
    });

    // 3. 保存Change Locator结果工具
    this.tools.set('save_change_locator_result', {
      name: 'save_change_locator_result',
      description: '保存使用Change Locator prompt处理后的AI结果到changes目录',
      inputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            description: 'Change Locator AI处理结果'
          },
          filename: {
            type: 'string',
            description: '保存的文件名（可选）'
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（可选，默认为changes）'
          }
        },
        required: ['result']
      },
      handler: saveChangeLocatorResult(this.dataPath, this.codebasePath, this.config)
    });

    // 4. 比较目录工具
    this.tools.set('compare_directories', {
      name: 'compare_directories',
      description: '比较reports和parsed目录，找出尚未解析的报告文件',
      inputSchema: {
        type: 'object',
        properties: {
          reportsDir: {
            type: 'string',
            description: 'reports目录路径（可选，默认使用dataPath/reports）'
          },
          parsedDir: {
            type: 'string',
            description: 'parsed目录路径（可选，默认使用dataPath/parsed）'
          },
          saveResult: {
            type: 'boolean',
            description: '是否保存结果到changes目录（默认true）'
          }
        },
        required: []
      },
      handler: compareDirectoriesTool(this.dataPath, this.codebasePath, this.config)
    });

    // 5. 解析本地TS代码工具
    this.tools.set('parse_local_ts_code', {
      name: 'parse_local_ts_code',
      description: '解析reports目录下的复杂度报告，生成注释并保存到parsed目录',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: '要解析的文件路径或目录路径。如果是目录，将遍历目录下所有报告文件进行解析'
          },
          reportsDir: {
            type: 'string',
            description: 'reports目录路径（可选，默认为dataPath/reports）'
          },
          parsedDir: {
            type: 'string',
            description: 'parsed目录路径（可选，默认为dataPath/parsed）'
          }
        },
        required: ['filePath']
      },
      handler: parseLocalTsCode(this.dataPath, this.codebasePath, this.config)
    });

    console.error(`Registered ${this.tools.size} tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * 注册MCP Prompts
   */
  registerPrompts() {
    // Change Locator prompt
    const changeLocatorSchema = {
      type: 'object',
      required: ['requirement'],
      properties: {
        requirement: {
          type: 'object',
          required: ['goal'],
          properties: {
            goal: { 
              type: 'string', 
              description: '功能需求或行为修改目标描述' 
            },
            acceptance: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: '验收标准列表' 
            },
            keywords: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: '领域关键词列表' 
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            limit: { 
              type: 'number', 
              description: '返回结果数量限制',
              default: 10 
            },
            cwd: { 
              type: 'string', 
              description: '工作目录路径' 
            },
            prefer_parsed: { 
              type: 'boolean', 
              description: '优先使用parsed目录的数据',
              default: true 
            }
          }
        }
      },
      additionalProperties: false
    };

    this.prompts.set('change_locator', {
      name: 'change_locator',
      title: 'Change Locator',
      description: '变更定位器 - 根据功能需求快速定位应修改的代码位置并生成执行计划',
      arguments: [
        {
          name: 'requirement',
          description: '功能需求对象，包含目标、验收标准和关键词',
          required: true
        },
        {
          name: 'options',
          description: '可选配置项，包含限制数量、工作目录等',
          required: false
        }
      ],
      schema: changeLocatorSchema  // 保留完整schema用于prompts/get
    });

    console.error(`Registered ${this.prompts.size} prompts: ${Array.from(this.prompts.keys()).join(', ')}`);
  }

  /**
   * 处理MCP请求
   */
  async handleMCPRequest(request) {
    try {
      const { method, params } = request;

      switch (method) {
        case 'initialize':
          return {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              prompts: {}
            },
            serverInfo: {
              name: 'local-ts-code-search-mcp',
              version: '1.0.0'
            }
          };

        case 'tools/list':
          return {
            tools: Array.from(this.tools.values()).map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }))
          };

        case 'tools/call':
          return await this.callTool(params.name, params.arguments || {});

        case 'prompts/list':
          return {
            prompts: Array.from(this.prompts.values()).map(prompt => ({
              name: prompt.name,
              title: prompt.title,
              description: prompt.description,
              arguments: prompt.arguments
            }))
          };

        case 'prompts/get':
          return await this.getPrompt(params.name, params.arguments || {});

        case 'ping':
          return {};

        case 'notifications/initialized':
          // Handle initialization notification - no response needed
          return null;

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      console.error('MCP request error:', error);
      throw error;
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolName, args) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      const result = await tool.handler(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`Tool ${toolName} error:`, error);
      throw error;
    }
  }

  /**
   * 获取Prompt模板
   */
  async getPrompt(promptId, args) {
    if (promptId !== 'change_locator') {
      throw new Error(`Unknown prompt id: ${promptId}`);
    }

    const requirement = args?.requirement || {};
    const options = args?.options || {};
    
    const goal = String(requirement?.goal || '');
    const acceptance = Array.isArray(requirement?.acceptance) ? requirement.acceptance : [];
    const keywords = Array.isArray(requirement?.keywords) ? requirement.keywords : [];
    const limit = Number(options?.limit || 10);
    const cwd = String(options?.cwd || this.codebasePath);
    const preferParsed = Boolean(options?.prefer_parsed !== false);

    // 读取Change Locator的完整prompt内容
    const changeLocatorPrompt = await this.loadChangeLocatorPrompt();

    const messages = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: changeLocatorPrompt
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              requirement: {
                goal,
                acceptance,
                keywords
              },
              options: {
                limit,
                cwd,
                prefer_parsed: preferParsed
              }
            }, null, 2)
          }
        ]
      }
    ];

    return {
      messages,
      metadata: {
        variablesEcho: { goal, acceptance, keywords, limit, cwd, preferParsed }
      }
    };
  }

  /**
   * 加载Change Locator prompt内容
   */
  async loadChangeLocatorPrompt() {
    try {
      const yamlPath = path.join(__dirname, 'Change Locator.yaml');
      if (fs.existsSync(yamlPath)) {
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const parsed = yaml.load(yamlContent);
        return parsed.query || '';
      }
    } catch (error) {
      console.warn('Could not load Change Locator.yaml:', error.message);
    }
    
    // 如果文件不存在，返回默认内容
    return `# 角色：变更定位器 (Change Locator)

## 🎯 角色定位
给定一段功能需求/行为修改目标，快速在项目中定位**应调用/应修改**的位置：从 \`parsed/\` 注释结果与 \`reports/\` 指标出发，结合源码最小片段，给出**候选文件 + 精确符号/行号**、变更理由与置信度，并生成可供 Planner/Developer 使用的执行计划草案（不直接编写功能代码）。

## 🛠 MCP 工具
- \`filesystem.readFile / exists / glob\`：读取 \`parsed/**.json\`、\`reports/**.json\`、必要源码片段
- \`deep-graph.*\`（可选）：根据依赖/引用关系提高定位准确性
- \`exec.run\`（可选）：运行 \`ripgrep\` 或项目内检索脚本以补充证据（如可用）

## 🔎 检索策略
1. 解析需求中的**领域关键词**（组件名、路由、store key、API 名、事件名）
2. 优先扫描 \`parsed/\` 注释（因含“最小化注释”与设计标记）
3. 回退扫描 \`reports/\` 指标（imports、exports、mostComplexFunction、dependencies.path）
4. 必要时抽取少量源码片段验证（限制在相关文件的目标 symbol 附近 ±N 行）

请按照给定的JSON输入格式进行分析，并**仅输出JSON**（无额外文本）。`;
  }

  /**
   * 启动Web服务器（静态文件和API）
   */
  startWebServers() {
    if (this.enableWebUI) {
      // 启动静态文件服务器
      const StaticServer = require('./server/static');
      const staticServer = new StaticServer({ 
        port: this.port, 
        apiPort: this.apiPort 
      });
      staticServer.start();

      // 启动API服务器
      const ApiServer = require('./server/index');
      const apiServer = new ApiServer(this, { port: this.apiPort });
      return apiServer.start();
    }
    return null;
  }

  /**
   * 启动MCP服务器
   */
  start() {
    console.error('Starting Local TS Code Search MCP Server...');
    console.error(`Data path: ${this.dataPath}`);
    console.error(`Codebase path: ${this.codebasePath}`);
    console.error(`Web UI port: ${this.port}`);
    console.error(`API port: ${this.apiPort}`);

    // 启动Web服务器（如果启用）
    if (this.enableWebUI) {
      this.startWebServers();
    }

    // 处理标准输入的MCP协议消息
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // 处理完整的JSON消息
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        
        if (line) {
          try {
            const request = JSON.parse(line);
            this.handleMCPRequest(request).then(response => {
              // Only send response if it's not null (notifications don't need responses)
              if (response !== null) {
                const mcpResponse = {
                  jsonrpc: "2.0",
                  id: request.id,
                  result: response
                };
                console.log(JSON.stringify(mcpResponse));
              }
            }).catch(error => {
              const mcpError = {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32603,
                  message: error.message
                }
              };
              console.log(JSON.stringify(mcpError));
            });
          } catch (error) {
            console.error('Invalid JSON:', error);
          }
        }
      }
    });

    console.error('MCP Server started successfully');
  }
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--data-path':
        options.dataPath = args[++i];
        break;
      case '--codebase-path':
        options.codebasePath = args[++i];
        break;
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--api-port':
        options.apiPort = parseInt(args[++i]);
        break;
      case '--help':
        console.error(`
Usage: node server.js [OPTIONS]

Options:
  --data-path <path>      Data directory path (default: ./data)
  --codebase-path <path>  Codebase directory path (default: current working directory)
  --port <number>         Web UI port (default: 8879)
  --api-port <number>     API port (default: Web UI port + 1)
  --help                  Show this help message

Examples:
  node server.js --data-path ./my-data --codebase-path ../my-project --port 3667 --api-port 3668
`);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// 主程序入口
if (require.main === module) {
  try {
    const options = parseArgs();
    const server = new MCPServer(options);
    server.start();
    
    // 优雅退出
    process.on('SIGINT', () => {
      console.error('\nShutting down gracefully...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

module.exports = MCPServer;