const path = require('path');
const fs = require('fs');

function debugFindReportFile() {
  console.log('=== 调试 findReportFile 函数 ===');

  const filePath = 'tools/analysis-local-ts-code.js';
  const reportsDir = 'D:\\programming\\local_ts_code_search_mcp\\data\\reports';

  console.log('输入参数:');
  console.log('filePath:', filePath);
  console.log('reportsDir:', reportsDir);
  console.log();

  const normalizedPath = path.normalize(filePath);
  console.log('normalizedPath:', normalizedPath);

  // 可能的报告文件路径
  const possiblePaths = [
    // 首先尝试去掉扩展名的版本（新的目录结构格式）
    path.join(reportsDir, path.dirname(normalizedPath), path.basename(normalizedPath, path.extname(normalizedPath)) + '.json'),
    // 保持原始路径加 .json（向后兼容）
    path.join(reportsDir, normalizedPath + '.json'),
    // 仅使用文件名（向后兼容，文件在根目录）
    path.join(reportsDir, path.basename(normalizedPath) + '.json'),
    path.join(reportsDir, path.basename(normalizedPath, path.extname(normalizedPath)) + '.json')
  ];

  console.log('\n可能的路径:');
  possiblePaths.forEach((p, i) => {
    console.log(`${i + 1}. ${p}`);
    console.log(`   存在: ${fs.existsSync(p)}`);
  });

  // 查看实际存在的文件
  console.log('\n实际的报告目录内容:');

  function listDirectory(dir, indent = '') {
    if (!fs.existsSync(dir)) {
      console.log(indent + '目录不存在');
      return;
    }

    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        console.log(indent + '📁 ' + item + '/');
        listDirectory(itemPath, indent + '  ');
      } else {
        console.log(indent + '📄 ' + item + ` (${stats.size} bytes)`);
      }
    });
  }

  listDirectory(reportsDir);

  // 检查实际应该存在的文件
  console.log('\n检查预期存在的文件:');
  const expectedFile = path.join(reportsDir, 'tools', 'analysis-local-ts-code.json');
  console.log('预期文件路径:', expectedFile);
  console.log('文件是否存在:', fs.existsSync(expectedFile));
}

debugFindReportFile();