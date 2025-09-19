import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiService } from '@/lib/api'

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

interface QualityStats {
  critical: FileItem[]
  poor: FileItem[]
  fair: FileItem[]
  good: FileItem[]
  excellent: FileItem[]
}

export const useStatsStore = defineStore('stats', () => {
  const qualityStats = ref<QualityStats>({
    critical: [],
    poor: [],
    fair: [],
    good: [],
    excellent: []
  })

  const loading = ref(false)
  const error = ref<string | null>(null)

  // 加载质量统计数据
  const loadQualityStats = async () => {
    loading.value = true
    error.value = null
    
    try {
      // 使用新的API方法获取报告数据
      const reports = await apiService.getReports()
      
      // 初始化所有质量等级
      const qualities = ['critical', 'poor', 'fair', 'good', 'excellent'] as const
      
      for (const quality of qualities) {
        qualityStats.value[quality] = []
        
        // 查找对应的报告文件
        const reportKey = `${quality}.json`
        if (reports[reportKey]) {
          const data = reports[reportKey]
          
          // 将原始数据转换为FileItem格式
          qualityStats.value[quality] = (Array.isArray(data) ? data : data.files || []).map((item: any) => ({
            path: item.filePath || item.path || '',
            quality: quality,
            hasReport: true,
            hasParsed: !!item.parsed,
            stats: {
              complexity: item.complexity,
              lines: item.lines,
              functions: item.functions,
              size: item.size
            }
          }))
        }
      }
    } catch (err) {
      error.value = '加载统计数据失败'
      console.error('加载质量统计失败:', err)
      
      // 如果失败，初始化为空数组
      const qualities = ['critical', 'poor', 'fair', 'good', 'excellent'] as const
      for (const quality of qualities) {
        qualityStats.value[quality] = []
      }
    } finally {
      loading.value = false
    }
  }

  // 获取总数统计
  const getTotalStats = () => {
    return {
      total: Object.values(qualityStats.value).reduce((sum, files) => sum + files.length, 0),
      critical: qualityStats.value.critical.length,
      poor: qualityStats.value.poor.length,
      fair: qualityStats.value.fair.length,
      good: qualityStats.value.good.length,
      excellent: qualityStats.value.excellent.length,
    }
  }

  return {
    qualityStats,
    loading,
    error,
    loadQualityStats,
    getTotalStats
  }
})