#!/usr/bin/env node

/**
 * 目录遍历功能测试脚本
 *
 * 测试 filePath 参数支持目录的功能
 */

const path = require('path');
const fs = require('fs');

// 导入工具模块
const searchLocalTsCode = require('./tools/search-local-ts-code');
const analysisLocalTsCode = require('./tools/analysis-local-ts-code');
const parseLocalTsCode = require('./tools/parse-local-ts-code');
const { checkPathType, traverseDirectory } = require('./tools/directory-traversal-utils');

// 配置
const config = {
  allowedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  maxFilesPerDirectory: 10,
  maxConcurrency: 2,
  verbose: true
};

const dataPath = path.join(__dirname, 'data');
const codebasePath = __dirname;

async function testDirectoryTraversal() {
  console.log('=== 目录遍历功能测试 ===\n');

  // 1. 测试基础目录遍历工具
  console.log('1. 测试基础目录遍历工具...');
  try {
    const toolsPath = path.join(__dirname, 'tools');
    const pathInfo = await checkPathType(toolsPath, codebasePath);
    console.log(`路径信息:`, pathInfo);

    if (pathInfo.isDirectory) {
      const files = await traverseDirectory(pathInfo.absolutePath, {
        allowedExtensions: config.allowedExtensions,
        maxFiles: 5
      });
      console.log(`找到的文件 (前5个):`, files.slice(0, 5));
    }
  } catch (error) {
    console.error('基础工具测试失败:', error);
  }

  // 2. 测试 analysis 工具的目录功能
  console.log('\n2. 测试 analysis_local_ts_code 目录分析...');
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
      console.log(`- 失败分析: ${result.summary?.failedAnalyses || 0}`);
      if (result.aggregateStats) {
        console.log(`- 平均复杂度: ${result.aggregateStats.averageComplexity}`);
        console.log(`- 平均可维护性: ${result.aggregateStats.averageMaintainability}`);
      }
    } else {
      console.log(`- 失败: ${result.error}`);
    }
  } catch (error) {
    console.error('Analysis 工具测试失败:', error);
  }

  // 3. 测试 search 工具的目录功能
  console.log('\n3. 测试 search_local_ts_code 目录搜索...');
  try {
    const searchTool = searchLocalTsCode(dataPath, codebasePath, config);
    const result = await searchTool({
      filePath: 'tools', // 测试搜索 tools 目录
      query: 'createSearchTool'
    });

    console.log('Search 结果:');
    if (result.success) {
      console.log(`- 目录: ${result.directoryPath}`);
      console.log(`- 搜索到的文件: ${result.summary?.searchedFiles || 0}`);
      console.log(`- 成功搜索: ${result.summary?.successfulSearches || 0}`);
      console.log(`- 总匹配数: ${result.summary?.totalMatches || 0}`);
    } else {
      console.log(`- 失败: ${result.error}`);
    }
  } catch (error) {
    console.error('Search 工具测试失败:', error);
  }

  // 4. 测试 parse 工具的目录功能
  console.log('\n4. 测试 parse_local_ts_code 目录解析...');
  try {
    const parseTool = parseLocalTsCode(dataPath, codebasePath, config);
    const result = await parseTool({
      filePath: 'data/reports' // 测试解析 reports 目录
    });

    console.log('Parse 结果:');
    if (result.success) {
      console.log(`- 目录: ${result.directoryPath}`);
      console.log(`- 处理的文件: ${result.summary?.processedFiles || 0}`);
      console.log(`- 成功解析: ${result.summary?.successfulParses || 0}`);
      console.log(`- 总注释数: ${result.summary?.totalAnnotations || 0}`);
    } else {
      console.log(`- 失败: ${result.error}`);
      console.log(`- 建议: ${result.suggestion || '无'}`);
    }
  } catch (error) {
    console.error('Parse 工具测试失败:', error);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testDirectoryTraversal().catch(console.error);