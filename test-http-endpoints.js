#!/usr/bin/env node

/**
 * HTTP API 端点测试脚本
 * 验证新添加的 /ping 和 /prompts/list 端点
 */

const http = require('http');

class HttpApiTester {
  constructor(baseUrl = 'http://localhost:3670') {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送 HTTP GET 请求
   */
  async httpGet(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`🌐 请求: GET ${url}`);

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ 状态: ${res.statusCode}`);
            console.log(`📥 响应:`, JSON.stringify(jsonData, null, 2));
            resolve({ status: res.statusCode, data: jsonData });
          } catch (error) {
            console.log(`⚠️  非JSON响应: ${data}`);
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }).on('error', (error) => {
        console.error(`❌ 请求失败:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * 运行所有测试
   */
  async runTests() {
    console.log('🧪 开始测试 HTTP API 端点\n');

    try {
      // 测试 /ping 端点
      console.log('--- 测试 /ping 端点 ---');
      const pingResponse = await this.httpGet('/ping');

      if (pingResponse.status === 200) {
        console.log('✅ /ping 端点正常工作\n');
      } else {
        console.log(`❌ /ping 端点返回状态码: ${pingResponse.status}\n`);
      }

      // 测试 /prompts/list 端点
      console.log('--- 测试 /prompts/list 端点 ---');
      const promptsResponse = await this.httpGet('/prompts/list');

      if (promptsResponse.status === 200) {
        console.log('✅ /prompts/list 端点正常工作');

        if (promptsResponse.data && promptsResponse.data.prompts) {
          const prompts = promptsResponse.data.prompts;
          console.log(`📋 找到 ${prompts.length} 个 prompts:`);
          prompts.forEach((prompt, index) => {
            console.log(`  ${index + 1}. ${prompt.name} (${prompt.id})`);
          });
        }
        console.log('');
      } else {
        console.log(`❌ /prompts/list 端点返回状态码: ${promptsResponse.status}\n`);
      }

      console.log('🎉 所有测试完成！');

    } catch (error) {
      console.error('❌ 测试运行失败:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  // 检查命令行参数中是否提供了端口
  const port = process.argv[2] || '3670';
  const baseUrl = `http://localhost:${port}`;

  console.log(`🔧 测试目标: ${baseUrl}`);

  const tester = new HttpApiTester(baseUrl);
  tester.runTests();
}

module.exports = HttpApiTester;