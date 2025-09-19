# Local TS Code Search MCP - Web UI

这是一个基于Vue.js构建的现代化Web界面，用于与Local TS Code Search MCP服务器交互。

## 功能特性

### 🔍 统计面板
- **质量卡片展示**: 5个质量等级（Critical, Poor, Fair, Good, Excellent）
- **文件列表**: 点击卡片显示对应质量等级的文件
- **详细信息**: 复杂度、行数、函数数、文件大小等统计信息
- **实时刷新**: 支持数据刷新和状态更新

### 📝 源码面板
- **文件浏览**: 左侧文件列表，支持过滤和搜索
- **内容查看**: 文件内容的语法高亮显示
- **解析数据**: AST解析结果和代码注解
- **AI问答**: 与AI助手对话了解代码细节
- **信息卡片**: 文件信息、健康度、函数列表

### 🛠️ 在线工具面板
- **代码分析工具**: 分析文件复杂度和质量
- **代码搜索工具**: 搜索解析后的代码结构
- **代码解析工具**: 生成代码注释和文档
- **批量处理工具**: 批量分析多个文件
- **执行历史**: 保存和管理工具执行记录

### ⚙️ 设置面板
- **AI设置**: 配置AI服务商、模型、API密钥
- **服务器配置**: 设置数据路径、源码路径等
- **连接测试**: 测试AI服务和服务器连接

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI组件**: Shadcn-vue + Tailwind CSS
- **图标**: Lucide Vue Next
- **构建工具**: Vite

## 快速开始

### 1. 启动服务器
```bash
# 使用默认端口3002
node server.js

# 自定义端口和路径
node server.js --port 3002 --data-path ./data --codebase-path ../my-project
```

### 2. 访问Web UI
打开浏览器访问: http://localhost:3667

### 3. 开始使用
1. **统计面板**: 查看代码质量统计
2. **源码面板**: 浏览和分析源代码
3. **工具面板**: 使用各种分析工具
4. **设置面板**: 配置系统参数

## API接口

### 基础接口
- `GET /api/health` - 健康检查
- `GET /api/config` - 获取服务器配置
- `GET /api/tools` - 获取可用工具列表

### 文件操作
- `GET /api/files?type=source&path=/path` - 获取文件列表
- `GET /api/file?path=/path/to/file` - 读取文件内容

### 数据接口
- `GET /api/reports` - 获取所有质量报告
- `POST /api/search` - 搜索代码
- `POST /api/analyze` - 分析代码

### 工具接口
- `POST /api/call` - 调用MCP工具

### 设置接口
- `GET /api/settings` - 获取设置
- `POST /api/settings` - 保存设置

## 开发说明

### 项目结构
```
web-ui/
├── src/
│   ├── components/
│   │   ├── AppSidebar.vue          # 侧边栏导航
│   │   └── panels/
│   │       ├── StatsPanel.vue      # 统计面板
│   │       ├── SourcePanel.vue     # 源码面板
│   │       ├── ToolsPanel.vue      # 工具面板
│   │       └── SettingsPanel.vue   # 设置面板
│   ├── lib/
│   │   ├── api.ts                  # API服务
│   │   └── utils.ts                # 工具函数
│   ├── stores/
│   │   └── stats.ts                # 统计数据状态
│   └── assets/
│       └── index.css               # 全局样式
├── package.json
└── vite.config.ts
```

### 构建部署
```bash
# 安装依赖
cnpm install

# 开发模式
cnpm run dev

# 构建生产版本
cnpm run build

# 复制到服务器web目录
Copy-Item -Path "web-ui\\dist\\*" -Destination "web" -Recurse -Force
```

## 注意事项

1. **API兼容性**: 确保MCP服务器版本支持所有Web UI功能
2. **CORS配置**: 服务器已配置CORS支持前端访问
3. **文件路径**: 使用相对路径，支持跨平台部署
4. **错误处理**: 所有API调用都有错误处理和用户提示

## 故障排除

### 常见问题

1. **Web UI无法访问**
   - 检查服务器是否正常启动
   - 确认端口没有被其他程序占用
   - 查看控制台错误信息

2. **API调用失败**
   - 检查网络连接
   - 确认API端点URL正确
   - 查看浏览器开发者工具Network标签

3. **文件列表为空**
   - 检查源码路径配置
   - 确认目录权限
   - 验证文件格式支持

4. **AI功能无法使用**
   - 检查AI配置设置
   - 验证API密钥有效性
   - 测试网络连接

## 更新日志

### v1.0.0
- 完整的Web UI界面
- 所有核心功能实现
- 响应式设计支持
- 完善的错误处理