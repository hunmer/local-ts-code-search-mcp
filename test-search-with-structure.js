const path = require('path');

// 模拟 MCP 工具调用
async function testSearchWithDirectoryStructure() {
  console.log('=== 测试 search 工具处理带目录结构的数据 ===');

  // 模拟 MCP 服务器环境
  const dataPath = path.join(__dirname, 'data');
  const codebasePath = __dirname;
  const config = { verbose: true };

  // 导入 search 工具
  const createSearchTool = require('./tools/search-local-ts-code');
  const searchTool = createSearchTool(dataPath, codebasePath, config);

  try {
    // 测试搜索 tools 目录中的特定文件
    console.log('1. 测试搜索单个文件（带目录结构）');
    const result1 = await searchTool({
      filePath: 'tools/analysis-local-ts-code.js',
      query: 'function'
    });

    console.log('结果1:');
    console.log('- success:', result1.success);
    console.log('- filePath:', result1.filePath);
    console.log('- dataLocation:', result1.dataLocation);
    if (result1.searchResults) {
      console.log('- 找到搜索结果数量:', result1.searchResults.length);
    }
    if (result1.error) {
      console.log('- error:', result1.error);
    }

    console.log('\n2. 测试搜索整个 tools 目录');
    const result2 = await searchTool({
      filePath: 'tools',
      query: 'function'
    });

    console.log('结果2:');
    console.log('- success:', result2.success);
    console.log('- directory:', result2.directory);
    console.log('- processedFiles:', result2.processedFiles);
    console.log('- successCount:', result2.successCount);

    if (result2.results && result2.results.length > 0) {
      console.log('- 搜索的文件:');
      result2.results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.filePath} - success: ${r.success}`);
        if (r.searchResults) {
          console.log(`     找到结果: ${r.searchResults.length} 个`);
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

testSearchWithDirectoryStructure();