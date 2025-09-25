#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// 先分析一个文件，然后测试parse工具
const createAnalysisTool = require('./tools/analysis-local-ts-code.js');
const createParseTool = require('./tools/parse-local-ts-code.js');

async function testParseFixedIssue() {
  console.log('=== Testing Parse Tool Fix ===');

  const dataPath = path.join(__dirname, 'data');
  const codebasePath = __dirname;
  const config = {
    allowedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    verbose: true
  };

  // 创建工具实例
  const analysisLocalTsCode = createAnalysisTool(dataPath, codebasePath, config);
  const parseLocalTsCode = createParseTool(dataPath, codebasePath, config);

  console.log('Tools created successfully');

  // 步骤1: 分析一个单独的文件
  console.log('\n=== Step 1: Analyze single file ===');
  const targetFile = './server.js';

  try {
    const analysisResult = await analysisLocalTsCode({ filePath: targetFile });
    console.log('Analysis result:', analysisResult.success ? 'SUCCESS' : 'FAILED');

    if (analysisResult.success) {
      console.log('File path:', analysisResult.filePath);
      console.log('Report file exists:', analysisResult.reportFile?.exists);
      console.log('Report path:', analysisResult.reportFile?.path);

      // 检查报告文件内容
      if (analysisResult.reportFile?.exists) {
        const reportContent = fs.readFileSync(analysisResult.reportFile.path, 'utf8');
        const reportData = JSON.parse(reportContent);
        console.log('Report filePath attribute:', reportData.filePath);
        console.log('Source file exists:', fs.existsSync(reportData.filePath));
      }
    } else {
      console.log('Analysis error:', analysisResult.error);
    }
  } catch (error) {
    console.error('Analysis failed:', error.message);
    return;
  }

  // 步骤2: 使用parse工具处理该文件
  console.log('\n=== Step 2: Parse the analyzed file ===');

  try {
    const parseResult = await parseLocalTsCode({ filePath: targetFile });
    console.log('Parse result:', parseResult.success ? 'SUCCESS' : 'FAILED');

    if (parseResult.success) {
      console.log('Parsed successfully!');
      console.log('Output file:', parseResult.outputPath);
      console.log('Functions count:', parseResult.result?.functions?.length || 0);
    } else {
      console.log('Parse error:', parseResult.error);
      console.log('Details:', parseResult.details);
      console.log('Actual file path:', parseResult.actualFilePath);
      console.log('Report file path:', parseResult.reportFilePath);
    }
  } catch (error) {
    console.error('Parse failed:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

testParseFixedIssue().catch(console.error);