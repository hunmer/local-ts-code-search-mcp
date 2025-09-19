<template>
  <div class="h-full flex bg-background">
    <!-- 左侧：工具卡片 -->
    <div class="w-1/3 border-r border-border p-4 space-y-4">
      <!-- 代码分析工具卡片 -->
      <div class="bg-card border rounded-lg p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">代码分析工具</h3>
            <p class="text-sm text-muted-foreground">分析文件复杂度和质量</p>
          </div>
        </div>
        
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium block mb-1">文件路径</label>
            <input 
              v-model="analysisForm.filePath"
              type="text" 
              placeholder="例如：src/components/App.vue" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <div>
            <label class="text-sm font-medium block mb-1">输出选项</label>
            <select 
              v-model="analysisForm.outputType" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="report">生成报告</option>
              <option value="json">输出JSON</option>
              <option value="summary">仅摘要</option>
            </select>
          </div>
          
          <button 
            @click="runAnalysis"
            :disabled="!analysisForm.filePath.trim() || analysisLoading"
            class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {{ analysisLoading ? '分析中...' : '开始分析' }}
          </button>
        </div>
      </div>

      <!-- 代码搜索工具卡片 -->
      <div class="bg-card border rounded-lg p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">代码搜索工具</h3>
            <p class="text-sm text-muted-foreground">搜索解析后的代码</p>
          </div>
        </div>
        
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium block mb-1">文件路径</label>
            <input 
              v-model="searchForm.filePath"
              type="text" 
              placeholder="例如：src/utils/helpers.ts" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <div>
            <label class="text-sm font-medium block mb-1">搜索查询</label>
            <input 
              v-model="searchForm.query"
              type="text" 
              placeholder="函数名或JSON查询" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <button 
            @click="runSearch"
            :disabled="!searchForm.filePath.trim() || searchLoading"
            class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {{ searchLoading ? '搜索中...' : '开始搜索' }}
          </button>
        </div>
      </div>

      <!-- 代码解析工具卡片 -->
      <div class="bg-card border rounded-lg p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">代码解析工具</h3>
            <p class="text-sm text-muted-foreground">解析报告生成注释</p>
          </div>
        </div>
        
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium block mb-1">文件路径</label>
            <input 
              v-model="parseForm.filePath"
              type="text" 
              placeholder="例如：src/components/Button.tsx" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <button 
            @click="runParse"
            :disabled="!parseForm.filePath.trim() || parseLoading"
            class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {{ parseLoading ? '解析中...' : '开始解析' }}
          </button>
        </div>
      </div>

      <!-- 批量处理工具卡片 -->
      <div class="bg-card border rounded-lg p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H8V4H20V16Z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">批量处理工具</h3>
            <p class="text-sm text-muted-foreground">批量分析多个文件</p>
          </div>
        </div>
        
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium block mb-1">目录路径</label>
            <input 
              v-model="batchForm.directory"
              type="text" 
              placeholder="例如：src/components" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <div>
            <label class="text-sm font-medium block mb-1">文件模式</label>
            <input 
              v-model="batchForm.pattern"
              type="text" 
              placeholder="例如：*.ts,*.tsx" 
              class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          
          <button 
            @click="runBatch"
            :disabled="!batchForm.directory.trim() || batchLoading"
            class="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {{ batchLoading ? '处理中...' : '开始批量处理' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧：结果列表和调用记录 -->
    <div class="flex-1 flex flex-col">
      <!-- 标题栏 -->
      <div class="border-b border-border p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">工具执行结果</h2>
          <div class="flex items-center gap-2">
            <button 
              @click="clearHistory"
              class="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              清空记录
            </button>
            <button 
              @click="exportHistory"
              class="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              导出记录
            </button>
          </div>
        </div>
      </div>

      <!-- 结果内容 -->
      <div class="flex-1 overflow-hidden">
        <div v-if="executionHistory.length === 0" class="flex-1 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <p>还没有执行任何工具</p>
            <p class="text-sm mt-2">请从左侧选择工具开始操作</p>
          </div>
        </div>
        
        <div v-else class="h-full overflow-y-auto p-4 space-y-4">
          <div 
            v-for="(record, index) in executionHistory" 
            :key="record.id"
            class="bg-card border rounded-lg overflow-hidden"
          >
            <!-- 记录头部 -->
            <div 
              @click="record.expanded = !record.expanded"
              class="p-4 cursor-pointer hover:bg-accent transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <div :class="[
                      'w-3 h-3 rounded-full',
                      record.status === 'success' ? 'bg-green-500' :
                      record.status === 'error' ? 'bg-red-500' :
                      record.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
                    ]"></div>
                    <span class="font-medium">{{ record.toolName }}</span>
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ record.timestamp.toLocaleString() }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div v-if="record.status === 'running'" class="text-sm text-muted-foreground">
                    执行中...
                  </div>
                  <div v-else-if="record.duration" class="text-sm text-muted-foreground">
                    耗时: {{ record.duration }}ms
                  </div>
                  <svg 
                    :class="[
                      'w-4 h-4 transition-transform',
                      record.expanded ? 'transform rotate-180' : ''
                    ]" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                  </svg>
                </div>
              </div>
              
              <div class="mt-2">
                <div class="text-sm text-muted-foreground">
                  <span class="font-medium">输入：</span>
                  {{ formatInput(record.input) }}
                </div>
              </div>
            </div>

            <!-- 记录详情 -->
            <div v-if="record.expanded" class="border-t border-border">
              <div class="p-4">
                <!-- 输入参数 -->
                <div class="mb-4">
                  <h5 class="font-medium mb-2">输入参数</h5>
                  <pre class="text-sm bg-muted p-3 rounded border overflow-auto">{{ JSON.stringify(record.input, null, 2) }}</pre>
                </div>

                <!-- 输出结果 -->
                <div v-if="record.output">
                  <h5 class="font-medium mb-2">输出结果</h5>
                  <div v-if="record.status === 'error'" class="text-sm bg-destructive/10 border border-destructive/20 p-3 rounded text-destructive">
                    <strong>错误：</strong> {{ record.output.error || '未知错误' }}
                  </div>
                  <div v-else>
                    <pre class="text-sm bg-muted p-3 rounded border overflow-auto max-h-64">{{ formatOutput(record.output) }}</pre>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="mt-4 flex items-center gap-2">
                  <button 
                    @click="retryExecution(record)"
                    class="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    重新执行
                  </button>
                  <button 
                    @click="copyResult(record)"
                    class="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
                    复制结果
                  </button>
                  <button 
                    @click="removeRecord(record.id)"
                    class="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  >
                    删除记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService } from '@/lib/api'

