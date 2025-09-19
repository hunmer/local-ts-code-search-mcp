// API服务配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3668'

interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
}

interface MCPCallRequest {
  tool: string
  args: Record<string, any>
}

class ApiService {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // 通用GET请求
  async get<T = any>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`GET ${endpoint} 失败:`, error)
      throw error
    }
  }

  // 通用POST请求
  async post<T = any>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`POST ${endpoint} 失败:`, error)
      throw error
    }
  }

  // 调用MCP工具
  async callMcpTool(request: MCPCallRequest): Promise<ApiResponse> {
    return this.post('/api/call', request)
  }

  // 获取可用的MCP工具列表
  async getTools(): Promise<any[]> {
    const response = await this.get('/api/tools')
    return response.tools || []
  }

  // 搜索本地TS代码
  async searchLocalTsCode(filePath: string, query?: string): Promise<ApiResponse> {
    return this.callMcpTool({
      tool: 'search_local_ts_code',
      args: { filePath, query }
    })
  }

  // 分析本地TS代码
  async analyzeLocalTsCode(filePath: string): Promise<ApiResponse> {
    return this.callMcpTool({
      tool: 'analysis_local_ts_code',
      args: { filePath }
    })
  }

  // 解析本地TS代码
  async parseLocalTsCode(filePath: string): Promise<ApiResponse> {
    return this.callMcpTool({
      tool: 'parse_local_ts_code',
      args: { filePath }
    })
  }

  // 读取文件内容
  async readFile(filePath: string): Promise<string> {
    try {
      const response = await this.get(`/api/file?path=${encodeURIComponent(filePath)}`)
      return response.content || ''
    } catch (error) {
      console.error('读取文件失败:', error)
      throw error
    }
  }

  // 获取文件列表
  async getFiles(type?: 'reports' | 'parsed' | 'source', path?: string): Promise<any[]> {
    try {
      let endpoint = '/api/files'
      const params = new URLSearchParams()
      
      if (type) params.append('type', type)
      if (path) params.append('path', path)
      
      if (params.toString()) {
        endpoint += '?' + params.toString()
      }
      
      const response = await this.get(endpoint)
      return response.files || []
    } catch (error) {
      console.error('获取文件列表失败:', error)
      throw error
    }
  }

  // 获取报告数据
  async getReports(): Promise<any> {
    try {
      return await this.get('/api/reports')
    } catch (error) {
      console.error('获取报告数据失败:', error)
      throw error
    }
  }

  // 代码搜索
  async searchCode(query: string, path?: string, options?: any): Promise<any> {
    try {
      return await this.post('/api/search', {
        query,
        path,
        options
      })
    } catch (error) {
      console.error('代码搜索失败:', error)
      throw error
    }
  }

  // 代码分析
  async analyzeCode(filePath: string, type: 'parse' | 'analyze' = 'analyze'): Promise<any> {
    try {
      return await this.post('/api/analyze', {
        filePath,
        type
      })
    } catch (error) {
      console.error('代码分析失败:', error)
      throw error
    }
  }

  // 获取设置
  async getSettings(): Promise<any> {
    try {
      return await this.get('/api/settings')
    } catch (error) {
      console.error('获取设置失败:', error)
      throw error
    }
  }

  // 保存设置
  async saveSettings(settings: any): Promise<any> {
    try {
      return await this.post('/api/settings', settings)
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  }

  // 获取服务器配置
  async getServerConfig(): Promise<{
    sourcePath: string
    reportPath: string
    parsedPath: string
  }> {
    const response = await this.get('/api/config')
    return {
      sourcePath: response.sourcePath || '',
      reportPath: response.reportPath || '',
      parsedPath: response.parsedPath || ''
    }
  }

  // 健康检查
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/api/health')
  }
}

// 导出单例实例
export const apiService = new ApiService(API_BASE_URL)

// 导出类型定义
export type { ApiResponse, MCPCallRequest }