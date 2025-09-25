#!/usr/bin/env node

/**
 * 测试 MCP 格式验证器
 * 验证 prompts/list 响应是否符合 MCP 规范
 */

const http = require('http');

class MCPFormatValidator {
  constructor(baseUrl = 'http://localhost:3672') {
    this.baseUrl = baseUrl;
  }

  /**
   * 验证 prompts 数组格式
   */
  validatePromptsFormat(prompts) {
    const errors = [];

    if (!Array.isArray(prompts)) {
      errors.push('prompts should be an array');
      return errors;
    }

    prompts.forEach((prompt, index) => {
      const path = [`prompts`, index];

      // 验证必需字段
      if (typeof prompt.name !== 'string') {
        errors.push({
          code: 'invalid_type',
          expected: 'string',
          received: typeof prompt.name,
          path: [...path, 'name'],
          message: 'Expected string, received ' + typeof prompt.name
        });
      }

      // 验证 arguments 字段
      if (prompt.arguments !== undefined) {
        if (!Array.isArray(prompt.arguments)) {
          errors.push({
            code: 'invalid_type',
            expected: 'array',
            received: typeof prompt.arguments,
            path: [...path, 'arguments'],
            message: 'Expected array, received ' + typeof prompt.arguments
          });
        } else {
          // 验证每个参数对象
          prompt.arguments.forEach((arg, argIndex) => {
            const argPath = [...path, 'arguments', argIndex];

            if (typeof arg.name !== 'string') {
              errors.push({
                code: 'invalid_type',
                expected: 'string',
                received: typeof arg.name,
                path: [...argPath, 'name'],
                message: 'Expected string, received ' + typeof arg.name
              });
            }

            if (arg.description !== undefined && typeof arg.description !== 'string') {
              errors.push({
                code: 'invalid_type',
                expected: 'string',
                received: typeof arg.description,
                path: [...argPath, 'description'],
                message: 'Expected string, received ' + typeof arg.description
              });
            }

            if (arg.required !== undefined && typeof arg.required !== 'boolean') {
              errors.push({
                code: 'invalid_type',
                expected: 'boolean',
                received: typeof arg.required,
                path: [...argPath, 'required'],
                message: 'Expected boolean, received ' + typeof arg.required
              });
            }
          });
        }
      }
    });

    return errors;
  }

  /**
   * 获取 prompts/list 并验证格式
   */
  async validatePromptsListEndpoint() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/prompts/list`;
      console.log(`🔍 验证端点: ${url}`);

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`📥 收到响应 (状态: ${res.statusCode}):`);
            console.log(JSON.stringify(jsonData, null, 2));

            if (res.statusCode === 200) {
              const errors = this.validatePromptsFormat(jsonData.prompts);

              if (errors.length === 0) {
                console.log('✅ 格式验证通过！符合 MCP 规范');
                resolve({ valid: true, data: jsonData });
              } else {
                console.log('❌ 格式验证失败:');
                errors.forEach(error => {
                  console.log(`  - ${error.message || error}`);
                  if (error.path) {
                    console.log(`    路径: ${error.path.join('.')}`);
                  }
                });
                resolve({ valid: false, errors, data: jsonData });
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`JSON 解析失败: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 运行所有验证
   */
  async runValidation() {
    console.log('🧪 开始 MCP 格式验证\n');

    try {
      const result = await this.validatePromptsListEndpoint();

      console.log('\n📊 验证结果:');
      if (result.valid) {
        console.log('🎉 所有格式检查均通过！现在应该兼容 MCP Inspector');
      } else {
        console.log('⚠️  发现格式问题，需要进一步修复');
      }

      return result;

    } catch (error) {
      console.error('❌ 验证过程出错:', error.message);
      return { valid: false, error: error.message };
    }
  }
}

// 运行验证
if (require.main === module) {
  const port = process.argv[2] || '3672';
  const baseUrl = `http://localhost:${port}`;

  console.log(`🎯 验证目标: ${baseUrl}`);

  const validator = new MCPFormatValidator(baseUrl);
  validator.runValidation().then(result => {
    process.exit(result.valid ? 0 : 1);
  });
}

module.exports = MCPFormatValidator;