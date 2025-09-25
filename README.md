# Local TypeScript Code Search MCP

> A Model Context Protocol (MCP) server that provides TypeScript code analysis, searching, and parsing capabilities.

## 🚀 Features

- **Code Analysis**: Analyze TypeScript/JavaScript files for complexity metrics
- **Code Search**: Search through parsed code analysis results 
- **Code Parsing**: Generate annotated insights from complexity reports
- **Web UI**: Interactive browser interface for easy tool usage
- **Change Locator**: Smart code change recommendation system

## 📋 Requirements

- Node.js 14.0.0 or higher
- TypeScript/JavaScript files to analyze
- Compatible with Windows, macOS, and Linux

## 🛠 Installation

1. **Clone or extract** the MCP to your project directory:
   ```bash
   # The local_ts_code_search_mcp directory should be in your project root
   ```

2. **Install dependencies** (if needed):
   ```bash
   cd local_ts_code_search_mcp
   npm install
   ```

3. **Verify installation**:
   ```bash
   node server.js --help
   ```

## 🎯 Quick Start

**Important**: When using the MCP server, make sure to specify the `--codebase-path` parameter to point to your actual source code directory. By default, it uses the current working directory.

### Method 1: Using Startup Scripts

**Windows:**
```cmd
cd local_ts_code_search_mcp
start.bat
```

**Unix/Linux/macOS:**
```bash
cd local_ts_code_search_mcp
./start.sh
```

### Method 2: Direct Node.js

```bash
cd local_ts_code_search_mcp
node server.js --port 3001 --data-path ./data --codebase-path ../
```

### Method 3: Using npm Scripts

```bash
cd local_ts_code_search_mcp
npm start
# or
npm run dev
```

## 🌐 Web UI

After starting the server, open your browser and navigate to:

```
http://localhost:3667
```

The Web UI provides:
- **Search Tool**: Search for TypeScript files in parsed data
- **Analysis Tool**: Analyze code complexity 
- **Parse Tool**: Generate annotated insights
- **Results Display**: Expandable cards with detailed results
- **Export Feature**: Download results as JSON

## 🔧 Configuration

### Command Line Options

```bash
node server.js [OPTIONS]

Options:
  --data-path <path>      Data directory path (default: ./data)
  --codebase-path <path>  Codebase directory path (default: current working directory)
  --port <number>         Web UI port (default: 3001)
  --help                  Show help message
```

### Configuration File

Modify `config/default.json` for advanced settings:

```json
{
  "analysis": {
    "maxFileSize": "10MB",
    "allowedExtensions": [".ts", ".tsx", ".js", ".jsx"],
    "complexityThresholds": {
      "low": 5,
      "medium": 10, 
      "high": 20,
      "critical": 50
    }
  },
  "webUI": {
    "enabled": true,
    "defaultPort": 3001
  },
  "paths": {
    "codebaseRoot": "../",
    "commonSourceDirs": ["src", "app", "components", "lib"]
  }
}
```

## 🛠 API Reference

### MCP Tools

#### 1. search_local_ts_code

Search for TypeScript files in the parsed directory.

**Parameters:**
- `filePath` (string, required): Path to the file to search
- `query` (string, optional): Search query or function name

**Example:**
```json
{
  "filePath": "app/page.tsx",
  "query": "Button"
}
```

#### 2. analysis_local_ts_code  

Analyze TypeScript file complexity using the analyze-complexity.js tool.

**Parameters:**
- `filePath` (string, required): Path to the file to analyze

**Example:**
```json
{
  "filePath": "app/page.tsx"
}
```

#### 3. parse_local_ts_code

Parse complexity reports using the Complexity Report Annotator.

**Parameters:**
- `filePath` (string, required): Path to the file to parse

**Example:**
```json
{
  "filePath": "app/page.tsx"
}
```

### HTTP API

#### GET /api/tools

List available MCP tools.

**Response:**
```json
{
  "tools": [
    {
      "name": "search_local_ts_code",
      "description": "Search parsed directory for TS files",
      "inputSchema": {...}
    }
  ]
}
```

#### POST /api/call

Execute an MCP tool.

**Request Body:**
```json
{
  "tool": "search_local_ts_code",
  "args": {
    "filePath": "app/page.tsx"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\"success\": true, \"results\": [...]}"
    }
  ]
}
```

