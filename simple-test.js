#!/usr/bin/env node

/**
 * 简单测试脚本，直接发送 MCP 请求到标准输入
 */

// 测试 ping 方法
const pingRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "ping"
};

console.log("测试 ping 方法:");
console.log(JSON.stringify(pingRequest));

// 测试 prompts/list 方法
const promptsListRequest = {
  jsonrpc: "2.0",
  id: 2,
  method: "prompts/list"
};

setTimeout(() => {
  console.log("\n测试 prompts/list 方法:");
  console.log(JSON.stringify(promptsListRequest));
}, 100);