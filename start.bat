@echo off
REM Local TS Code Search MCP Server - Windows启动脚本

echo Starting Local TS Code Search MCP Server...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM 显示Node.js版本
echo Node.js version:
node --version
echo.

REM 设置默认参数
set DATA_PATH=./data
set PORT=3001

REM 解析命令行参数
:parse_args
if "%1"=="" goto run_server
if "%1"=="--data-path" (
    set DATA_PATH=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--port" (
    set PORT=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--help" (
    goto show_help
)
shift
goto parse_args

:show_help
echo Usage: start.bat [OPTIONS]
echo.
echo Options:
echo   --data-path ^<path^>    Data directory path (default: ./data)
echo   --port ^<number^>       Web UI port (default: 3001)
echo   --help                 Show this help message
echo.
echo Examples:
echo   start.bat
echo   start.bat --port 8879
echo   start.bat --data-path ./my-data --port 8879
pause
exit /b 0

:run_server
REM 显示启动参数
echo Configuration:
echo   Data Path: %DATA_PATH%
echo   Web UI Port: %PORT%
echo   Web UI URL: http://localhost:%PORT%
echo.

REM 检查服务器文件是否存在
if not exist "server.js" (
    echo Error: server.js not found in current directory
    echo Please make sure you are running this script from the MCP directory
    pause
    exit /b 1
)

REM 创建数据目录
if not exist "%DATA_PATH%" (
    echo Creating data directory: %DATA_PATH%
    mkdir "%DATA_PATH%"
)

REM 启动服务器
echo Starting MCP Server...
echo Press Ctrl+C to stop the server
echo.

node server.js --data-path "%DATA_PATH%" --port %PORT%

REM 服务器停止时的处理
echo.
echo Server stopped.
pause