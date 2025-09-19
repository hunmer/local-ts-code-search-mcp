@echo off
chcp 65001 >nul
title 本地TS代码搜索 - 开发环境

echo.
echo ========================================
echo    本地TS代码搜索MCP - 开发环境启动
echo ========================================
echo.
echo 后端服务器 (MCP): http://localhost:3667
echo 后端 API服务器: http://localhost:3668
echo 前端开发服务器: http://localhost:5173
echo.
echo 按 Ctrl+C 停止所有服务
echo ========================================
echo.

REM 获取当前脚本目录
cd /d "%~dp0"

REM 启动后端服务器（在新窗口中）
echo 启动后端服务器...
start "后端服务器" cmd /k "node server.js --port 3667 --api-port 3668"

REM 等待2秒确保后端服务器启动
timeout /t 2 /nobreak >nul

REM 切换到前端目录并启动Vite开发服务器
echo 启动前端开发服务器...
cd web-ui
npm run dev

REM 如果到达这里说明Vite已经停止
echo.
echo 前端开发服务器已停止
echo 请手动关闭后端服务器窗口
pause