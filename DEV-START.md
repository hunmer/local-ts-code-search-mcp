# 开发环境启动指南

本项目提供了多种方式来同时启动后端服务器和前端Vite开发服务器，支持前端热重载功能。

## 🚀 快速启动（推荐）

### 方式1：使用Node.js启动脚本
```bash
npm run dev:full
```
或者直接运行：
```bash
node dev-start.js
```

**特点：**
- ✅ 统一的日志输出，带有[前端]/[后端]标识
- ✅ 优雅的服务关闭（Ctrl+C）
- ✅ 自动检查依赖
- ✅ 详细的状态信息

### 方式2：使用concurrently（并行执行）
```bash
npm run dev:concurrent
```

**特点：**
- ✅ 简单快速
- ✅ 彩色输出区分前后端
- ⚠️ 需要手动安装concurrently

### 方式3：PowerShell脚本（Windows）
```powershell
.\start-dev.ps1
```

**特点：**
- ✅ Windows原生支持
- ✅ 后端在后台运行，前端在前台
- ✅ 自动清理后端进程

### 方式4：批处理脚本（Windows）
```cmd
start-dev.bat
```

**特点：**
- ✅ 兼容性最好
- ✅ 分别在不同窗口显示
- ⚠️ 需要手动关闭后端窗口

## 🌐 访问地址

启动成功后，可以访问：

- **后端MCP服务器**: http://localhost:3667
- **后端API服务器**: http://localhost:3668
- **前端开发服务器**: http://localhost:5173
- **Vue DevTools**: http://localhost:5173/__devtools__/

## 🔥 热重载功能

- **前端代码**：修改 `web-ui/src/` 下的任何文件都会自动热重载
- **后端代码**：修改后端代码需要重启服务

## 📋 首次运行准备

确保你已经安装了所有依赖：

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd web-ui
npm install
cd ..
```

## 🛑 停止服务

- **Ctrl+C**: 停止所有服务（推荐）
- **关闭终端窗口**: 强制停止

## 🔧 故障排除

### 端口被占用
如果遇到端口冲突：
- 后端端口3667/3668被占用：修改 `server.js` 或使用 `--port` 和 `--api-port` 参数
- 前端端口5173被占用：Vite会自动选择下一个可用端口

### 依赖问题
```bash
# 重新安装依赖
npm install
cd web-ui && npm install
```

### 权限问题（Windows）
如果PowerShell脚本无法执行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📝 开发建议

1. **前端开发**：使用任何方式启动，修改代码即可看到实时效果
2. **后端开发**：推荐使用nodemon等工具实现后端热重载
3. **API测试**：可以使用前端界面或直接访问 http://localhost:3668/api/
