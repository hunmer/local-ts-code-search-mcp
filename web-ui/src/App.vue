<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import StatsPanel from '@/components/panels/StatsPanel.vue'
import SourcePanel from '@/components/panels/SourcePanel.vue'
import ToolsPanel from '@/components/panels/ToolsPanel.vue'
import SettingsPanel from '@/components/panels/SettingsPanel.vue'

const currentPanel = ref('stats')
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- 侧边栏 -->
    <AppSidebar 
      v-model:current-panel="currentPanel" 
      class="w-64 border-r border-border"
    />
    
    <!-- 主内容区域 -->
    <div class="flex-1 flex flex-col">
      <!-- 顶部标题栏 -->
      <header class="h-14 border-b border-border px-6 flex items-center">
        <h1 class="text-lg font-semibold">
          🔍 Local TS Code Search MCP - 
          <span class="text-muted-foreground">
            {{ 
              currentPanel === 'stats' ? '统计面板' :
              currentPanel === 'source' ? '源代码' :
              currentPanel === 'tools' ? '在线工具' :
              currentPanel === 'settings' ? '设置' : '未知'
            }}
          </span>
        </h1>
      </header>
      
      <!-- 面板内容 -->
      <main class="flex-1 overflow-hidden">
        <StatsPanel v-if="currentPanel === 'stats'" />
        <SourcePanel v-else-if="currentPanel === 'source'" />
        <ToolsPanel v-else-if="currentPanel === 'tools'" />
        <SettingsPanel v-else-if="currentPanel === 'settings'" />
      </main>
    </div>
  </div>
</template>