## 📁 Directory Structure

```
local_ts_code_search_mcp/
├── server.js              # Main MCP server
├── package.json           # Package configuration
├── README.md              # This documentation
├── start.bat              # Windows startup script
├── start.sh               # Unix/Linux startup script
├── config/
│   └── default.json       # Configuration file
├── tools/                 # MCP tool implementations
│   ├── search-local-ts-code.js
│   ├── analysis-local-ts-code.js
│   └── parse-local-ts-code.js
├── web/                   # Web UI files
│   ├── index.html
│   └── app.js
├── data/                  # Data storage (auto-created)
│   ├── reports/           # Analysis reports
│   └── parsed/            # Parsed annotations
└── test/                  # Test files
    └── integration.test.js
```

## 🔄 Workflow

1. **Analyze**: Use `analysis_local_ts_code` to generate complexity reports
2. **Parse**: Use `parse_local_ts_code` to create annotated insights  
3. **Search**: Use `search_local_ts_code` to find and query results
4. **Review**: Use Web UI to visualize and export results

## 🧪 Examples

### Example 1: Complete Analysis Workflow

```bash
# 1. Start the MCP server
node server.js

# 2. Analyze a TypeScript file
curl -X POST http://localhost:3668/api/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "analysis_local_ts_code", "args": {"filePath": "app/page.tsx"}}'

# 3. Parse the analysis results
curl -X POST http://localhost:3668/api/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "parse_local_ts_code", "args": {"filePath": "app/page.tsx"}}'

# 4. Search the parsed data
curl -X POST http://localhost:3668/api/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_local_ts_code", "args": {"filePath": "app/page.tsx", "query": "Button"}}'
```

### Example 2: Using Web UI

1. Open http://localhost:3667 in your browser
2. In the "Analysis" card, enter `app/page.tsx` 
3. Click "Analyze" and wait for completion
4. In the "Parse" card, enter the same file path
5. Click "Parse" to generate annotations
6. In the "Search" card, enter the file path and search term
7. Click "Search" to find results

## 🚨 Troubleshooting

### Common Issues

**Server won't start:**
- Check if Node.js is installed: `node --version`
- Ensure port 3001 is not in use
- Check file permissions on Unix/Linux systems

**Analysis fails:**
- Verify the source file exists
- Check file extension is supported (.ts, .tsx, .js, .jsx)
- Ensure analyze-complexity.js exists in ../tools/

**Search returns no results:**
- Run analysis first to generate reports
- Run parse to create searchable annotations
- Check if parsed files exist in data/parsed/

**Web UI connection errors:**
- Verify server is running: check console output
- Check firewall settings
- Try a different port: `node server.js --port 8879`

### Debug Mode

Enable verbose logging:

```bash
node server.js --data-path ./data --codebase-path ../ --port 3001
# Check server console for detailed logs
```

### File Locations

- **Reports**: `data/reports/` (raw complexity analysis)  
- **Parsed**: `data/parsed/` (annotated insights)
- **Logs**: Console output only
- **Config**: `config/default.json`

## 🤝 Integration

### With MCP Clients

This server implements the MCP protocol and can be used with any MCP-compatible client:

```json
{
  "mcpServers": {
    "local-ts-search": {
      "command": "node",
      "args": ["path/to/local_ts_code_search_mcp/server.js"]
    }
  }
}
```

### With CI/CD

Add to your build pipeline:

```yaml
# .github/workflows/code-analysis.yml
- name: Run TS Code Analysis
  run: |
    cd local_ts_code_search_mcp
    node server.js --data-path ./ci-data &
    sleep 5
    # Run analysis via API calls
    curl -X POST http://localhost:3668/api/call \
      -d '{"tool": "analysis_local_ts_code", "args": {"filePath": "src/index.ts"}}'
```

## 📄 License

MIT License - see project root for details.

## 🔗 Related Tools

- **analyze-complexity.js**: Core complexity analysis engine
- **json-search.js**: JSON search and query engine  
- **Change Locator**: Code change recommendation system
- **Complexity Report Annotator**: Report parsing and annotation

## 📧 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server console logs  
3. Verify file paths and permissions
4. Test with the Web UI interface first

---

**Happy coding!** 🎉