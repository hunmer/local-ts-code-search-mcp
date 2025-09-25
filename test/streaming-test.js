#!/usr/bin/env node

/**
 * 流式HTTP功能测试脚本
 * 测试新添加的Server-Sent Events和分块传输功能
 */

const http = require('http');
const url = require('url');

class StreamingTest {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3003'; // API端口
    this.timeout = options.timeout || 30000; // 30秒超时
  }

  /**
   * 测试Server-Sent Events连接
   */
  async testSSEConnection(endpoint, payload = null) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const events = [];
      const errors = [];

      const parsedUrl = url.parse(`${this.baseUrl}${endpoint}`);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: payload ? 'POST' : 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(payload && {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(payload))
          })
        }
      };

      const req = http.request(options, (res) => {
        console.log(`📡 连接到 ${endpoint}`);
        console.log(`   状态码: ${res.statusCode}`);
        console.log(`   响应头: ${JSON.stringify(res.headers, null, 2)}`);

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();

          // 处理SSE消息
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 保留不完整的行

          let currentEvent = {};
          for (const line of lines) {
            if (line.trim() === '') {
              // 空行表示事件结束
              if (currentEvent.data) {
                events.push({
                  ...currentEvent,
                  timestamp: new Date().toISOString(),
                  elapsed: Date.now() - startTime
                });
                console.log(`📨 事件: ${currentEvent.event || 'data'} - ${currentEvent.data?.substring(0, 100)}${currentEvent.data?.length > 100 ? '...' : ''}`);
              }
              currentEvent = {};
            } else if (line.startsWith('event:')) {
              currentEvent.event = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              currentEvent.data = line.substring(5).trim();
            }
          }
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`✅ 连接结束，总耗时: ${duration}ms，收到 ${events.length} 个事件`);
          resolve({
            success: true,
            duration,
            eventCount: events.length,
            events,
            errors
          });
        });

        res.on('error', (error) => {
          console.error(`❌ 响应错误:`, error);
          errors.push(error);
        });
      });

      req.on('error', (error) => {
        console.error(`❌ 请求错误:`, error);
        reject(error);
      });

      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error(`请求超时 (${this.timeout}ms)`));
      });

      if (payload) {
        req.write(JSON.stringify(payload));
      }

      req.end();
    });
  }

  /**
   * 测试基本的流式测试端点
   */
  async testBasicStream() {
    console.log('\n🧪 测试 1: 基本流式测试端点');
    console.log('=' .repeat(50));

    try {
      const result = await this.testSSEConnection('/api/stream/test');

      // 验证期望的事件
      const expectedEvents = ['data', 'info', 'step', 'progress', 'complete', 'final'];
      const receivedEvents = [...new Set(result.events.map(e => e.event))];

      console.log(`📊 期望事件: ${expectedEvents.join(', ')}`);
      console.log(`📊 接收事件: ${receivedEvents.join(', ')}`);

      const missingEvents = expectedEvents.filter(event => !receivedEvents.includes(event));
      if (missingEvents.length > 0) {
        console.warn(`⚠️  缺少事件: ${missingEvents.join(', ')}`);
      }

      return result;

    } catch (error) {
      console.error('❌ 基本流式测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试工具调用流式端点
   */
  async testStreamCall() {
    console.log('\n🧪 测试 2: 工具调用流式端点');
    console.log('=' .repeat(50));

    const payload = {
      tool: 'search_local_ts_code',
      args: {
        filePath: 'server.js',
        query: 'constructor'
      },
      options: {
        enableProgress: true,
        estimatedSteps: 8
      }
    };

    try {
      const result = await this.testSSEConnection('/api/stream/call', payload);

      // 检查是否有错误事件
      const errorEvents = result.events.filter(e => e.event === 'error');
      if (errorEvents.length > 0) {
        console.warn(`⚠️  发现 ${errorEvents.length} 个错误事件:`);
        errorEvents.forEach((event, index) => {
          console.warn(`   ${index + 1}. ${event.data}`);
        });
      }

      // 检查进度事件
      const progressEvents = result.events.filter(e => e.event === 'progress');
      console.log(`📈 收到 ${progressEvents.length} 个进度事件`);

      return result;

    } catch (error) {
      console.error('❌ 工具调用流式测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试流式搜索端点
   */
  async testStreamSearch() {
    console.log('\n🧪 测试 3: 流式搜索端点');
    console.log('=' .repeat(50));

    const payload = {
      query: 'function',
      path: 'server.js',
      options: {
        enableProgress: true,
        chunkSize: 1024
      }
    };

    try {
      const result = await this.testSSEConnection('/api/stream/search', payload);

      // 分析结果
      const dataEvents = result.events.filter(e => e.event === 'data' || e.event === 'result');
      console.log(`📦 收到 ${dataEvents.length} 个数据事件`);

      return result;

    } catch (error) {
      console.error('❌ 流式搜索测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始流式HTTP功能测试');
    console.log('=' .repeat(60));

    const results = [];
    const startTime = Date.now();

    try {
      // 测试1: 基本流式测试
      const test1 = await this.testBasicStream();
      results.push({ test: 'basic_stream', ...test1 });

      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 测试2: 工具调用流式测试
      const test2 = await this.testStreamCall();
      results.push({ test: 'stream_call', ...test2 });

      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 测试3: 流式搜索测试
      const test3 = await this.testStreamSearch();
      results.push({ test: 'stream_search', ...test3 });

      // 汇总结果
      const totalDuration = Date.now() - startTime;
      const totalEvents = results.reduce((sum, result) => sum + result.eventCount, 0);
      const successfulTests = results.filter(r => r.success).length;

      console.log('\n📊 测试结果汇总');
      console.log('=' .repeat(40));
      console.log(`✅ 成功测试: ${successfulTests}/${results.length}`);
      console.log(`📦 总事件数: ${totalEvents}`);
      console.log(`⏱️  总耗时: ${totalDuration}ms`);

      // 详细结果
      console.log('\n📋 详细结果:');
      results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${index + 1}. ${result.test} ${status} (${result.duration}ms, ${result.eventCount} events)`);
      });

      return {
        success: successfulTests === results.length,
        totalTests: results.length,
        successfulTests,
        totalDuration,
        totalEvents,
        results
      };

    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * 测试服务器健康状态
   */
  async testHealth() {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(`${this.baseUrl}/api/health`);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ 服务器健康检查通过');
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Health check failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });
  }
}

// 主程序
async function main() {
  const tester = new StreamingTest();

  try {
    // 先检查服务器健康状态
    console.log('🏥 检查服务器健康状态...');
    await tester.testHealth();

    // 运行所有测试
    const results = await tester.runAllTests();

    if (results.success) {
      console.log('\n🎉 所有测试通过！流式HTTP功能正常工作。');
      process.exit(0);
    } else {
      console.log('\n💥 部分测试失败，请检查日志。');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 测试过程出错:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = StreamingTest;