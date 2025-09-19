# Change Locator MCP Server 使用指南

## 概述

本 MCP Server 现在提供了 **Change Locator** prompt 模板功能，让您可以使用 AI 来分析功能需求并快速定位需要修改的代码位置。

## 新架构说明

### 从脚本解析到 AI Prompt 模板

原来的 `parse-local-ts-code.js` 工具已被重构为 MCP prompt 模板系统：

- **旧方式**：直接运行脚本解析文件
- **新方式**：使用 prompt 模板让 AI 分析需求并定位变更点

### 工作流程

1. **使用 Prompt 模板**：通过 MCP `change_locator` prompt 提供功能需求
2. **AI 分析**：AI 根据 prompt 和项目数据分析需求
3. **保存结果**：使用 `save_change_locator_result` 工具将 AI 输出保存到 `changes/` 目录

## MCP 能力

### Prompts

#### `change_locator`
- **描述**：变更定位器 - 根据功能需求快速定位应修改的代码位置并生成执行计划
- **参数结构**：
```json
{
  "requirement": {
    "goal": "功能需求或行为修改目标描述",
    "acceptance": ["验收标准1", "验收标准2"],
    "keywords": ["关键词1", "关键词2"]
  },
  "options": {
    "limit": 10,
    "cwd": "工作目录路径",
    "prefer_parsed": true
  }
}
```

### Tools

#### `save_change_locator_result`
- **描述**：保存使用 Change Locator prompt 处理后的 AI 结果到 changes 目录
- **参数**：
  - `result`：Change Locator AI 处理结果（必需）
  - `filename`：保存的文件名（可选）

#### `search_local_ts_code` 和 `analysis_local_ts_code`
- 原有工具继续提供，用于搜索和分析代码

## 使用示例

### 1. 使用 Prompt 模板

在支持 MCP 的客户端（如 Claude Desktop）中：

1. 找到 "Change Locator" prompt 模板
2. 填写参数：
```json
{
  "requirement": {
    "goal": "为用户档案组件添加在线状态显示功能",
    "acceptance": [
      "显示用户在线/离线/离开状态",
      "状态有颜色区分",
      "实时更新状态"
    ],
    "keywords": ["用户档案", "在线状态", "UserProfile", "组件"]
  },
  "options": {
    "limit": 5,
    "prefer_parsed": true
  }
}
```

3. AI 会根据 prompt 分析项目并返回标准化的 JSON 结果

### 2. 保存分析结果

使用 `save_change_locator_result` 工具将 AI 的输出保存：

```json
{
  "result": {
    "matches": [...],
    "plan_draft": {...},
    "tooling": {...}
  },
  "filename": "user-profile-online-status-plan.json"
}
```

## 输出格式

所有输出都保存到 `changes/` 目录，遵循标准化 JSON 格式：

```json
{
  "matches": [
    {
      "file": "文件路径",
      "symbol": "符号名",
      "kind": "function|class|component|...",
      "range": {"startLine": 0, "endLine": 0},
      "evidence": {...},
      "confidence": 0.0,
      "impact": "low|medium|high",
      "suggested_actions": [...]
    }
  ],
  "plan_draft": {
    "summary": "计划摘要",
    "steps": [...],
    "risks": [...]
  },
  "tooling": {
    "lookups": [...],
    "errors": [...],
    "notes": "..."
  }
}
```

## 配置

### 启动服务器

```bash
# 使用默认配置
npm start

# 指定数据目录和代码库路径
node server.js --data-path ./my-data --codebase-path ../my-project

# 查看帮助
node server.js --help
```

### 目录结构

```
local_ts_code_search_mcp/
├── data/
│   ├── reports/     # 代码复杂度分析报告
│   ├── parsed/      # 解析后的代码注释
│   └── changes/     # Change Locator 结果输出
├── tools/           # MCP 工具实现
├── Change Locator.yaml  # Prompt 模板定义
└── server.js       # MCP 服务器主程序
```

## 与现有工具的整合

Change Locator 可以配合现有工具使用：

1. **analysis_local_ts_code**：先分析代码复杂度
2. **search_local_ts_code**：搜索相关代码文件
3. **change_locator prompt**：使用 AI 分析需求定位变更点
4. **save_change_locator_result**：保存分析结果

## 优势

- **智能分析**：利用 AI 理解功能需求和代码关系
- **标准化输出**：所有结果都保存为规范的 JSON 格式
- **可追溯性**：保存在 changes 目录中的结果可用于后续处理
- **模块化设计**：符合柯里化、单一职责等工程偏好
- **向后兼容**：保留原有的分析和搜索工具

## 开发约束

遵循项目规则：
- 只输出 JSON，不要前后解释文字
- 柯里化、模块化/单一职责
- 一个文件一个功能
- 开发只改任务范围内代码
- 开发阶段不写文档
- 代码与文本以 UTF-8，无 BOM
- 严格使用相对路径与显式依赖
- 输出的标准化 JSON 要保存到 changes 文件夹里