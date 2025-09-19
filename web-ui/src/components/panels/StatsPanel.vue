<template>
  <div class="h-full p-6 bg-background">
    <!-- 五个卡片区域 -->
    <div class="grid grid-cols-5 gap-4 mb-6">
      <!-- Critical 卡片 -->
      <div 
        @click="selectQuality('critical')"
        :class="[
          'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          selectedQuality === 'critical' 
            ? 'border-destructive bg-destructive/5' 
            : 'border-border bg-card hover:bg-accent'
        ]"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-sm">Critical</h3>
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
        </div>
        <div class="text-2xl font-bold text-destructive">{{ stats.critical.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">严重问题</div>
      </div>

      <!-- Poor 卡片 -->
      <div 
        @click="selectQuality('poor')"
        :class="[
          'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          selectedQuality === 'poor' 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-border bg-card hover:bg-accent'
        ]"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-sm">Poor</h3>
          <div class="w-3 h-3 rounded-full bg-orange-500"></div>
        </div>
        <div class="text-2xl font-bold text-orange-600">{{ stats.poor.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">需要改进</div>
      </div>

      <!-- Fair 卡片 -->
      <div 
        @click="selectQuality('fair')"
        :class="[
          'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          selectedQuality === 'fair' 
            ? 'border-yellow-500 bg-yellow-50' 
            : 'border-border bg-card hover:bg-accent'
        ]"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-sm">Fair</h3>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
        </div>
        <div class="text-2xl font-bold text-yellow-600">{{ stats.fair.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">一般质量</div>
      </div>

      <!-- Good 卡片 -->
      <div 
        @click="selectQuality('good')"
        :class="[
          'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          selectedQuality === 'good' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-border bg-card hover:bg-accent'
        ]"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-sm">Good</h3>
          <div class="w-3 h-3 rounded-full bg-blue-500"></div>
        </div>
        <div class="text-2xl font-bold text-blue-600">{{ stats.good.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">质量良好</div>
      </div>

      <!-- Excellent 卡片 -->
      <div 
        @click="selectQuality('excellent')"
        :class="[
          'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          selectedQuality === 'excellent' 
            ? 'border-green-500 bg-green-50' 
            : 'border-border bg-card hover:bg-accent'
        ]"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-sm">Excellent</h3>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div class="text-2xl font-bold text-green-600">{{ stats.excellent.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">质量优秀</div>
      </div>
    </div>

    <!-- 文件列表区域 -->
    <div class="bg-card border border-border rounded-lg h-[calc(100%-200px)]">
      <div class="border-b border-border p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ getQualityTitle(selectedQuality) }} - 文件列表
          </h2>
          <button 
            @click="refreshData"
            :disabled="loading"
            class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ loading ? '刷新中...' : '刷新数据' }}
          </button>
        </div>
      </div>
      
      <div class="p-4 h-[calc(100%-73px)] overflow-y-auto">
        <div v-if="loading" class="flex items-center justify-center h-32">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        <div v-else-if="currentFiles.length === 0" class="text-center text-muted-foreground py-8">
          暂无 {{ getQualityTitle(selectedQuality) }} 文件
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="file in currentFiles" 
            :key="file.path"
            class="p-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full" :class="getQualityColor(selectedQuality)"></div>
                <div>
                  <div class="font-medium">{{ getFileName(file.path) }}</div>
                  <div class="text-sm text-muted-foreground">{{ file.path }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div v-if="file.hasReport" class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  已分析
                </div>
                <div v-if="file.hasParsed" class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  已解析
                </div>
                <button 
                  class="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  @click="viewFile(file)"
                >
                  查看
                </button>
              </div>
            </div>
            
            <div v-if="file.stats" class="mt-2 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div>复杂度: {{ file.stats.complexity || 'N/A' }}</div>
              <div>行数: {{ file.stats.lines || 'N/A' }}</div>
              <div>函数数: {{ file.stats.functions || 'N/A' }}</div>
              <div>大小: {{ file.stats.size || 'N/A' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStatsStore } from '@/stores/stats'

interface FileItem {
  path: string
  quality: string
  hasReport: boolean
  hasParsed: boolean
  stats?: {
    complexity?: number
    lines?: number
    functions?: number
    size?: string
  }
}

const statsStore = useStatsStore()
const loading = ref(false)
const selectedQuality = ref<'critical' | 'poor' | 'fair' | 'good' | 'excellent'>('critical')

const stats = computed(() => statsStore.qualityStats)
const currentFiles = computed(() => stats.value[selectedQuality.value] || [])

const selectQuality = (quality: typeof selectedQuality.value) => {
  selectedQuality.value = quality
}

const getQualityTitle = (quality: string) => {
  const titles = {
    critical: '严重问题',
    poor: '需要改进', 
    fair: '一般质量',
    good: '质量良好',
    excellent: '质量优秀'
  }
  return titles[quality as keyof typeof titles] || quality
}

const getQualityColor = (quality: string) => {
  const colors = {
    critical: 'bg-red-500',
    poor: 'bg-orange-500',
    fair: 'bg-yellow-500', 
    good: 'bg-blue-500',
    excellent: 'bg-green-500'
  }
  return colors[quality as keyof typeof colors] || 'bg-gray-500'
}

const getFileName = (path: string) => {
  return path.split('/').pop() || path
}

const viewFile = (file: FileItem) => {
  // 这里可以实现文件查看逻辑，比如切换到源代码面板并打开该文件
  console.log('查看文件:', file.path)
}

const refreshData = async () => {
  loading.value = true
  try {
    await statsStore.loadQualityStats()
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>