#!/usr/bin/env node

/**
 * 目录结构保持功能测试脚本
 *
 * 测试修复后的文件覆盖问题，确保报告文件保持原有目录结构
 */

const path = require('path');
const fs = require('fs');

// 导入工具模块
const analysisLocalTsCode = require('./tools/analysis-local-ts-code');

// 配置
const config = {
  allowedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  maxFilesPerDirectory: 5,
  maxConcurrency: 2,
  verbose: true
};

const dataPath = path.join(__dirname, 'data');
const codebasePath = __dirname;

async function testDirectoryStructurePreservation() {
  console.log('=== 目录结构保持功能测试 ===\n');

  // 清理之前的 reports 和 parsed 数据
  console.log('1. 清理之前的测试数据...');
  const reportsDir = path.join(dataPath, 'reports');
  const parsedDir = path.join(dataPath, 'parsed');

  if (fs.existsSync(reportsDir)) {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
  if (fs.existsSync(parsedDir)) {
    fs.rmSync(parsedDir, { recursive: true, force: true });
  }

  console.log('数据清理完成\n');

  // 2. 测试 tools 目录分析，检查是否保持目录结构
  console.log('2. 测试 tools 目录分析（保持目录结构）...');
  try {
    const analysisTool = analysisLocalTsCode(dataPath, codebasePath, config);
    const result = await analysisTool({
      filePath: 'tools' // 测试分析 tools 目录
    });

    console.log('Analysis 结果:');
    if (result.success) {
      console.log(`- 目录: ${result.directoryPath}`);
      console.log(`- 总文件数: ${result.summary?.totalFiles || 0}`);
      console.log(`- 成功分析: ${result.summary?.successfulAnalyses || 0}`);
      console.log(`- 生成报告: ${result.summary?.reportsGenerated || 0}`);

      // 检查生成的报告文件是否保持了目录结构
      console.log('\n检查报告文件目录结构:');
      const reportsPath = path.join(dataPath, 'reports');
      if (fs.existsSync(reportsPath)) {
        checkDirectoryStructure(reportsPath, '', '  ');
      } else {
        console.log('  ❌ 报告目录不存在');
      }
    } else {
      console.log(`- ❌ 失败: ${result.error}`);
    }
  } catch (error) {
    console.error('Analysis 工具测试失败:', error);
  }

  console.log('\n=== 测试完成 ===');

  // 检查特定文件是否存在正确的路径
  console.log('\n3. 验证特定文件的报告路径:');
  const expectedFiles = [
    'tools/analysis-local-ts-code.js.json',
    'tools/search-local-ts-code.js.json',
    'tools/parse-local-ts-code.js.json'
  ];

  expectedFiles.forEach(expectedFile => {
    const fullPath = path.join(dataPath, 'reports', expectedFile);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${expectedFile} - 路径正确`);

      // 检查文件内容是否正确
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const originalFilePath = content.filePath;
        console.log(`   原始文件路径: ${originalFilePath}`);
      } catch (parseError) {
        console.log(`   ⚠️ 无法解析JSON内容: ${parseError.message}`);
      }
    } else {
      console.log(`❌ ${expectedFile} - 文件不存在`);
    }
  });
}

/**
 * 递归检查目录结构
 */
function checkDirectoryStructure(dirPath, relativePath, indent) {
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        console.log(`${indent}📁 ${item}/`);
        checkDirectoryStructure(fullPath, itemRelativePath, indent + '  ');
      } else {
        console.log(`${indent}📄 ${item} (${stats.size} bytes)`);
      }
    });
  } catch (error) {
    console.log(`${indent}❌ 无法读取目录: ${error.message}`);
  }
}

// 运行测试
testDirectoryStructurePreservation().catch(console.error);