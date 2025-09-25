const fs = require('fs');
const path = require('path');

function checkDirectoryStructure() {
  console.log('=== 检查最终目录结构 ===\n');

  const reportsDir = path.join(__dirname, 'data', 'reports');
  const parsedDir = path.join(__dirname, 'data', 'parsed');

  console.log('1. Reports 目录结构:');
  listDirectory(reportsDir, '  ');

  console.log('\n2. Parsed 目录结构:');
  listDirectory(parsedDir, '  ');

  console.log('\n3. 验证文件对应关系:');

  // 检查关键文件
  const testFiles = [
    'tools/analysis-local-ts-code.js',
    'tools/analyze-complexity.js',
    'tools/compare-directories-mcp.js'
  ];

  testFiles.forEach(file => {
    const reportFile = path.join(reportsDir, file.replace(/\.(ts|tsx|js|jsx)$/, '.json'));
    const parsedFile = path.join(parsedDir, file + '.json');

    console.log(`\n文件: ${file}`);
    console.log(`  Report: ${fs.existsSync(reportFile) ? '✅' : '❌'} ${path.relative(__dirname, reportFile)}`);
    console.log(`  Parsed: ${fs.existsSync(parsedFile) ? '✅' : '❌'} ${path.relative(__dirname, parsedFile)}`);
  });
}

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
      const size = (stats.size / 1024).toFixed(1);
      console.log(indent + '📄 ' + item + ` (${size} KB)`);
    }
  });
}

checkDirectoryStructure();