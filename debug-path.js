const path = require('path');
const fs = require('fs');

// 模拟 saveResult 函数的路径计算逻辑
function testPathCalculation() {
  const filePath = 'D:\\programming\\local_ts_code_search_mcp\\tools\\analysis-local-ts-code.js';
  const baseDir = 'D:\\programming\\local_ts_code_search_mcp\\tools\\analysis-local-ts-code.js'; // 旧的错误方式
  const customBaseDir = 'D:\\programming\\local_ts_code_search_mcp\\tools'; // 新的基础目录
  const outputDir = 'D:\\programming\\local_ts_code_search_mcp\\data\\reports';

  console.log('=== 路径计算调试 ===');
  console.log('文件路径:', filePath);
  console.log('基础目录:', baseDir);
  console.log('自定义基础目录:', customBaseDir);
  console.log('输出目录:', outputDir);
  console.log();

  // 旧的方式（会导致覆盖）
  let relativePath1;
  if (fs.existsSync(baseDir) && fs.statSync(baseDir).isFile()) {
    relativePath1 = path.basename(filePath);
  } else {
    relativePath1 = path.relative(baseDir, filePath);
  }
  console.log('旧方式相对路径:', relativePath1);
  console.log('旧方式最终路径:', path.join(outputDir, relativePath1));
  console.log();

  // 新的方式（应该保持目录结构）
  let relativePath2;
  if (customBaseDir && fs.existsSync(customBaseDir)) {
    if (fs.statSync(customBaseDir).isDirectory()) {
      relativePath2 = path.relative(customBaseDir, filePath);
    } else {
      const customBaseDirParent = path.dirname(customBaseDir);
      relativePath2 = path.relative(customBaseDirParent, filePath);
    }
  } else {
    relativePath2 = path.basename(filePath);
  }
  console.log('新方式相对路径:', relativePath2);
  console.log('新方式最终路径:', path.join(outputDir, relativePath2));
}

testPathCalculation();