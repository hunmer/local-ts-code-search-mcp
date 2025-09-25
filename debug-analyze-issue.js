#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 检查当前项目的目录遍历问题

console.log('=== Debug Analysis Issue ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// 模拟 analysis_local_ts_code 工具调用时的情况
const filePath = './';
const codebasePath = 'D:\\programming\\local_ts_code_search_mcp';

console.log('\n=== Input Parameters ===');
console.log('filePath:', filePath);
console.log('codebasePath:', codebasePath);

// 规范化文件路径（来自 analysis-local-ts-code.js:39）
const normalizedPath = path.normalize(filePath);
console.log('normalizedPath:', normalizedPath);

// 模拟 checkPathType 函数的路径解析过程
function debugCheckPathType(filePath, codebasePath) {
  console.log('\n=== Path Resolution Debug ===');

  let absolutePath;
  if (path.isAbsolute(filePath)) {
    absolutePath = filePath;
    console.log('Path is absolute:', absolutePath);
  } else {
    // 首先尝试相对于代码库目录
    absolutePath = path.resolve(codebasePath, filePath);
    console.log('Resolved relative to codebasePath:', absolutePath);

    // 如果不存在，尝试相对于当前工作目录
    if (!fs.existsSync(absolutePath)) {
      const cwdPath = path.resolve(filePath);
      console.log('Trying relative to CWD:', cwdPath);
      if (fs.existsSync(cwdPath)) {
        absolutePath = cwdPath;
        console.log('Using CWD path:', absolutePath);
      }
    }
  }

  console.log('Final absolutePath:', absolutePath);

  const exists = fs.existsSync(absolutePath);
  console.log('Path exists:', exists);

  if (exists) {
    const stats = fs.statSync(absolutePath);
    console.log('Is directory:', stats.isDirectory());
    console.log('Is file:', stats.isFile());

    if (stats.isDirectory()) {
      console.log('\n=== Directory Contents ===');
      const entries = fs.readdirSync(absolutePath).slice(0, 10);
      entries.forEach(entry => {
        const entryPath = path.join(absolutePath, entry);
        const entryStats = fs.statSync(entryPath);
        console.log(`  ${entry} (${entryStats.isDirectory() ? 'dir' : 'file'})`);
      });
    }
  }

  return { exists, absolutePath, isDirectory: exists ? fs.statSync(absolutePath).isDirectory() : false };
}

const pathInfo = debugCheckPathType(normalizedPath, codebasePath);

// 模拟遍历目录获取文件的过程
if (pathInfo.isDirectory) {
  console.log('\n=== Directory Traversal ===');

  const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

  function getAllFiles(dirPath, fileList = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 检查排除模式
        if (!excludePatterns.some(pattern => file.includes(pattern))) {
          getAllFiles(filePath, fileList);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          fileList.push(filePath);
        }
      }
    });

    return fileList;
  }

  const files = getAllFiles(pathInfo.absolutePath).slice(0, 5); // 只显示前5个文件
  console.log('Found files:', files.length);
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);

    // 检查文件是否可读
    try {
      const source = fs.readFileSync(file, 'utf8');
      console.log(`     Length: ${source.length} chars, First line: ${source.split('\n')[0].slice(0, 50)}...`);
    } catch (error) {
      console.log(`     ❌ READ ERROR: ${error.message}`);
    }
  });
}

console.log('\n=== Check data/reports directory ===');
const reportsDir = path.join(codebasePath, 'data', 'reports');
if (fs.existsSync(reportsDir)) {
  console.log('Reports directory exists');

  // 查找一些现有的报告文件
  function findReportFiles(dir, fileList = []) {
    try {
      const entries = fs.readdirSync(dir);
      entries.forEach(entry => {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
          findReportFiles(entryPath, fileList);
        } else if (entry.endsWith('.json')) {
          fileList.push(entryPath);
        }
      });
    } catch (error) {
      console.log(`Cannot read directory ${dir}: ${error.message}`);
    }
    return fileList;
  }

  const reportFiles = findReportFiles(reportsDir).slice(0, 3);
  console.log('Found report files:', reportFiles.length);
  reportFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const jsonData = JSON.parse(content);
      console.log(`     Source file: ${jsonData.filePath}`);
      console.log(`     Health: ${jsonData.healthLevel}`);
      console.log(`     Complexity: ${jsonData.analysis?.complexity || 'N/A'}`);
    } catch (error) {
      console.log(`     ❌ ERROR reading report: ${error.message}`);
    }
  });
} else {
  console.log('Reports directory does not exist');
}