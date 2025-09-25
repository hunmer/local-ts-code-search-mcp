/**
 * 独立的静态文件服务器
 * 只负责提供Web UI静态文件服务
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

class StaticServer {
  constructor(options = {}) {
    this.port = options.port || 8879;
    this.staticPath = options.staticPath || path.join(__dirname, '..', 'web');
    this.apiPort = options.apiPort || (this.port + 1);
  }

  /**
   * 启动静态文件服务器
   */
  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.error(`Web UI server available at http://localhost:${this.port}`);
      console.error(`API server expected at http://localhost:${this.apiPort}`);
    });

    return server;
  }

  /**
   * 处理HTTP请求
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      // 处理静态文件
      if (await this.handleStaticFile(req, res, pathname)) {
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

    } catch (error) {
      console.error('Static server error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
  }

  /**
   * 处理静态文件服务
   */
  async handleStaticFile(req, res, pathname) {
    // 主页
    if (pathname === '/' || pathname === '/index.html') {
      const indexPath = path.join(this.staticPath, 'index.html');
      return this.serveFile(res, indexPath, 'text/html');
    }

    // 其他静态文件
    if (pathname.startsWith('/') && pathname.length > 1) {
      const filePath = path.join(this.staticPath, pathname.slice(1));
      
      // 安全检查：确保文件在静态目录内
      if (!filePath.startsWith(this.staticPath)) {
        return false;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const contentType = this.getContentType(filePath);
        return this.serveFile(res, filePath, contentType);
      }
    }

    return false;
  }

  /**
   * 服务文件
   */
  async serveFile(res, filePath, contentType) {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const fileContent = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fileContent);
      return true;
    } catch (error) {
      console.error('Error serving file:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error serving file');
      }
      return true;
    }
  }

  /**
   * 获取文件MIME类型
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = StaticServer;