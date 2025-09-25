const path = require('path');
const fs = require('fs');

// 模拟 MCP 工具调用
async function testParseWithDirectoryStructure() {
  console.log('=== 测试 parse 工具处理带目录结构的报告 ===');

  // 模拟 MCP 服务器环境
  const dataPath = path.join(__dirname, 'data');
  const codebasePath = __dirname;
  const config = { verbose: true };

  // 导入 parse 工具
  const createParseTool = require('./tools/parse-local-ts-code');
  const parseTool = createParseTool(dataPath, codebasePath, config);

  try {
    // 测试解析 tools 目录中的特定文件
    console.log('1. 测试解析单个文件（带目录结构）');
    const result1 = await parseTool({
      filePath: 'tools/analysis-local-ts-code.js'
    });

    console.log('结果1:');
    console.log('- success:', result1.success);
    console.log('- filePath:', result1.filePath);
    if (result1.parsedFile) {
      console.log('- parsedFile:', result1.parsedFile);
      console.log('- 文件是否存在:', fs.existsSync(result1.parsedFile));
    }
    if (result1.error) {
      console.log('- error:', result1.error);
    }

    console.log('\n2. 测试解析整个 tools 目录');
    const result2 = await parseTool({
      filePath: 'tools'
    });

    console.log('结果2:');
    console.log('- success:', result2.success);
    console.log('- directory:', result2.directory);
    console.log('- processedFiles:', result2.processedFiles);
    console.log('- successCount:', result2.successCount);

    if (result2.results && result2.results.length > 0) {
      console.log('- 处理的文件:');
      result2.results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.filePath} - success: ${r.success}`);
        if (r.parsedFile) {
          console.log(`     parsed file: ${r.parsedFile}`);
        }
      });
    }

    if (result2.error) {
      console.log('- error:', result2.error);
    }

  } catch (error) {
    console.error('测试出错:', error);
  }
}

testParseWithDirectoryStructure();