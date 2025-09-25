#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// 模拟 saveResult 函数的路径计算逻辑
function debugSaveResult(result, baseDir, outputDir, customBaseDir = null) {
  console.log('=== SaveResult Debug ===');
  console.log('result.filePath:', result.filePath);
  console.log('baseDir:', baseDir);
  console.log('outputDir:', outputDir);
  console.log('customBaseDir:', customBaseDir);

  let relativePath;

  // 如果提供了自定义基础目录（项目根目录），使用它来计算相对路径
  if (customBaseDir && fs.existsSync(customBaseDir)) {
    console.log('Using customBaseDir path calculation');
    relativePath = path.relative(customBaseDir, result.filePath);
    console.log('relativePath from customBaseDir:', relativePath);
  } else if (fs.existsSync(baseDir) && fs.statSync(baseDir).isFile()) {
    console.log('BaseDir is a file - using basename');
    relativePath = path.basename(result.filePath);
    console.log('relativePath from basename:', relativePath);
  } else {
    console.log('Using relative path from baseDir');
    relativePath = path.relative(baseDir, result.filePath);
    console.log('relativePath from baseDir:', relativePath);
  }

  const reportPath = path.join(outputDir, relativePath);
  console.log('reportPath before extension replace:', reportPath);

  const reportDir = path.dirname(reportPath);
  console.log('reportDir:', reportDir);

  // 保存详细分析结果
  const reportFile = reportPath.replace(/\.(ts|tsx|js|jsx)$/, '.json');
  console.log('final reportFile:', reportFile);

  console.log('Directory exists?', fs.existsSync(reportDir));

  return reportFile;
}

console.log('=== Testing SaveResult Path Calculation ===');

// 测试场景1: 单文件分析，baseDir 是文件
const testCase1 = {
  result: {
    filePath: 'D:\\programming\\local_ts_code_search_mcp\\server.js'
  },
  baseDir: 'D:\\programming\\local_ts_code_search_mcp\\server.js', // 这是文件路径
  outputDir: 'D:\\programming\\local_ts_code_search_mcp\\data\\reports',
  customBaseDir: 'D:\\programming\\local_ts_code_search_mcp\\server.js' // 这也是文件路径!
};

console.log('\n--- Test Case 1: Single file analysis ---');
debugSaveResult(testCase1.result, testCase1.baseDir, testCase1.outputDir, testCase1.customBaseDir);

// 测试场景2: 正确的路径设置
const testCase2 = {
  result: {
    filePath: 'D:\\programming\\local_ts_code_search_mcp\\server.js'
  },
  baseDir: 'D:\\programming\\local_ts_code_search_mcp', // 项目目录
  outputDir: 'D:\\programming\\local_ts_code_search_mcp\\data\\reports',
  customBaseDir: 'D:\\programming\\local_ts_code_search_mcp' // 项目根目录
};

console.log('\n--- Test Case 2: Correct directory analysis ---');
debugSaveResult(testCase2.result, testCase2.baseDir, testCase2.outputDir, testCase2.customBaseDir);