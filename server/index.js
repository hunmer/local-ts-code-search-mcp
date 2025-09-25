#!/usr/bin/env node

/**
 * 独立的HTTP服务器
 * 为Web UI提供API服务
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const corsMiddleware = require('./middleware/cors');
const ApiRouter = require('./routes/api');

class WebServer {
  constructor(mcpServer, options = {}) {
    this.mcpServer = mcpServer;
    this.port = options.port || mcpServer.apiPort || 8879;
    this.staticPath = options.staticPath || path.join(__dirname, '..', 'web');
    this.apiRouter = new ApiRouter(mcpServer);
  }

  /**
   * 启动HTTP服务器
   */
  start() {
    const server = http.createServer(async (req, res) => {
      // 应用CORS中间件
      corsMiddleware(req, res, () => {
        this.handleRequest(req, res);
      });
    });

    server.listen(this.port, () => {
      console.error(`API server available at http://localhost:${this.port}`);
    });

    return server;
  }

  /**
   * 处理HTTP请求 - 只处理API请求
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      // 只处理API路由
      const apiHandled = await this.apiRouter.handleRequest(req, res);
      if (apiHandled) {
        return;
      }

      // 非API请求返回404
      if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }

    } catch (error) {
      console.error('API server error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  }
}

module.exports = WebServer;