const path = require('path');
const fs = require('fs');

// 模拟 saveResult 函数的路径计算逻辑
function debugSaveResult() {
  const result = {
    filePath: 'D:\\programming\\local_ts_code_search_mcp\\tools\\analysis-local-ts-code.js'
  };

  const targetDir = 'D:\\programming\\local_ts_code_search_mcp\\tools';  // 被分析的目录
  const outputDir = 'D:\\programming\\local_ts_code_search_mcp\\data\\reports';  // 输出目录
  const baseDir = 'D:\\programming\\local_ts_code_search_mcp\\tools';  // --base 参数传入的值

  console.log('=== saveResult 参数调试 ===');
  console.log('result.filePath:', result.filePath);
  console.log('baseDir (第2个参数):', targetDir);
  console.log('outputDir (第3个参数):', outputDir);
  console.log('customBaseDir (第4个参数):', baseDir);
  console.log();

  // 模拟 saveResult 函数逻辑
  let relativePath;
  const customBaseDir = baseDir;  // 第4个参数

  console.log('=== 路径计算逻辑 ===');
  console.log('customBaseDir exists?', customBaseDir && fs.existsSync(customBaseDir));

  if (customBaseDir && fs.existsSync(customBaseDir)) {
    console.log('使用 customBaseDir 计算相对路径');
    relativePath = path.relative(customBaseDir, result.filePath);
    console.log('path.relative(customBaseDir, result.filePath):', relativePath);
  } else if (fs.existsSync(targetDir) && fs.statSync(targetDir).isFile()) {
    console.log('baseDir 是文件，使用 basename');
    relativePath = path.basename(result.filePath);
    console.log('path.basename(result.filePath):', relativePath);
  } else {
    console.log('baseDir 是目录，计算相对路径');
    relativePath = path.relative(targetDir, result.filePath);
    console.log('path.relative(targetDir, result.filePath):', relativePath);
  }

  const reportPath = path.join(outputDir, relativePath);
  const reportFile = reportPath.replace(/\.(ts|tsx|js|jsx)$/, '.json');

  console.log();
  console.log('=== 最终结果 ===');
  console.log('relativePath:', relativePath);
  console.log('reportPath:', reportPath);
  console.log('reportFile:', reportFile);

  console.log();
  console.log('期望结果: tools/analysis-local-ts-code.json');
  console.log('实际结果:', path.relative(outputDir, reportFile));
}

// 现在测试正确的项目根目录作为 customBaseDir
function debugCorrectSaveResult() {
  console.log('\n=== 正确的 customBaseDir 设置 ===');

  const result = {
    filePath: 'D:\\programming\\local_ts_code_search_mcp\\tools\\analysis-local-ts-code.js'
  };

  const targetDir = 'D:\\programming\\local_ts_code_search_mcp\\tools';  // 被分析的目录
  const outputDir = 'D:\\programming\\local_ts_code_search_mcp\\data\\reports';  // 输出目录
  const projectRoot = 'D:\\programming\\local_ts_code_search_mcp';  // 项目根目录（正确的 customBaseDir）

  console.log('result.filePath:', result.filePath);
  console.log('baseDir (第2个参数):', targetDir);
  console.log('outputDir (第3个参数):', outputDir);
  console.log('customBaseDir (第4个参数) - 项目根:', projectRoot);

  let relativePath;

  if (projectRoot && fs.existsSync(projectRoot)) {
    console.log('使用项目根目录计算相对路径');
    relativePath = path.relative(projectRoot, result.filePath);
    console.log('path.relative(projectRoot, result.filePath):', relativePath);
  }

  const reportPath = path.join(outputDir, relativePath);
  const reportFile = reportPath.replace(/\.(ts|tsx|js|jsx)$/, '.json');

  console.log();
  console.log('=== 修正后的结果 ===');
  console.log('relativePath:', relativePath);
  console.log('reportPath:', reportPath);
  console.log('reportFile:', reportFile);
  console.log('相对于输出目录:', path.relative(outputDir, reportFile));
}

debugSaveResult();
debugCorrectSaveResult();