#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function cleanDirectoryContents(dirPath) {
  if (fs.existsSync(dirPath)) {
    const entries = fs.readdirSync(dirPath);

    entries.forEach((entry) => {
      const entryPath = path.join(dirPath, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        cleanDirectoryContents(entryPath);
        try {
          console.log(`Deleting directory: ${entryPath}`);
          fs.rmdirSync(entryPath);
        } catch (error) {
          console.warn(`Warning: Could not delete directory ${entryPath}: ${error.message}`);
        }
      } else {
        try {
          console.log(`Deleting file: ${entryPath}`);
          fs.unlinkSync(entryPath);
        } catch (error) {
          console.warn(`Warning: Could not delete file ${entryPath}: ${error.message}`);
        }
      }
    });
  }
}

console.log('Cleaning old report files...');

const reportsDir = path.join(__dirname, 'data', 'reports');
const parsedDir = path.join(__dirname, 'data', 'parsed');

if (fs.existsSync(reportsDir)) {
  console.log('Cleaning reports directory...');

  // 删除报告目录中的内容但保留目录
  cleanDirectoryContents(reportsDir);

  console.log('Reports directory cleaned.');
} else {
  console.log('Reports directory does not exist.');
}

if (fs.existsSync(parsedDir)) {
  console.log('Cleaning parsed directory...');

  // 删除解析目录中的内容但保留目录
  cleanDirectoryContents(parsedDir);

  console.log('Parsed directory cleaned.');
} else {
  console.log('Parsed directory does not exist.');
}

console.log('Cleanup completed!');