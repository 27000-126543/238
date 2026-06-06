<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" v-loading="loading">
          <div class="stat-content">
            <div class="stat-icon total-generation">
              <el-icon :size="32"><Lightning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatPower(totalGeneration) }}</div>
              <div class="stat-label">总发电量 (MW)</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" v-loading="loading">
          <div class="stat-content">
            <div class="stat-icon total-load">
              <el-icon :size="32"><House /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatPower(totalLoad) }}</div>
              <div class="stat-label">总负荷 (MW)</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" v-loading="loading">
          <div class="stat-content">
            <div class="stat-icon frequency">
              <el-icon :size="32"><Odometer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value" :class="{ danger: !frequencyNormal }">
                {{ currentData?.frequency.toFixed(2) || '--' }}
              </div>
              <div class="stat-label">系统频率 (Hz)</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" v-loading="loading">
          <div class="stat-content">
            <div class="stat-icon equipment">
              <el-icon :size="32"><Checked /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ availableRate }}%</div>
              <div class="stat-label">设备可用率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>负荷与发电趋势</span>
            </div>
          </template>
          <div ref="loadChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>电源结构</span>
          </template>
          <div ref="pieChartRef" class="chart-container small"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="bottom-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最新告警</span>
              <el-button type="primary" link size="small">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentAlarms" size="small" max-height="300" v-loading="loading">
            <el-table-column prop="level" label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="getAlarmType(row.level)" size="small">
                  {{ getAlarmLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                {{ getAlarmTypeText(row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="message" label="描述" />
            <el-table-column prop="timestamp" label="时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.timestamp) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备状态概览</span>
            </div>
          </template>
          <el-row :gutter="10">
            <el-col :span="8">
              <div class="device-stat">
                <div class="device-count running">{{ plantStats.running }}</div>
                <div class="device-label">运行中</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="device-stat">
                <div class="device-count stopped">{{ plantStats.stopped }}</div>
                <div class="device-label">停运</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="device-stat">
                <div class="device-count maintenance">{{ plantStats.maintenance }}</div>
                <div class="device-label">检修中</div>
              </div>
            </el-col>
          </el-row>
          <el-divider />
          <el-table :data="plantList" size="small" max-height="200" v-loading="loading">
            <el-table-column prop="name" label="电厂名称" />
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">{{ getPlantTypeText(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="currentOutput" label="出力(MW)" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useMonitorStore } from '@/stores/monitor'
import { plantAPI, alarmAPI, loadForecastAPI } from '@/api'
import type { PowerPlant, Alarm } from '@/types'
import dayjs from 'dayjs'

const monitorStore = useMonitorStore()

const loadChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let loadChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
const loading = ref(false)
const plants = ref<PowerPlant[]>([])
const alarms = ref<Alarm[]>([])
const forecastData = ref<any[]>([])

const currentData = computed(() => monitorStore.currentData)
const recentAlarms = computed(() => alarms.value.slice(0, 5))

const totalGeneration = computed(() => {
  const runningPlants = plants.value.filter(p => p.status === 'running')
  return runningPlants.reduce((sum, p) => sum + (p.currentOutput || 0), 0)
})

const totalLoad = computed(() => {
  return currentData.value?.totalLoad || 7500
})

const frequencyNormal = computed(() => {
  const freq = currentData.value?.frequency
  return freq ? freq >= 49.5 && freq <= 50.5 : true
})

const plantList = computed(() => plants.value.slice(0, 5))

const plantStats = computed(() => {
  return {
    running: plants.value.filter(p => p.status === 'running').length,
    stopped: plants.value.filter(p => p.status === 'stopped').length,
    maintenance: plants.value.filter(p => p.status === 'maintenance').length,
    fault: plants.value.filter(p => p.status === 'fault').length
  }
})

const availableRate = computed(() => {
  const total = plants.value.length
  if (total === 0) return 0
  return Math.round(plantStats.value.running / total * 100)
})

async function loadData() {
  loading.value = true
  try {
    const [plantsRes, alarmsRes, forecastRes] = await Promise.all([
      plantAPI.list(),
      alarmAPI.list(),
      loadForecastAPI.list(24)
    ])
    plants.value = plantsRes as PowerPlant[]
    alarms.value = alarmsRes as Alarm[]
    forecastData.value = forecastRes as any[]
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function formatPower(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K'
  }
  return value.toString()
}

function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

function getPlantTypeText(type: PowerPlant['type']): string {
  const map: Record<string, string> = {
    thermal: '火电',
    hydro: '水电',
    nuclear: '核电',
    wind: '风电',
    solar: '光伏'
  }
  return map[type] || type
}

function getStatusType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, any> = {
    running: 'success',
    stopped: 'info',
    maintenance: 'warning',
    fault: 'danger',
    normal: 'success',
    warning: 'warning'
  }
  return map[status] || 'info'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    running: '运行',
    stopped: '停运',
    maintenance: '检修',
    fault: '故障',
    normal: '正常',
    warning: '告警'
  }
  return map[status] || status
}

function getAlarmType(level: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    warning: 'warning',
    danger: 'danger',
    critical: 'danger'
  }
  return map[level] || 'info'
}

function getAlarmLevelText(level: string): string {
  const map: Record<string, string> = {
    warning: '警告',
    danger: '危险',
    critical: '紧急'
  }
  return map[level] || level
}

function getAlarmTypeText(type: string): string {
  const map: Record<string, string> = {
    frequency: '频率',
    voltage: '电压',
    flow: '潮流',
    equipment: '设备'
  }
  return map[type] || type
}

function initLoadChart() {
  if (!loadChartRef.value) return
  loadChart = echarts.init(loadChartRef.value)
  
  const hours = forecastData.value.map(f => dayjs(f.timestamp).format('H:00'))
  const forecastLoad = forecastData.value.map(f => f.forecastLoad)
  const actualLoad = forecastLoad.map(v => Math.round(v * (0.95 + Math.random() * 0.1)))

  loadChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['预测负荷', '实际出力']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours
    },
    yAxis: {
      type: 'value',
      name: 'MW'
    },
    series: [
      {
        name: '预测负荷',
        type: 'line',
        smooth: true,
        data: forecastLoad,
        lineStyle: { type: 'dashed' },
        itemStyle: { color: '#909399' }
      },
      {
        name: '实际出力',
        type: 'line',
        smooth: true,
        data: actualLoad,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        itemStyle: { color: '#409eff' }
      }
    ]
  })
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  
  const typeData = [
    { value: plants.value.filter(p => p.type === 'thermal').reduce((s, p) => s + p.capacity, 0), name: '火电' },
    { value: plants.value.filter(p => p.type === 'hydro').reduce((s, p) => s + p.capacity, 0), name: '水电' },
    { value: plants.value.filter(p => p.type === 'nuclear').reduce((s, p) => s + p.capacity, 0), name: '核电' },
    { value: plants.value.filter(p => p.type === 'wind').reduce((s, p) => s + p.capacity, 0), name: '风电' },
    { value: plants.value.filter(p => p.type === 'solar').reduce((s, p) => s + p.capacity, 0), name: '光伏' }
  ].filter(d => d.value > 0)

  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} MW ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        name: '装机容量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: typeData,
        color: ['#f56c6c', '#67c23a', '#409eff', '#e6a23c', '#ffd700']
      }
    ]
  })
}

function handleResize() {
  loadChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  await loadData()
  setTimeout(() => {
    initLoadChart()
    initPieChart()
    window.addEventListener('resize', handleResize)
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  loadChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row {
  margin-bottom: 0;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.total-generation {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.total-load {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.frequency {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.equipment {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-value.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.charts-row {
  margin-bottom: 0;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.chart-container.small {
  height: 280px;
}

.bottom-row {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-stat {
  text-align: center;
  padding: 10px 0;
}

.device-count {
  font-size: 28px;
  font-weight: bold;
}

.device-count.running {
  color: #67c23a;
}

.device-count.stopped {
  color: #909399;
}

.device-count.maintenance {
  color: #e6a23c;
}

.device-label {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
</style>
