#!/bin/bash

# Local TS Code Search MCP Server - Unix/Linux启动脚本

set -e

echo "Starting Local TS Code Search MCP Server..."
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# 显示Node.js版本
echo "Node.js version:"
node --version
echo

# 设置默认参数
DATA_PATH="./data"
PORT="3001"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --data-path)
            DATA_PATH="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --data-path <path>    Data directory path (default: ./data)"
            echo "  --port <number>       Web UI port (default: 3001)"
            echo "  --help               Show this help message"
            echo
            echo "Examples:"
            echo "  $0"
            echo "  $0 --port 8879"
            echo "  $0 --data-path ./my-data --port 8879"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# 显示启动参数
echo "Configuration:"
echo "  Data Path: $DATA_PATH"
echo "  Web UI Port: $PORT"
echo "  Web UI URL: http://localhost:$PORT"
echo

# 检查服务器文件是否存在
if [ ! -f "server.js" ]; then
    echo "Error: server.js not found in current directory"
    echo "Please make sure you are running this script from the MCP directory"
    exit 1
fi

# 创建数据目录
if [ ! -d "$DATA_PATH" ]; then
    echo "Creating data directory: $DATA_PATH"
    mkdir -p "$DATA_PATH"
fi

# 设置信号处理
cleanup() {
    echo
    echo "Server stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# 启动服务器
echo "Starting MCP Server..."
echo "Press Ctrl+C to stop the server"
echo

node server.js --data-path "$DATA_PATH" --port "$PORT"