<template>
  <div class="h-full flex bg-background">
    <!-- 左侧：过滤和文件列表 -->
    <div class="w-1/3 border-r border-border flex flex-col">
      <!-- 过滤选择 -->
      <div class="p-4 border-b border-border">
        <div class="mb-3">
          <label class="text-sm font-medium mb-2 block">过滤条件</label>
          <select 
            v-model="filterType" 
            class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
          >
            <option value="all">所有文件</option>
            <option value="analyzed">已分析</option>
            <option value="parsed">已解析</option>
            <option value="unanalyzed">未分析</option>
          </select>
        </div>
        
        <div>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索文件名..." 
            class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
          />
        </div>
      </div>

      <!-- 文件列表标题 -->
      <div class="px-4 py-2 border-b border-border">
        <h3 class="font-medium">文件列表 ({{ filteredFiles.length }})</h3>
      </div>

      <!-- 文件列表 -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="p-4 text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <div class="text-sm text-muted-foreground mt-2">加载中...</div>
        </div>
        
        <div v-else-if="filteredFiles.length === 0" class="p-4 text-center text-muted-foreground">
          没有找到文件
        </div>
        
        <div v-else class="p-2">
          <div 
            v-for="file in filteredFiles" 
            :key="file.path"
            @click="selectFile(file)"
            :class="[
              'p-3 rounded-md cursor-pointer transition-colors mb-2',
              selectedFile?.path === file.path 
                ? 'bg-primary/10 border border-primary' 
                : 'hover:bg-accent border border-transparent'
            ]"
          >
            <div class="flex items-center gap-2 mb-1">
              <div class="flex-shrink-0">
                <svg v-if="file.type === 'typescript'" class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.125,0C0.502,0,0,0.502,0,1.125v21.75C0,23.498,0.502,24,1.125,24h21.75c0.623,0,1.125-0.502,1.125-1.125V1.125C24,0.502,23.498,0,22.875,0H1.125z M17.363,8.625H16.23v8.77h-2.25V8.625h-1.133V6.75h4.516V8.625z M13.5,8.625c0,0.77-0.621,1.395-1.389,1.395s-1.389-0.625-1.389-1.395s0.621-1.395,1.389-1.395S13.5,7.855,13.5,8.625z"/>
                </svg>
                <svg v-else-if="file.type === 'javascript'" class="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0,0v24h24V0H0z M22.5,22.5h-21v-21h21V22.5z M10.5,18.75c0,0.827-0.673,1.5-1.5,1.5s-1.5-0.673-1.5-1.5V12h1.5v6.75H10.5z M18.75,18.75c0,0.827-0.673,1.5-1.5,1.5h-3c-0.827,0-1.5-0.673-1.5-1.5V12h1.5v6.75h3V12h1.5V18.75z"/>
                </svg>
                <svg v-else class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ getFileName(file.path) }}</div>
                <div class="text-xs text-muted-foreground truncate">{{ file.relativePath }}</div>
              </div>
            </div>
            
            <div class="flex items-center gap-1 text-xs">
              <div v-if="file.hasReport" class="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                已分析
              </div>
              <div v-if="file.hasParsed" class="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                已解析
              </div>
              <div v-if="!file.hasReport && !file.hasParsed" class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                未分析
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：文件详情 -->
    <div class="flex-1 flex flex-col">
      <!-- 文件标题和工具栏 -->
      <div v-if="selectedFile" class="border-b border-border p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold truncate">{{ getFileName(selectedFile.path) }}</h2>
          <div class="flex items-center gap-2">
            <button 
              @click="analyzeFile"
              :disabled="analyzing"
              class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {{ analyzing ? '分析中...' : '分析' }}
            </button>
            <button 
              @click="parseFile"
              :disabled="parsing"
              class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {{ parsing ? '解析中...' : '解析' }}
            </button>
          </div>
        </div>
        <div class="text-sm text-muted-foreground">{{ selectedFile.path }}</div>
      </div>

      <!-- 选项卡内容 -->
      <div v-if="selectedFile" class="flex-1 flex flex-col">
        <!-- 选项卡标题 -->
        <div class="border-b border-border">
          <nav class="flex space-x-8 px-4" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- 选项卡内容 -->
        <div class="flex-1 flex overflow-hidden">
          <!-- 主内容区 -->
          <div class="flex-1 overflow-hidden">
            <!-- 文件内容 -->
            <div v-if="activeTab === 'content'" class="h-full p-4 overflow-auto">
              <pre v-if="fileContent" class="text-sm bg-muted p-4 rounded border overflow-auto"><code>{{ fileContent }}</code></pre>
              <div v-else class="text-center text-muted-foreground py-8">
                <button @click="loadFileContent" class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  加载文件内容
                </button>
              </div>
            </div>

            <!-- 解析内容 -->
            <div v-else-if="activeTab === 'parsed'" class="h-full p-4 overflow-auto">
              <div v-if="parsedData" class="space-y-4">
                <div v-if="parsedData.summary" class="p-4 bg-card border rounded-lg">
                  <h4 class="font-medium mb-2">总结信息</h4>
                  <pre class="text-sm text-muted-foreground">{{ JSON.stringify(parsedData.summary, null, 2) }}</pre>
                </div>
                <div v-if="parsedData.annotations?.length" class="space-y-2">
                  <h4 class="font-medium">注解信息</h4>
                  <div v-for="(annotation, index) in parsedData.annotations" :key="index" class="p-3 bg-card border rounded">
                    <div class="font-medium">{{ annotation.symbol || '未知符号' }}</div>
                    <div class="text-sm text-muted-foreground">{{ annotation.kind || '未知类型' }}</div>
                    <div v-if="annotation.minimal_comments" class="text-sm mt-1">
                      {{ annotation.minimal_comments.join(', ') }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-muted-foreground py-8">
                暂无解析数据
              </div>
            </div>

            <!-- AI问答 -->
            <div v-else-if="activeTab === 'ai'" class="h-full flex flex-col">
              <div class="flex-1 p-4 overflow-auto">
                <div v-if="chatHistory.length === 0" class="text-center text-muted-foreground py-8">
                  开始与AI对话了解这个文件...
                </div>
                <div v-else class="space-y-4">
                  <div v-for="(message, index) in chatHistory" :key="index" :class="[
                    'p-3 rounded-lg max-w-4xl',
                    message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'
                  ]">
                    <div class="text-sm">{{ message.content }}</div>
                  </div>
                </div>
              </div>
              <div class="border-t border-border p-4">
                <div class="flex gap-2">
                  <input 
                    v-model="aiQuestion"
                    @keyup.enter="askAI"
                    type="text" 
                    placeholder="问问AI关于这个文件的问题..."
                    class="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                  />
                  <button 
                    @click="askAI"
                    :disabled="!aiQuestion.trim() || aiLoading"
                    class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {{ aiLoading ? '思考中...' : '发送' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：信息卡片 -->
          <div class="w-80 border-l border-border p-4 overflow-y-auto">
            <!-- 文件信息卡片 -->
            <div class="mb-4 p-4 bg-card border rounded-lg">
              <h4 class="font-medium mb-3">文件信息</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">类型:</span>
                  <span>{{ selectedFile.type }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">大小:</span>
                  <span>{{ selectedFile.size || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">修改时间:</span>
                  <span>{{ selectedFile.lastModified || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- 健康度卡片 -->
            <div v-if="selectedFile.hasReport" class="mb-4 p-4 bg-card border rounded-lg">
              <h4 class="font-medium mb-3">文件健康度</h4>
              <div class="text-center">
                <div class="text-2xl font-bold mb-2" :class="getHealthColor(selectedFile.healthLevel || '')">
                  {{ selectedFile.healthScore || 'N/A' }}
                </div>
                <div class="text-sm text-muted-foreground">{{ selectedFile.healthLevel || '未知' }}</div>
                <div class="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    :class="getHealthBgColor(selectedFile.healthLevel || '')"
                    class="h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${selectedFile.healthScore || 0}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- 函数列表 -->
            <div v-if="functionList.length" class="p-4 bg-card border rounded-lg">
              <h4 class="font-medium mb-3">函数列表</h4>
              <div class="space-y-2">
                <div v-for="func in functionList" :key="func.name" class="text-sm">
                  <div class="font-medium">{{ func.name }}</div>
                  <div class="text-muted-foreground text-xs">复杂度: {{ func.complexity }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未选择文件时的提示 -->
      <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <p>请从左侧选择一个文件查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiService } from '@/lib/api'

interface FileItem {
  path: string
  relativePath: string
  type: string
  size?: string
  lastModified?: string
  hasReport: boolean
  hasParsed: boolean
  healthLevel?: string
  healthScore?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const loading = ref(false)
const files = ref<FileItem[]>([])
const selectedFile = ref<FileItem | null>(null)
const filterType = ref('all')
const searchQuery = ref('')
const activeTab = ref('content')
const fileContent = ref('')
const parsedData = ref<any>(null)
const analyzing = ref(false)
const parsing = ref(false)
const chatHistory = ref<ChatMessage[]>([])
const aiQuestion = ref('')
const aiLoading = ref(false)
const functionList = ref<any[]>([])

const tabs = [
  { key: 'content', label: '文件内容' },
  { key: 'parsed', label: '解析内容' },
  { key: 'ai', label: 'AI问答' }
]

const filteredFiles = computed(() => {
  let result = files.value

  // 根据类型过滤
  if (filterType.value === 'analyzed') {
    result = result.filter(f => f.hasReport)
  } else if (filterType.value === 'parsed') {
    result = result.filter(f => f.hasParsed)
  } else if (filterType.value === 'unanalyzed') {
    result = result.filter(f => !f.hasReport)
  }

  // 根据搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(f => 
      f.path.toLowerCase().includes(query) ||
      getFileName(f.path).toLowerCase().includes(query)
    )
  }

  return result
})

const getFileName = (path: string) => {
  return path.split('/').pop() || path
}

const getHealthColor = (level: string) => {
  const colors = {
    excellent: 'text-green-600',
    good: 'text-blue-600', 
    fair: 'text-yellow-600',
    poor: 'text-orange-600',
    critical: 'text-red-600'
  }
  return colors[level as keyof typeof colors] || 'text-gray-600'
}

const getHealthBgColor = (level: string) => {
  const colors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500', 
    poor: 'bg-orange-500',
    critical: 'bg-red-500'
  }
  return colors[level as keyof typeof colors] || 'bg-gray-500'
}

const selectFile = (file: FileItem) => {
  selectedFile.value = file
  fileContent.value = ''
  parsedData.value = null
  chatHistory.value = []
  functionList.value = []
  activeTab.value = 'content'
}

const loadFileContent = async () => {
  if (!selectedFile.value) return
  
  try {
    fileContent.value = await apiService.readFile(selectedFile.value.path)
  } catch (error) {
    console.error('加载文件内容失败:', error)
  }
}

const analyzeFile = async () => {
  if (!selectedFile.value) return
  
  analyzing.value = true
  try {
    const result = await apiService.analyzeLocalTsCode(selectedFile.value.path)
    if (result.success) {
      selectedFile.value.hasReport = true
      // 可以在这里更新文件的分析状态
    }
  } catch (error) {
    console.error('分析文件失败:', error)
  } finally {
    analyzing.value = false
  }
}

const parseFile = async () => {
  if (!selectedFile.value) return
  
  parsing.value = true
  try {
    const result = await apiService.parseLocalTsCode(selectedFile.value.path)
    if (result.success && result.data) {
      parsedData.value = result.data
      selectedFile.value.hasParsed = true
    }
  } catch (error) {
    console.error('解析文件失败:', error)
  } finally {
    parsing.value = false
  }
}

const askAI = async () => {
  if (!aiQuestion.value.trim() || !selectedFile.value) return
  
  const question = aiQuestion.value.trim()
  aiQuestion.value = ''
  
  chatHistory.value.push({
    role: 'user',
    content: question
  })
  
  aiLoading.value = true
  try {
    // 这里可以调用AI服务
    // 临时使用模拟回答
    setTimeout(() => {
      chatHistory.value.push({
        role: 'assistant',
        content: `关于文件 ${getFileName(selectedFile.value!.path)}: 这是一个很好的问题。基于当前的代码分析，我建议...（这里应该是真正的AI回答）`
      })
      aiLoading.value = false
    }, 2000)
  } catch (error) {
    console.error('AI回答失败:', error)
    aiLoading.value = false
  }
}

const loadFiles = async () => {
  loading.value = true
  try {
    // 这里应该从API加载文件列表
    // 临时使用模拟数据
    files.value = [
      {
        path: 'src/components/App.vue',
        relativePath: 'src/components/App.vue',
        type: 'vue',
        size: '2.1KB',
        lastModified: '2025-01-19',
        hasReport: true,
        hasParsed: true,
        healthLevel: 'good',
        healthScore: 85
      },
      {
        path: 'src/utils/helpers.ts',
        relativePath: 'src/utils/helpers.ts',
        type: 'typescript',
        size: '1.5KB', 
        lastModified: '2025-01-18',
        hasReport: true,
        hasParsed: false,
        healthLevel: 'fair',
        healthScore: 70
      }
    ]
  } catch (error) {
    console.error('加载文件列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFiles()
})
</script>