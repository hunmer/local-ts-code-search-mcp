#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动本地TS代码搜索MCP开发环境...\n');

// 检查依赖
const webUiPath = path.join(__dirname, 'web-ui');
if (!fs.existsSync(webUiPath)) {
    console.error('❌ 找不到 web-ui 目录');
    process.exit(1);
}

if (!fs.existsSync(path.join(webUiPath, 'node_modules'))) {
    console.error('❌ web-ui 目录下缺少 node_modules，请先运行：cd web-ui && npm install');
    process.exit(1);
}

console.log('📡 后端服务器 (MCP): http://localhost:3667');
console.log('🔌 后端 API服务器: http://localhost:3668');
console.log('🌐 前端开发服务器: http://localhost:5173');
console.log('🔥 前端支持热重载\n');

// 存储子进程
const processes = [];

// 优雅关闭函数
function gracefulShutdown(signal) {
    console.log(`\n🛑 收到 ${signal} 信号，正在关闭所有服务...`);
    
    processes.forEach((proc, index) => {
        if (proc && !proc.killed) {
            console.log(`📴 关闭进程 ${index + 1}...`);
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
            } else {
                proc.kill('SIGTERM');
            }
        }
    });
    
    setTimeout(() => {
        console.log('✅ 所有服务已关闭');
        process.exit(0);
    }, 2000);
}

// 注册信号处理器
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 启动后端服务器
console.log('🔧 启动后端服务器...');
const serverProcess = spawn('node', ['server.js', '--port', '3667', '--api-port', '3668'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe']
});

processes.push(serverProcess);

serverProcess.stdout.on('data', (data) => {
    process.stdout.write(`[后端] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[后端] ${data}`);
});

serverProcess.on('error', (error) => {
    console.error('❌ 后端服务器启动失败:', error.message);
    gracefulShutdown('ERROR');
});

// 等待后端服务器启动
setTimeout(() => {
    console.log('🎨 启动前端开发服务器...\n');
    
    // 启动前端Vite服务器
    const viteProcess = spawn('npm', ['run', 'dev'], {
        cwd: webUiPath,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
    });
    
    processes.push(viteProcess);
    
    viteProcess.stdout.on('data', (data) => {
        process.stdout.write(`[前端] ${data}`);
    });
    
    viteProcess.stderr.on('data', (data) => {
        process.stderr.write(`[前端] ${data}`);
    });
    
    viteProcess.on('error', (error) => {
        console.error('❌ 前端服务器启动失败:', error.message);
        gracefulShutdown('ERROR');
    });
    
    viteProcess.on('close', (code) => {
        console.log(`\n📴 前端服务器已停止 (退出码: ${code})`);
        gracefulShutdown('FRONTEND_CLOSE');
    });
    
}, 3000); // 等待3秒确保后端服务器完全启动

serverProcess.on('close', (code) => {
    console.log(`\n📴 后端服务器已停止 (退出码: ${code})`);
    gracefulShutdown('BACKEND_CLOSE');
});

console.log('\n💡 提示：');
console.log('  - 按 Ctrl+C 停止所有服务');
console.log('  - 修改前端代码时会自动热重载');
console.log('  - 后端代码修改需要重启服务\n');