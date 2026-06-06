<template>
  <div class="monitor">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="metric-card" :class="{ warning: !freqNormal, danger: freqCritical }">
          <div class="metric-icon">
            <el-icon :size="36"><Odometer /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">
              {{ monitorStore.currentData?.frequency.toFixed(3) || '--' }}
            </div>
            <div class="metric-label">系统频率 (Hz)</div>
            <div class="metric-range">正常范围: 49.5 - 50.5 Hz</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon voltage">
            <el-icon :size="36"><Lightning /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">
              {{ monitorStore.currentData?.avgVoltage.toFixed(1) || '--' }}
            </div>
            <div class="metric-label">平均电压 (kV)</div>
            <div class="metric-range">正常范围: ±5%</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon load">
            <el-icon :size="36"><Connection /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">
              {{ monitorStore.currentData?.totalOutput.toFixed(0) || '--' }}
            </div>
            <div class="metric-label">总出力 (MW)</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon alarm" :class="{ active: monitorStore.unacknowledgedAlarms.length > 0 }">
            <el-icon :size="36"><Bell /></el-icon>
            <el-badge 
              :value="monitorStore.unacknowledgedAlarms.length" 
              class="alarm-badge"
              :hidden="monitorStore.unacknowledgedAlarms.length === 0"
            />
          </div>
          <div class="metric-content">
            <div class="metric-value alarm-count">
              {{ monitorStore.alarms.length }}
            </div>
            <div class="metric-label">告警总数</div>
            <div class="metric-range">未确认: {{ monitorStore.unacknowledgedAlarms.length }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>频率与负荷趋势</span>
              <el-tag size="small" :type="monitorStore.isMonitoring ? 'success' : 'info'">
                {{ monitorStore.isMonitoring ? '监控中' : '已停止' }}
              </el-tag>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>实时告警</span>
          </template>
          <div class="alarm-list">
            <div 
              v-for="alarm in monitorStore.alarms.slice(0, 10)" 
              :key="alarm.id" 
              class="alarm-item"
              :class="[`level-${alarm.level}`, { acknowledged: alarm.acknowledged }]"
            >
              <div class="alarm-header">
                <el-tag :type="getAlarmType(alarm.level)" size="small">
                  {{ getAlarmLevelText(alarm.level) }}
                </el-tag>
                <span class="alarm-time">{{ formatTime(alarm.timestamp) }}</span>
              </div>
              <div class="alarm-message">{{ alarm.message }}</div>
              <div class="alarm-actions">
                <el-button 
                  v-if="!alarm.acknowledged" 
                  type="primary" 
                  link 
                  size="small"
                  @click="acknowledgeAlarm(alarm.id)"
                >
                  确认
                </el-button>
                <el-button 
                  v-if="alarm.acknowledged && !alarm.handled" 
                  type="success" 
                  link 
                  size="small"
                  @click="handleAlarm(alarm.id)"
                >
                  处理
                </el-button>
                <span v-if="alarm.handled" class="handled-tag">已处理</span>
              </div>
            </div>
            <el-empty v-if="monitorStore.alarms.length === 0" description="暂无告警" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>线路潮流监控</span>
          </template>
          <el-table :data="lineData" size="small" border max-height="350">
            <el-table-column prop="lineName" label="线路名称" min-width="120" />
            <el-table-column prop="flow" label="潮流(MW)" width="100" sortable />
            <el-table-column prop="maxCapacity" label="容量(MW)" width="100" />
            <el-table-column label="负载率" min-width="180">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round(row.loadRate)" 
                  :color="getLoadRateColor(row.loadRate)"
                  :stroke-width="12"
                />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.loadRate > 90 ? 'danger' : row.loadRate > 70 ? 'warning' : 'success'" size="small">
                  {{ row.loadRate > 90 ? '重载' : row.loadRate > 70 ? '中载' : '轻载' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>电厂出力监控</span>
          </template>
          <el-table :data="plantData" size="small" border max-height="350">
            <el-table-column prop="plantName" label="电厂名称" min-width="140" />
            <el-table-column prop="currentOutput" label="出力(MW)" width="100" sortable />
            <el-table-column prop="maxOutput" label="上限(MW)" width="100" />
            <el-table-column label="利用率" min-width="180">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round(row.currentOutput / row.maxOutput * 100)" 
                  :color="getUtilizationColor(row.currentOutput / row.maxOutput * 100)"
                  :stroke-width="12"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>应急预案</span>
              <el-button type="danger" size="small" @click="showEmergencyPlan">
                <el-icon><Warning /></el-icon>
                启动应急预案
              </el-button>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="emergency-card">
                <div class="emergency-icon danger">
                  <el-icon :size="32"><Scissors /></el-icon>
                </div>
                <div class="emergency-info">
                  <h4>切负荷预案</h4>
                  <p>当系统频率低于49.5Hz时自动触发</p>
                  <el-button type="danger" link size="small">查看详情</el-button>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="emergency-card">
                <div class="emergency-icon warning">
                  <el-icon :size="32"><TurnOff /></el-icon>
                </div>
                <div class="emergency-info">
                  <h4>甩负荷预案</h4>
                  <p>当线路过载超过95%时启动</p>
                  <el-button type="warning" link size="small">查看详情</el-button>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="emergency-card">
                <div class="emergency-icon info">
                  <el-icon :size="32"><Grid /></el-icon>
                </div>
                <div class="emergency-info">
                  <h4>解列预案</h4>
                  <p>当系统失步时执行电网解列</p>
                  <el-button type="primary" link size="small">查看详情</el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMonitorStore } from '@/stores/monitor'
import dayjs from 'dayjs'

const monitorStore = useMonitorStore()
const trendChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null

const freqNormal = computed(() => {
  const freq = monitorStore.currentData?.frequency
  return freq ? freq >= 49.5 && freq <= 50.5 : true
})

const freqCritical = computed(() => {
  const freq = monitorStore.currentData?.frequency
  return freq ? freq < 49 || freq > 51 : false
})

const lineData = computed(() => monitorStore.currentData?.lines || [])
const plantData = computed(() => monitorStore.currentData?.plants || [])

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

function getLoadRateColor(rate: number): string {
  if (rate >= 95) return '#f56c6c'
  if (rate >= 80) return '#e6a23c'
  if (rate >= 50) return '#409eff'
  return '#67c23a'
}

function getUtilizationColor(rate: number): string {
  if (rate >= 90) return '#67c23a'
  if (rate >= 60) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#909399'
}

function formatTime(time: string): string {
  return dayjs(time).format('HH:mm:ss')
}

function acknowledgeAlarm(id: string) {
  monitorStore.acknowledgeAlarm(id)
  ElMessage.success('告警已确认')
}

function handleAlarm(id: string) {
  monitorStore.handleAlarm(id, '值班员')
  ElMessage.success('告警已处理')
}

function showEmergencyPlan() {
  ElMessageBox.confirm(
    '确定要启动应急预案吗？这将触发切负荷或甩负荷操作。',
    '紧急操作确认',
    {
      confirmButtonText: '确认启动',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(() => {
    ElMessage.success('应急预案已启动，正在执行切负荷操作...')
  }).catch(() => {})
}

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  
  const data = monitorStore.historyData.slice(-60)
  const times = data.map(d => dayjs(d.timestamp).format('HH:mm:ss'))
  const frequencies = data.map(d => d.frequency)
  const loads = data.map(d => d.totalOutput)

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['频率', '总出力']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: false
    },
    yAxis: [
      {
        type: 'value',
        name: '频率(Hz)',
        min: 49.5,
        max: 50.5,
        position: 'left',
        axisLine: { lineStyle: { color: '#409eff' } }
      },
      {
        type: 'value',
        name: '出力(MW)',
        position: 'right',
        axisLine: { lineStyle: { color: '#67c23a' } }
      }
    ],
    series: [
      {
        name: '频率',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        data: frequencies,
        itemStyle: { color: '#409eff' },
        markLine: {
          silent: true,
          data: [
            { yAxis: 50.5, lineStyle: { color: '#f56c6c', type: 'dashed' } },
            { yAxis: 49.5, lineStyle: { color: '#f56c6c', type: 'dashed' } }
          ]
        }
      },
      {
        name: '总出力',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: loads,
        itemStyle: { color: '#67c23a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        }
      }
    ]
  })
}

watch(() => monitorStore.historyData.length, () => {
  nextTick(() => {
    updateTrendChart()
  })
})

function handleResize() {
  trendChart?.resize()
}

onMounted(() => {
  setTimeout(() => {
    initTrendChart()
    window.addEventListener('resize', handleResize)
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.monitor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metric-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.metric-card.warning {
  border-color: #e6a23c;
  box-shadow: 0 0 0 1px #e6a23c;
}

.metric-card.danger {
  border-color: #f56c6c;
  box-shadow: 0 0 0 1px #f56c6c;
  animation: pulse-border 1s infinite;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 0 1px #f56c6c; }
  50% { box-shadow: 0 0 10px 2px rgba(245, 108, 108, 0.5); }
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.metric-icon {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: relative;
}

.metric-icon.voltage {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.load {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-icon.alarm {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.metric-icon.alarm.active {
  animation: ring 2s infinite;
}

@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
}

.alarm-badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.metric-value.alarm-count {
  color: #f56c6c;
}

.metric-label {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

.metric-range {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.row-mt {
  margin-top: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.alarm-list {
  max-height: 300px;
  overflow-y: auto;
}

.alarm-item {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #f5f7fa;
  border-left: 4px solid #909399;
}

.alarm-item.level-warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.alarm-item.level-danger {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.alarm-item.level-critical {
  border-left-color: #f56c6c;
  background: #fef0f0;
  animation: alarm-flash 1s infinite;
}

@keyframes alarm-flash {
  0%, 100% { background: #fef0f0; }
  50% { background: #ffe0e0; }
}

.alarm-item.acknowledged {
  opacity: 0.7;
}

.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.alarm-time {
  font-size: 12px;
  color: #909399;
}

.alarm-message {
  font-size: 13px;
  color: #303133;
  margin-bottom: 8px;
}

.alarm-actions {
  display: flex;
  gap: 10px;
}

.handled-tag {
  font-size: 12px;
  color: #67c23a;
}

.emergency-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.emergency-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.emergency-icon.danger {
  background: linear-gradient(135deg, #f56c6c 0%, #c45656 100%);
}

.emergency-icon.warning {
  background: linear-gradient(135deg, #e6a23c 0%, #b88230 100%);
}

.emergency-icon.info {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
}

.emergency-info h4 {
  margin: 0 0 4px 0;
  color: #303133;
}

.emergency-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #909399;
}
</style>
