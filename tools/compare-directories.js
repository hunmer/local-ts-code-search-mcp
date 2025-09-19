const fs = require('fs');
const path = require('path');

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let reportsDir = null;
  let parsedDir = null;
  
  // 简单参数解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--reports' || args[i] === '-r') {
      reportsDir = args[i + 1];
      i++; // 跳过下一个参数
    } else if (args[i] === '--parsed' || args[i] === '-p') {
      parsedDir = args[i + 1];
      i++; // 跳过下一个参数
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node compare-directories.js [options]');
      console.log('Options:');
      console.log('  --reports, -r <dir>  Reports directory path (default: ./reports)');
      console.log('  --parsed, -p <dir>   Parsed directory path (default: ./parsed)');
      console.log('  --help, -h           Show this help message');
      process.exit(0);
    }
  }
  
  return { reportsDir, parsedDir };
}

/**
 * 递归获取目录下所有.json文件的相对路径
 * @param {string} dir - 目录路径
 * @param {string} baseDir - 基础目录路径，用于计算相对路径
 * @returns {Set<string>} 文件相对路径集合
 */
function getJsonFiles(dir, baseDir = dir) {
  const files = new Set();
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      const subFiles = getJsonFiles(fullPath, baseDir);
      subFiles.forEach(file => files.add(file));
    } else if (item.isFile() && path.extname(item.name) === '.json') {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.add(relativePath);
    }
  }
  
  return files;
}

/**
 * 对比reports和parsed目录
 * @param {string} reportsDir - reports目录路径
 * @param {string} parsedDir - parsed目录路径
 * @returns {Object} 对比结果
 */
function compareDirectories(reportsDir, parsedDir) {
  const reportsFiles = getJsonFiles(reportsDir);
  const parsedFiles = getJsonFiles(parsedDir);
  
  // 找出在reports中存在但在parsed中不存在的文件
  const missingInParsed = Array.from(reportsFiles).filter(file => !parsedFiles.has(file));
  
  return {
    reportsCount: reportsFiles.size,
    parsedCount: parsedFiles.size,
    missingInParsed: missingInParsed.sort(),
    missingCount: missingInParsed.length
  };
}

/**
 * 主函数
 */
function main() {
  const { reportsDir: customReportsDir, parsedDir: customParsedDir } = parseArgs();
  
  const projectRoot = path.dirname(__dirname);
  
  // 使用命令行参数或默认值
  const reportsDir = customReportsDir ? path.resolve(customReportsDir) : path.join(projectRoot, 'reports');
  const parsedDir = customParsedDir ? path.resolve(customParsedDir) : path.join(projectRoot, 'parsed');
  
  console.log(`Comparing directories:`);
  console.log(`Reports directory: ${reportsDir}`);
  console.log(`Parsed directory: ${parsedDir}`);
  
  // 检查目录是否存在
  if (!fs.existsSync(reportsDir)) {
    console.error(`Error: Reports directory does not exist: ${reportsDir}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(parsedDir)) {
    console.warn(`Warning: Parsed directory does not exist: ${parsedDir}`);
  }
  
  const result = compareDirectories(reportsDir, parsedDir);
  
  // 输出JSON结果
  const output = {
    timestamp: new Date().toISOString(),
    comparison: {
      reportsDirectory: reportsDir,
      parsedDirectory: parsedDir,
      statistics: {
        totalReportsFiles: result.reportsCount,
        totalParsedFiles: result.parsedCount,
        missingInParsedCount: result.missingCount
      },
      missingInParsed: result.missingInParsed
    }
  };
  
  console.log(JSON.stringify(output, null, 2));
  
  // 保存到changes目录
  const changesDir = path.join(projectRoot, 'changes');
  if (!fs.existsSync(changesDir)) {
    fs.mkdirSync(changesDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
  const outputFile = path.join(changesDir, `directory-comparison-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`\nComparison result saved to: ${outputFile}`);
}

// 导出函数供其他模块使用
module.exports = {
  parseArgs,
  getJsonFiles,
  compareDirectories,
  main
};

// 如果直接运行此脚本，执行main函数
if (require.main === module) {
  main();
}