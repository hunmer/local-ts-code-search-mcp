#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// 测试parse工具是否正确排除健康度索引文件
const createParseTool = require('./tools/parse-local-ts-code.js');

async function testParseExclusion() {
  console.log('=== Testing Parse Tool Exclusion ===');

  const dataPath = path.join(__dirname, 'data');
  const codebasePath = __dirname;
  const config = {
    verbose: true
  };

  // 创建工具实例
  const parseLocalTsCode = createParseTool(dataPath, codebasePath, config);

  console.log('Parse tool created successfully');

  // 检查reports目录中的文件
  const reportsDir = path.join(dataPath, 'reports');
  console.log('\n=== Checking reports directory ===');

  if (fs.existsSync(reportsDir)) {
    function getAllJsonFiles(dir, fileList = []) {
      const entries = fs.readdirSync(dir);
      entries.forEach(entry => {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
          getAllJsonFiles(entryPath, fileList);
        } else if (entry.endsWith('.json')) {
          fileList.push(entryPath);
        }
      });
      return fileList;
    }

    const allJsonFiles = getAllJsonFiles(reportsDir);
    console.log('All JSON files in reports:');
    allJsonFiles.forEach(file => {
      const relativePath = path.relative(reportsDir, file);
      const isHealthIndex = ['excellent.json', 'good.json', 'fair.json', 'poor.json', 'critical.json'].includes(path.basename(file));
      console.log(`  ${relativePath} ${isHealthIndex ? '(HEALTH INDEX)' : '(REPORT)'}`);
    });
  }

  // 测试目录遍历解析
  console.log('\n=== Testing directory parsing ===');

  try {
    const parseResult = await parseLocalTsCode({ filePath: './' });
    console.log('Parse directory result:', parseResult.success ? 'SUCCESS' : 'FAILED');

    if (parseResult.success) {
      console.log('Summary:');
      console.log('  - Total files:', parseResult.summary?.totalFiles || 'N/A');
      console.log('  - Parsed files:', parseResult.summary?.parsedFiles || 'N/A');
      console.log('  - Successful:', parseResult.summary?.successfulParses || 'N/A');
      console.log('  - Failed:', parseResult.summary?.failedParses || 'N/A');

      if (parseResult.failures && parseResult.failures.length > 0) {
        console.log('\nFailures:');
        parseResult.failures.forEach((failure, index) => {
          const filename = path.basename(failure.filePath);
          const isHealthIndex = ['excellent.json', 'good.json', 'fair.json', 'poor.json', 'critical.json'].includes(filename);
          console.log(`  ${index + 1}. ${filename}: ${failure.error} ${isHealthIndex ? '(SHOULD BE EXCLUDED!)' : ''}`);
        });
      } else {
        console.log('\nNo failures - health index files correctly excluded! ✅');
      }

      if (parseResult.fileResults && parseResult.fileResults.length > 0) {
        console.log('\nSuccessfully parsed files:');
        parseResult.fileResults.slice(0, 3).forEach((file, index) => {
          console.log(`  ${index + 1}. ${path.basename(file.filePath)} - Success: ${file.success}`);
        });
      }
    } else {
      console.log('Error:', parseResult.error);
      console.log('Details:', parseResult.details || 'No details');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

testParseExclusion().catch(console.error);