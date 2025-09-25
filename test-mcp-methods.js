#!/usr/bin/env node

/**
 * 测试 MCP 服务器的标准方法：ping 和 prompts/list
 */

const { spawn } = require('child_process');
const path = require('path');

class MCPTester {
  constructor() {
    this.requestId = 1;
  }

  /**
   * 创建 MCP 请求
   */
  createRequest(method, params = {}) {
    return {
      jsonrpc: "2.0",
      id: this.requestId++,
      method: method,
      params: params
    };
  }

  /**
   * 测试 MCP 方法
   */
  async testMethod(methodName, params = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\n🧪 测试方法: ${methodName}`);
      console.log('📤 发送请求:', JSON.stringify({ method: methodName, params }, null, 2));

      // 启动服务器进程
      const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let responseBuffer = '';
      let hasResponse = false;

      // 监听响应
      serverProcess.stdout.on('data', (data) => {
        responseBuffer += data.toString();

        // 检查是否有完整的JSON响应
        try {
          const lines = responseBuffer.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const response = JSON.parse(lines[lines.length - 1]);
            if (response.id && !hasResponse) {
              hasResponse = true;
              console.log('📥 收到响应:', JSON.stringify(response, null, 2));
              serverProcess.kill();
              resolve(response);
            }
          }
        } catch (error) {
          // 还没有完整的JSON，继续等待
        }
      });

      // 监听错误
      serverProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('started successfully')) {
          // 服务器启动成功，发送测试请求
          const request = this.createRequest(methodName, params);
          serverProcess.stdin.write(JSON.stringify(request) + '\n');
        }
      });

      serverProcess.on('error', (error) => {
        reject(new Error(`进程错误: ${error.message}`));
      });

      // 超时处理
      setTimeout(() => {
        if (!hasResponse) {
          serverProcess.kill();
          reject(new Error(`测试超时: ${methodName}`));
        }
      }, 10000);
    });
  }

  /**
   * 运行所有测试
   */
  async runTests() {
    console.log('🚀 开始测试 MCP 服务器标准方法\n');

    try {
      // 测试 ping 方法
      await this.testMethod('ping');
      console.log('✅ ping 方法测试通过');

      // 测试 prompts/list 方法
      const promptsResponse = await this.testMethod('prompts/list');
      console.log('✅ prompts/list 方法测试通过');

      // 验证 prompts/list 响应内容
      if (promptsResponse.result && promptsResponse.result.prompts) {
        const prompts = promptsResponse.result.prompts;
        console.log(`📋 发现 ${prompts.length} 个 prompts:`);
        prompts.forEach((prompt, index) => {
          console.log(`  ${index + 1}. ${prompt.name} (${prompt.id})`);
        });
      }

      console.log('\n🎉 所有测试均已通过！');

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      process.exit(1);
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new MCPTester();
  tester.runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = MCPTester;