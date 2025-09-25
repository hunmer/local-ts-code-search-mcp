#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// 模拟加载和测试 analysis_local_ts_code 工具
const createAnalysisTool = require('./tools/analysis-local-ts-code.js');

async function testAnalysisTool() {
  console.log('=== Testing Analysis Tool ===');

  const dataPath = path.join(__dirname, 'data');
  const codebasePath = __dirname;
  const config = {
    allowedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    maxFilesPerDirectory: 100,
    maxConcurrency: 3,
    verbose: true
  };

  // 创建分析工具实例
  const analysisLocalTsCode = createAnalysisTool(dataPath, codebasePath, config);

  console.log('Tool created successfully');
  console.log('dataPath:', dataPath);
  console.log('codebasePath:', codebasePath);

  // 测试1: 分析当前目录
  console.log('\n=== Test 1: Analyze current directory (./) ===');

  try {
    const result = await analysisLocalTsCode({ filePath: './' });
    console.log('Result success:', result.success);

    if (result.success) {
      console.log('Summary:');
      console.log('  - Total files:', result.summary?.totalFiles || 'N/A');
      console.log('  - Analyzed files:', result.summary?.analyzedFiles || 'N/A');
      console.log('  - Successful:', result.summary?.successfulAnalyses || 'N/A');
      console.log('  - Failed:', result.summary?.failedAnalyses || 'N/A');

      if (result.fileResults && result.fileResults.length > 0) {
        console.log('\nFirst few analyzed files:');
        result.fileResults.slice(0, 3).forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.filePath} - Success: ${file.success}`);
          if (file.success) {
            console.log(`     Complexity: ${file.complexity}, Health: ${file.healthLevel}`);
          }
        });
      }

      if (result.failures && result.failures.length > 0) {
        console.log('\nFailures:');
        result.failures.slice(0, 3).forEach((failure, index) => {
          console.log(`  ${index + 1}. ${failure.filePath}: ${failure.error}`);
        });
      }
    } else {
      console.log('Error:', result.error);
      console.log('Details:', result.details || 'No details');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  // 测试2: 分析单个文件
  console.log('\n=== Test 2: Analyze single file (server.js) ===');

  try {
    const result = await analysisLocalTsCode({ filePath: './server.js' });
    console.log('Result success:', result.success);

    if (result.success) {
      console.log('File path:', result.filePath);
      console.log('Health level:', result.analysis?.details?.healthLevel);
      console.log('Complexity:', result.analysis?.details?.complexity);
      console.log('Maintainability:', result.analysis?.details?.maintainability);
      console.log('Report generated:', result.reportFile?.exists || false);
    } else {
      console.log('Error:', result.error);
      console.log('Details:', result.details || 'No details');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n=== Testing Complete ===');
}

testAnalysisTool().catch(console.error);