interface ExecutionRecord {
  id: string
  toolName: string
  input: any
  output?: any
  status: 'running' | 'success' | 'error' | 'cancelled'
  timestamp: Date
  duration?: number
  expanded?: boolean
}

// 表单数据
const analysisForm = ref({
  filePath: '',
  outputType: 'report'
})

const searchForm = ref({
  filePath: '',
  query: ''
})

const parseForm = ref({
  filePath: ''
})

const batchForm = ref({
  directory: '',
  pattern: '*.ts,*.tsx'
})

// 加载状态
const analysisLoading = ref(false)
const searchLoading = ref(false)
const parseLoading = ref(false)
const batchLoading = ref(false)

// 执行历史
const executionHistory = ref<ExecutionRecord[]>([])

// 执行分析工具
const runAnalysis = async () => {
  if (!analysisForm.value.filePath.trim()) return

  const record = createExecutionRecord('代码分析', {
    filePath: analysisForm.value.filePath,
    outputType: analysisForm.value.outputType
  })

  analysisLoading.value = true
  try {
    const startTime = Date.now()
    const result = await apiService.analyzeLocalTsCode(analysisForm.value.filePath)
    const duration = Date.now() - startTime

    updateExecutionRecord(record.id, {
      output: result,
      status: result.success ? 'success' : 'error',
      duration
    })

    // 清空表单
    if (result.success) {
      analysisForm.value.filePath = ''
    }
  } catch (error) {
    updateExecutionRecord(record.id, {
      output: { error: error instanceof Error ? error.message : '执行失败' },
      status: 'error'
    })
  } finally {
    analysisLoading.value = false
  }
}

// 执行搜索工具
const runSearch = async () => {
  if (!searchForm.value.filePath.trim()) return

  const record = createExecutionRecord('代码搜索', {
    filePath: searchForm.value.filePath,
    query: searchForm.value.query
  })

  searchLoading.value = true
  try {
    const startTime = Date.now()
    const result = await apiService.searchLocalTsCode(
      searchForm.value.filePath,
      searchForm.value.query || undefined
    )
    const duration = Date.now() - startTime

    updateExecutionRecord(record.id, {
      output: result,
      status: result.success ? 'success' : 'error',
      duration
    })

    // 清空表单
    if (result.success) {
      searchForm.value.filePath = ''
      searchForm.value.query = ''
    }
  } catch (error) {
    updateExecutionRecord(record.id, {
      output: { error: error instanceof Error ? error.message : '执行失败' },
      status: 'error'
    })
  } finally {
    searchLoading.value = false
  }
}

