# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 **Model Context Protocol (MCP)** 的 TypeScript/JavaScript 代码分析服务器，专门用于代码搜索、复杂度分析和智能变更建议。

## 核心命令

### 开发和运行
```bash
npm start           # 启动 MCP 服务器
npm run dev         # 开发模式启动 (端口3001)
npm test            # 运行集成测试
npm run help        # 显示帮助信息
```

### 启动脚本
```bash
# Windows
start.bat

# Unix/Linux/macOS
./start.sh
```

## 架构说明

### MCP 工具链
项目提供4个核心 MCP 工具，形成完整的代码分析管道：

1. **analysis_local_ts_code** - 生成复杂度分析报告
2. **parse_local_ts_code** - 解析并注释代码结构
3. **search_local_ts_code** - 智能代码搜索
4. **save_change_locator_result** - 保存变更定位结果

### 数据流架构
```
源代码 → analysis → reports/ → parse → parsed/ → search → Change Locator → changes/
```

### 关键目录结构
- `tools/` - MCP 工具实现（柯里化函数）
- `config/default.json` - 复杂度阈值和服务配置
- `data/reports/` - 复杂度分析报告存储
- `data/parsed/` - 带注释的代码结构数据
- `data/changes/` - AI 变更建议结果
- `web/` - Web UI 界面
- `Change Locator.yaml` - AI 角色配置和 JSON Schema

### 配置要点

**复杂度阈值** (config/default.json):
- Low: 5, Medium: 10, High: 20, Critical: 50
- 可维护性评级: excellent(85), good(65), fair(50), poor(30)

**支持的文件类型**: .ts, .tsx, .js, .jsx

### 开发指南

#### 添加新的 MCP 工具
1. 在 `tools/` 目录创建新工具文件
2. 使用柯里化模式接受配置参数
3. 在 `server.js` 中注册工具

#### 修改分析配置
- 编辑 `config/default.json` 调整复杂度阈值
- 修改 `Change Locator.yaml` 更新 AI 角色行为

#### Web UI 开发
- 前端代码位于 `web/` 目录
- 使用原生 JavaScript，通过 HTTP API 与后端通信
- 开发模式下访问 http://localhost:3667

#### 测试开发
- 集成测试使用自定义 `MCPIntegrationTest` 类
- 测试覆盖 MCP 协议、HTTP API 和文件操作
- 测试数据自动创建和清理

### 技术栈依赖

**核心依赖**:
- `typhonjs-escomplex` - 复杂度分析引擎
- `madge` - 依赖关系分析
- `js-yaml` - YAML 配置解析

**运行要求**: Node.js ≥14.0.0

### 常见任务

**分析新项目**:
```bash
# 1. 启动服务器
npm start

# 2. 通过 MCP 调用 analysis_local_ts_code 工具
# 3. 使用 parse_local_ts_code 解析结果
# 4. 通过 search_local_ts_code 查找特定代码
```

**调试 MCP 工具**:
- 检查 `data/` 目录下的中间结果文件
- 使用集成测试验证工具功能
- 通过 Web UI 可视化分析结果