<template>
  <el-container class="app-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><Lightning /></el-icon>
        <span class="logo-text">电网调度系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#b8c7ce"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>运行总览</span>
        </el-menu-item>
        <el-menu-item index="/equipment">
          <el-icon><Setting /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        <el-menu-item index="/dispatch">
          <el-icon><Connection /></el-icon>
          <span>发电调度</span>
        </el-menu-item>
        <el-menu-item index="/monitor">
          <el-icon><Monitor /></el-icon>
          <span>实时监控</span>
        </el-menu-item>
        <el-menu-item index="/topology">
          <el-icon><Share /></el-icon>
          <span>电网拓扑</span>
        </el-menu-item>
        <el-menu-item index="/maintenance">
          <el-icon><Tools /></el-icon>
          <span>维保管理</span>
        </el-menu-item>
        <el-menu-item index="/scheduling">
          <el-icon><Calendar /></el-icon>
          <span>人员排班</span>
        </el-menu-item>
        <el-menu-item index="/statistics">
          <el-icon><PieChart /></el-icon>
          <span>统计报表</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="system-title">大型电网调度与设备运维系统</span>
        </div>
        <div class="header-right">
          <el-tag v-if="monitorStore.unacknowledgedAlarms.length > 0" type="danger" effect="dark" class="alarm-badge">
            告警: {{ monitorStore.unacknowledgedAlarms.length }}
          </el-tag>
          <el-icon :size="20" class="header-icon"><Bell /></el-icon>
          <el-avatar :size="32" style="background: #409eff">
            <el-icon><User /></el-icon>
          </el-avatar>
          <span class="username">管理员</span>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMonitorStore } from '@/stores/monitor'

const route = useRoute()
const monitorStore = useMonitorStore()

const activeMenu = computed(() => route.path)

onMounted(() => {
  monitorStore.startMonitoring()
})

onUnmounted(() => {
  monitorStore.stopMonitoring()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>

<style scoped>
.app-container {
  height: 100%;
}

.sidebar {
  background: #001529;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #002140;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

:deep(.el-menu) {
  border-right: none;
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  color: #606266;
  cursor: pointer;
}

.username {
  color: #606266;
  font-size: 14px;
}

.alarm-badge {
  cursor: pointer;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  margin-left: 240px;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}
</style>
