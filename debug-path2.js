const path = require('path');

// 正确的路径计算逻辑测试
function testCorrectPathCalculation() {
  const filePath = 'D:\\programming\\local_ts_code_search_mcp\\tools\\analysis-local-ts-code.js';
  const codebasePath = 'D:\\programming\\local_ts_code_search_mcp';  // 项目根目录
  const outputDir = 'D:\\programming\\local_ts_code_search_mcp\\data\\reports';

  console.log('=== 正确的路径计算 ===');
  console.log('文件路径:', filePath);
  console.log('项目根目录:', codebasePath);
  console.log('输出目录:', outputDir);
  console.log();

  // 计算相对于项目根目录的路径
  const relativePath = path.relative(codebasePath, filePath);
  console.log('相对于项目根的路径:', relativePath);

  // 最终报告路径（应该保持目录结构）
  const reportPath = path.join(outputDir, relativePath);
  console.log('最终报告路径:', reportPath);

  // 替换扩展名为 .json
  const reportFile = reportPath.replace(/\.(ts|tsx|js|jsx)$/, '.json');
  console.log('JSON报告文件:', reportFile);

  console.log('\n期望结果: tools/analysis-local-ts-code.js.json');
  console.log('实际结果:', path.relative(outputDir, reportFile));
}

testCorrectPathCalculation();