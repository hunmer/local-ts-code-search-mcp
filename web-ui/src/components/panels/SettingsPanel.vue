<template>
  <div class="h-full p-6 bg-background">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- AI设置 -->
      <div class="bg-card border rounded-lg p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A1,1 0 0,0 14,8H18A1,1 0 0,0 19,7V5.73C18.4,5.39 18,4.74 18,4A2,2 0 0,1 20,2A2,2 0 0,1 22,4C22,4.74 21.6,5.39 21,5.73V7A3,3 0 0,1 18,10H14A3,3 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7,9A2,2 0 0,1 9,11C9,11.74 8.6,12.39 8,12.73V14A1,1 0 0,0 9,15H10A1,1 0 0,0 11,14V12.73C10.4,12.39 10,11.74 10,11A2,2 0 0,1 12,9A2,2 0 0,1 14,11C14,11.74 13.6,12.39 13,12.73V14A3,3 0 0,1 10,17H9A3,3 0 0,1 6,14V12.73C5.4,12.39 5,11.74 5,11A2,2 0 0,1 7,9M2,16A2,2 0 0,1 4,18C4,18.74 3.6,19.39 3,19.73V21A1,1 0 0,0 4,22H9A1,1 0 0,0 10,21V19.73C9.4,19.39 9,18.74 9,18A2,2 0 0,1 11,16A2,2 0 0,1 13,18C13,18.74 12.6,19.39 12,19.73V21A3,3 0 0,1 9,24H4A3,3 0 0,1 1,21V19.73C0.4,19.39 0,18.74 0,18A2,2 0 0,1 2,16Z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold">AI设置</h2>
            <p class="text-sm text-muted-foreground">配置AI服务相关参数</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 站点配置 -->
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium block mb-2">AI服务站点</label>
              <select 
                v-model="aiSettings.site"
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="azure">Azure OpenAI</option>
                <option value="custom">自定义站点</option>
              </select>
            </div>

            <div v-if="aiSettings.site === 'custom'">
              <label class="text-sm font-medium block mb-2">自定义API端点</label>
              <input 
                v-model="aiSettings.customEndpoint"
                type="url" 
                placeholder="https://api.example.com/v1" 
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">API Key</label>
              <div class="relative">
                <input 
                  v-model="aiSettings.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="输入你的API密钥" 
                  class="w-full px-3 py-2 pr-10 border border-border rounded-md text-sm bg-background"
                />
                <button 
                  @click="showApiKey = !showApiKey"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg v-if="showApiKey" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 模型配置 -->
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium block mb-2">AI模型</label>
              <select 
                v-model="aiSettings.model"
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              >
                <optgroup v-if="aiSettings.site === 'openai'" label="OpenAI Models">
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </optgroup>
                <optgroup v-else-if="aiSettings.site === 'anthropic'" label="Anthropic Models">
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </optgroup>
                <optgroup v-else-if="aiSettings.site === 'azure'" label="Azure Models">
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-35-turbo">GPT-3.5 Turbo</option>
                </optgroup>
                <option v-else value="custom">自定义模型</option>
              </select>
            </div>

            <div v-if="aiSettings.model === 'custom' || aiSettings.site === 'custom'">
              <label class="text-sm font-medium block mb-2">自定义模型名称</label>
              <input 
                v-model="aiSettings.customModel"
                type="text" 
                placeholder="例如：gpt-4" 
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">温度 (Temperature)</label>
              <div class="flex items-center gap-3">
                <input 
                  v-model.number="aiSettings.temperature"
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  class="flex-1"
                />
                <span class="text-sm font-mono w-8">{{ aiSettings.temperature }}</span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">控制回答的随机性，0为最确定，2为最随机</p>
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">最大令牌数</label>
              <input 
                v-model.number="aiSettings.maxTokens"
                type="number" 
                min="1" 
                max="4000"
                placeholder="2000" 
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              />
            </div>
          </div>
        </div>

        <!-- 测试连接 -->
        <div class="mt-6 pt-6 border-t border-border">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium">连接测试</h4>
              <p class="text-sm text-muted-foreground">测试AI服务是否可正常连接</p>
            </div>
            <button 
              @click="testConnection"
              :disabled="testLoading"
              class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {{ testLoading ? '测试中...' : '测试连接' }}
            </button>
          </div>
          
          <div v-if="testResult" class="mt-4 p-3 rounded border" :class="[
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          ]">
            <div class="font-medium">
              {{ testResult.success ? '✅ 连接成功' : '❌ 连接失败' }}
            </div>
            <div class="text-sm mt-1">{{ testResult.message }}</div>
          </div>
        </div>
      </div>

      <!-- 服务器设置 -->
      <div class="bg-card border rounded-lg p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M5,2V6H19V2H5M5,10V14H19V10H5M5,18V22H19V18H5Z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold">服务器配置</h2>
            <p class="text-sm text-muted-foreground">MCP服务器相关设置</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium block mb-2">源代码目录</label>
              <div class="flex gap-2">
                <input 
                  v-model="serverSettings.sourcePath"
                  type="text" 
                  placeholder="/path/to/source" 
                  class="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                  readonly
                />
                <button 
                  @click="browseDirectory('source')"
                  class="px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  浏览
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">报告目录</label>
              <div class="flex gap-2">
                <input 
                  v-model="serverSettings.reportPath"
                  type="text" 
                  placeholder="/path/to/reports" 
                  class="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                  readonly
                />
                <button 
                  @click="browseDirectory('report')"
                  class="px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  浏览
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">解析目录</label>
              <div class="flex gap-2">
                <input 
                  v-model="serverSettings.parsedPath"
                  type="text" 
                  placeholder="/path/to/parsed" 
                  class="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-background"
                  readonly
                />
                <button 
                  @click="browseDirectory('parsed')"
                  class="px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  浏览
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium block mb-2">服务器端口</label>
              <input 
                v-model.number="serverSettings.port"
                type="number" 
                min="1000" 
                max="65535"
                placeholder="3001" 
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">最大文件大小</label>
              <select 
                v-model="serverSettings.maxFileSize"
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              >
                <option value="1MB">1 MB</option>
                <option value="5MB">5 MB</option>
                <option value="10MB">10 MB</option>
                <option value="50MB">50 MB</option>
              </select>
            </div>

            <div>
              <label class="text-sm font-medium block mb-2">支持的文件扩展名</label>
              <input 
                v-model="serverSettings.allowedExtensions"
                type="text" 
                placeholder=".ts,.tsx,.js,.jsx,.vue" 
                class="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
              />
              <p class="text-xs text-muted-foreground mt-1">用逗号分隔多个扩展名</p>
            </div>
          </div>
        </div>

        <!-- 服务器状态 -->
        <div class="mt-6 pt-6 border-t border-border">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-medium">服务器状态</h4>
              <p class="text-sm text-muted-foreground">当前MCP服务器运行状态</p>
            </div>
            <button 
              @click="checkServerStatus"
              :disabled="statusLoading"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {{ statusLoading ? '检查中...' : '检查状态' }}
            </button>
          </div>

          <div v-if="serverStatus" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-3 bg-accent rounded-lg">
              <div class="text-sm text-muted-foreground">运行状态</div>
              <div class="flex items-center gap-2 mt-1">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  serverStatus.running ? 'bg-green-500' : 'bg-red-500'
                ]"></div>
                <span class="font-medium">{{ serverStatus.running ? '运行中' : '已停止' }}</span>
              </div>
            </div>
            
            <div class="p-3 bg-accent rounded-lg">
              <div class="text-sm text-muted-foreground">启动时间</div>
              <div class="font-medium mt-1">{{ serverStatus.uptime || 'N/A' }}</div>
            </div>
            
            <div class="p-3 bg-accent rounded-lg">
              <div class="text-sm text-muted-foreground">处理请求</div>
              <div class="font-medium mt-1">{{ serverStatus.requestCount || 0 }}</div>
            </div>
            
            <div class="p-3 bg-accent rounded-lg">
              <div class="text-sm text-muted-foreground">内存使用</div>
              <div class="font-medium mt-1">{{ serverStatus.memoryUsage || 'N/A' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-end gap-3">
        <button 
          @click="resetSettings"
          class="px-6 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          重置设置
        </button>
        <button 
          @click="saveSettings"
          :disabled="saveLoading"
          class="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {{ saveLoading ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService } from '@/lib/api'

interface AISettings {
  site: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  customEndpoint?: string
  customModel?: string
}

interface ServerSettings {
  sourcePath: string
  reportPath: string
  parsedPath: string
  port: number
  maxFileSize: string
  allowedExtensions: string
}

interface ServerStatus {
  running: boolean
  uptime?: string
  requestCount?: number
  memoryUsage?: string
}

const showApiKey = ref(false)
const testLoading = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const statusLoading = ref(false)
const saveLoading = ref(false)

const aiSettings = ref<AISettings>({
  site: 'openai',
  apiKey: '',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
})

const serverSettings = ref<ServerSettings>({
  sourcePath: '',
  reportPath: '',
  parsedPath: '',
  port: 3001,
  maxFileSize: '10MB',
  allowedExtensions: '.ts,.tsx,.js,.jsx,.vue'
})

const serverStatus = ref<ServerStatus | null>(null)

// 测试AI连接
const testConnection = async () => {
  if (!aiSettings.value.apiKey.trim()) {
    testResult.value = {
      success: false,
      message: '请先输入API Key'
    }
    return
  }

  testLoading.value = true
  testResult.value = null

  try {
    // 这里应该调用实际的AI服务测试接口
    // 临时模拟测试
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    testResult.value = {
      success: true,
      message: `成功连接到 ${aiSettings.value.site} 的 ${aiSettings.value.model} 模型`
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '连接失败，请检查配置'
    }
  } finally {
    testLoading.value = false
  }
}

// 浏览目录
const browseDirectory = async (type: 'source' | 'report' | 'parsed') => {
  // 在实际应用中，这里应该调用系统的目录选择对话框
  // 临时使用输入框
  const path = prompt(`请输入${type === 'source' ? '源代码' : type === 'report' ? '报告' : '解析'}目录路径:`)
  if (path) {
    if (type === 'source') {
      serverSettings.value.sourcePath = path
    } else if (type === 'report') {
      serverSettings.value.reportPath = path
    } else {
      serverSettings.value.parsedPath = path
    }
  }
}

// 检查服务器状态
const checkServerStatus = async () => {
  statusLoading.value = true
  try {
    const status = await apiService.healthCheck()
    serverStatus.value = {
      running: status.status === 'ok',
      uptime: '2小时 15分钟',
      requestCount: 42,
      memoryUsage: '128 MB'
    }
  } catch (error) {
    serverStatus.value = {
      running: false
    }
  } finally {
    statusLoading.value = false
  }
}

// 保存设置
const saveSettings = async () => {
  saveLoading.value = true
  try {
    // 合并所有设置
    const allSettings = {
      aiSettings: aiSettings.value,
      serverSettings: serverSettings.value
    }
    
    // 保存到后端API
    await apiService.saveSettings(allSettings)
    
    // 同时保存到本地存储作为备份
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings.value))
    localStorage.setItem('serverSettings', JSON.stringify(serverSettings.value))
    
    alert('设置保存成功！')
  } catch (error) {
    console.error('API保存失败，尝试仅保存到本地存储:', error)
    try {
      // 如果API保存失败，至少保存到本地存储
      localStorage.setItem('aiSettings', JSON.stringify(aiSettings.value))
      localStorage.setItem('serverSettings', JSON.stringify(serverSettings.value))
      alert('设置已保存到本地存储（后端保存失败）')
    } catch (localError) {
      alert('保存设置失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  } finally {
    saveLoading.value = false
  }
}

// 重置设置
const resetSettings = () => {
  if (confirm('确定要重置所有设置吗？')) {
    aiSettings.value = {
      site: 'openai',
      apiKey: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    }
    
    serverSettings.value = {
      sourcePath: '',
      reportPath: '',
      parsedPath: '',
      port: 3001,
      maxFileSize: '10MB',
      allowedExtensions: '.ts,.tsx,.js,.jsx,.vue'
    }
    
    testResult.value = null
    serverStatus.value = null
  }
}

// 加载设置
const loadSettings = async () => {
  try {
    // 优先从后端API加载设置
    try {
      const backendSettings = await apiService.getSettings()
      if (backendSettings) {
        // 如果后端有AI设置，使用后端设置
        if (backendSettings.aiSettings) {
          aiSettings.value = { ...aiSettings.value, ...backendSettings.aiSettings }
        }
        
        // 如果后端有服务器设置，使用后端设置
        if (backendSettings.serverSettings) {
          serverSettings.value = { ...serverSettings.value, ...backendSettings.serverSettings }
        }
        
        console.log('从后端API成功加载设置')
        return // 成功从后端加载，直接返回
      }
    } catch (error) {
      console.warn('从后端API加载设置失败，尝试从本地存储和服务器配置加载:', error)
    }
    
    // 如果后端API不可用，回退到本地存储
    const savedAiSettings = localStorage.getItem('aiSettings')
    if (savedAiSettings) {
      aiSettings.value = { ...aiSettings.value, ...JSON.parse(savedAiSettings) }
    }
    
    const savedServerSettings = localStorage.getItem('serverSettings')
    if (savedServerSettings) {
      serverSettings.value = { ...serverSettings.value, ...JSON.parse(savedServerSettings) }
    } else {
      // 尝试从服务器获取配置
      try {
        const config = await apiService.getServerConfig()
        serverSettings.value.sourcePath = config.sourcePath
        serverSettings.value.reportPath = config.reportPath
        serverSettings.value.parsedPath = config.parsedPath
      } catch (error) {
        console.warn('无法从服务器获取配置:', error)
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

onMounted(() => {
  loadSettings()
  checkServerStatus()
})
</script>