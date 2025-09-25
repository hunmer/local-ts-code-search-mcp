/**
 * 流式响应中间件
 * 支持服务器发送事件 (Server-Sent Events) 和分块传输编码
 */

class StreamingMiddleware {
  /**
   * 设置 Server-Sent Events 响应头
   */
  static setupSSE(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 发送初始连接确认
    res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }

  /**
   * 设置分块传输编码响应头
   */
  static setupChunked(res, contentType = 'application/json') {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
  }

  /**
   * 发送 SSE 数据
   */
  static sendSSEData(res, data, eventType = 'data') {
    if (res.destroyed || res.writableEnded) {
      return false;
    }

    try {
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${jsonData}\n\n`);
      return true;
    } catch (error) {
      console.error('SSE write error:', error);
      return false;
    }
  }

  /**
   * 发送分块数据
   */
  static sendChunk(res, data) {
    if (res.destroyed || res.writableEnded) {
      return false;
    }

    try {
      const chunk = typeof data === 'string' ? data : JSON.stringify(data);
      res.write(chunk + '\n');
      return true;
    } catch (error) {
      console.error('Chunk write error:', error);
      return false;
    }
  }

  /**
   * 结束流式响应
   */
  static endStream(res, finalData = null) {
    if (res.destroyed || res.writableEnded) {
      return;
    }

    try {
      if (finalData) {
        this.sendSSEData(res, finalData, 'end');
      }
      res.end();
    } catch (error) {
      console.error('Stream end error:', error);
    }
  }

  /**
   * 处理客户端断开连接
   */
  static setupCleanup(req, res, cleanup = null) {
    const handleClose = () => {
      console.log('Client disconnected from stream');
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };

    req.on('close', handleClose);
    req.on('aborted', handleClose);
    res.on('close', handleClose);
  }

  /**
   * 创建进度报告器
   */
  static createProgressReporter(res, total = 100) {
    let current = 0;

    return {
      update: (increment = 1, message = '') => {
        current += increment;
        const progress = Math.min(Math.round((current / total) * 100), 100);

        return this.sendSSEData(res, {
          type: 'progress',
          progress,
          current,
          total,
          message,
          timestamp: new Date().toISOString()
        }, 'progress');
      },

      complete: (message = '完成') => {
        return this.sendSSEData(res, {
          type: 'complete',
          progress: 100,
          current: total,
          total,
          message,
          timestamp: new Date().toISOString()
        }, 'complete');
      }
    };
  }

  /**
   * 流式工具执行包装器
   */
  static async executeStreamingTool(res, toolHandler, args, options = {}) {
    const {
      enableProgress = true,
      estimatedSteps = 10,
      chunkSize = 1024 * 4 // 4KB chunks
    } = options;

    let progressReporter = null;
    if (enableProgress) {
      progressReporter = this.createProgressReporter(res, estimatedSteps);
    }

    try {
      // 如果工具支持流式执行
      if (typeof toolHandler.streamExecute === 'function') {
        return await toolHandler.streamExecute(args, {
          onProgress: (step, message) => {
            if (progressReporter) {
              progressReporter.update(1, message);
            }
          },
          onData: (data) => {
            this.sendSSEData(res, data, 'data');
          },
          onError: (error) => {
            this.sendSSEData(res, { error: error.message }, 'error');
          }
        });
      }

      // 普通工具的流式包装
      if (progressReporter) {
        progressReporter.update(1, '开始执行工具...');
      }

      const result = await toolHandler(args);

      if (progressReporter) {
        progressReporter.update(estimatedSteps - 1, '工具执行完成');
      }

      // 如果结果很大，分块发送
      const resultStr = JSON.stringify(result);
      if (resultStr.length > chunkSize) {
        this.sendSSEData(res, { type: 'start_data', size: resultStr.length }, 'meta');

        for (let i = 0; i < resultStr.length; i += chunkSize) {
          const chunk = resultStr.slice(i, i + chunkSize);
          this.sendSSEData(res, {
            type: 'data_chunk',
            chunk,
            offset: i,
            isLast: i + chunkSize >= resultStr.length
          }, 'chunk');
        }
      } else {
        this.sendSSEData(res, result, 'result');
      }

      if (progressReporter) {
        progressReporter.complete();
      }

      return result;

    } catch (error) {
      this.sendSSEData(res, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 'error');

      throw error;
    }
  }
}

module.exports = StreamingMiddleware;