// 执行解析工具
const runParse = async () => {
  if (!parseForm.value.filePath.trim()) return

  const record = createExecutionRecord('代码解析', {
    filePath: parseForm.value.filePath
  })

  parseLoading.value = true
  try {
    const startTime = Date.now()
    const result = await apiService.parseLocalTsCode(parseForm.value.filePath)
    const duration = Date.now() - startTime

    updateExecutionRecord(record.id, {
      output: result,
      status: result.success ? 'success' : 'error',
      duration
    })

    // 清空表单
    if (result.success) {
      parseForm.value.filePath = ''
    }
  } catch (error) {
    updateExecutionRecord(record.id, {
      output: { error: error instanceof Error ? error.message : '执行失败' },
      status: 'error'
    })
  } finally {
    parseLoading.value = false
  }
}

// 执行批量处理
const runBatch = async () => {
  if (!batchForm.value.directory.trim()) return

  const record = createExecutionRecord('批量处理', {
    directory: batchForm.value.directory,
    pattern: batchForm.value.pattern
  })

  batchLoading.value = true
  try {
    const startTime = Date.now()
    // 这里应该调用批量处理API
    // 临时模拟
    await new Promise(resolve => setTimeout(resolve, 3000))
    const duration = Date.now() - startTime

    updateExecutionRecord(record.id, {
      output: { 
        success: true,
        processed: 15,
        results: '处理了15个文件，生成了相应的分析报告'
      },
      status: 'success',
      duration
    })

    // 清空表单
    batchForm.value.directory = ''
  } catch (error) {
    updateExecutionRecord(record.id, {
      output: { error: error instanceof Error ? error.message : '执行失败' },
      status: 'error'
    })
  } finally {
    batchLoading.value = false
  }
}

// 创建执行记录
const createExecutionRecord = (toolName: string, input: any): ExecutionRecord => {
  const record: ExecutionRecord = {
    id: Date.now().toString() + Math.random(),
    toolName,
    input,
    status: 'running',
    timestamp: new Date(),
    expanded: true
  }
  
  executionHistory.value.unshift(record)
  return record
}

// 更新执行记录
const updateExecutionRecord = (id: string, updates: Partial<ExecutionRecord>) => {
  const record = executionHistory.value.find(r => r.id === id)
  if (record) {
    Object.assign(record, updates)
  }
}

// 重试执行
const retryExecution = async (record: ExecutionRecord) => {
  if (record.toolName === '代码分析') {
    analysisForm.value.filePath = record.input.filePath
    analysisForm.value.outputType = record.input.outputType
    await runAnalysis()
  } else if (record.toolName === '代码搜索') {
    searchForm.value.filePath = record.input.filePath
    searchForm.value.query = record.input.query
    await runSearch()
  } else if (record.toolName === '代码解析') {
    parseForm.value.filePath = record.input.filePath
    await runParse()
  } else if (record.toolName === '批量处理') {
    batchForm.value.directory = record.input.directory
    batchForm.value.pattern = record.input.pattern
    await runBatch()
  }
}

// 复制结果
const copyResult = (record: ExecutionRecord) => {
  const result = JSON.stringify(record.output, null, 2)
  navigator.clipboard.writeText(result).then(() => {
    // 这里可以显示复制成功的提示
    console.log('结果已复制到剪贴板')
  })
}

// 删除记录
const removeRecord = (id: string) => {
  const index = executionHistory.value.findIndex(r => r.id === id)
  if (index > -1) {
    executionHistory.value.splice(index, 1)
  }
}

// 清空历史
const clearHistory = () => {
  executionHistory.value = []
}

// 导出历史
const exportHistory = () => {
  const data = {
    timestamp: new Date().toISOString(),
    records: executionHistory.value
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `mcp-tools-history-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

// 格式化输入
const formatInput = (input: any) => {
  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }
  return String(input)
}

// 格式化输出
const formatOutput = (output: any) => {
  return JSON.stringify(output, null, 2)
}

onMounted(() => {
  // 加载历史记录（如果有的话）
})
</script>