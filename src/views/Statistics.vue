<template>
  <div class="statistics">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>统计查询</span>
              <div class="header-actions">
                <el-select v-model="selectedRegion" size="small" placeholder="选择区域" style="width: 120px">
                  <el-option label="全网" value="全网" />
                  <el-option label="东区" value="东区" />
                  <el-option label="西区" value="西区" />
                  <el-option label="南区" value="南区" />
                  <el-option label="北区" value="北区" />
                </el-select>
                <el-date-picker
                  v-model="dateRange"
                  type="month"
                  range-separator="至"
                  start-placeholder="开始月份"
                  end-placeholder="结束月份"
                  format="YYYY-MM"
                  value-format="YYYY-MM-DD"
                  size="small"
                />
                <el-button type="primary" size="small" @click="queryStatistics" :loading="loading">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button type="success" size="small" @click="exportPDF">
                  <el-icon><Download /></el-icon>
                  导出PDF月报
                </el-button>
              </div>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-box">
                <div class="stat-label">总发电量</div>
                <div class="stat-value">{{ formatPower(statsData.totalGeneration) }} MWh</div>
                <div class="stat-trend up">
                  <el-icon><Top /></el-icon>
                  同比增长 5.2%
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-box">
                <div class="stat-label">线损率</div>
                <div class="stat-value">{{ statsData.lineLossRate }}%</div>
                <div class="stat-trend down">
                  <el-icon><Bottom /></el-icon>
                  同比下降 0.3%
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-box">
                <div class="stat-label">设备可用率</div>
                <div class="stat-value">{{ statsData.equipmentAvailability }}%</div>
                <div class="stat-trend up">
                  <el-icon><Top /></el-icon>
                  同比提升 1.2%
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-box">
                <div class="stat-label">事故次数</div>
                <div class="stat-value">{{ statsData.accidentCount }} 次</div>
                <div class="stat-trend down">
                  <el-icon><Bottom /></el-icon>
                  同比减少 2 次
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>发电量趋势</span>
          </template>
          <div ref="generationChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>区域发电量对比</span>
          </template>
          <div ref="regionChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>线损率趋势</span>
          </template>
          <div ref="lossChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>设备类型统计</span>
          </template>
          <div ref="equipmentChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>详细统计数据</span>
            </div>
          </template>
          <el-table :data="detailTableData" size="small" border v-loading="loading">
            <el-table-column prop="region" label="区域" width="100" />
            <el-table-column prop="totalGeneration" label="发电量(MWh)" width="140" sortable />
            <el-table-column prop="totalConsumption" label="供电量(MWh)" width="140" sortable />
            <el-table-column prop="lineLossRate" label="线损率(%)" width="110" sortable>
              <template #default="{ row }">
                <span :class="{ high: row.lineLossRate > 5 }">{{ row.lineLossRate }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="equipmentAvailability" label="设备可用率(%)" width="130" sortable />
            <el-table-column prop="faultCount" label="故障次数" width="100" sortable />
            <el-table-column prop="accidentCount" label="事故次数" width="100" sortable />
            <el-table-column prop="peakLoad" label="峰值负荷(MW)" width="130" sortable />
            <el-table-column prop="valleyLoad" label="谷值负荷(MW)" width="130" sortable />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { statisticsAPI, plantAPI } from '@/api'
import type { StatisticsData, PowerPlant } from '@/types'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const loading = ref(false)
const selectedRegion = ref('全网')
const dateRange = ref<string[]>([
  dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
])

const statsData = reactive<StatisticsData>({
  region: '全网',
  startTime: '',
  endTime: '',
  totalGeneration: 0,
  totalConsumption: 0,
  lineLossRate: 0,
  equipmentAvailability: 0,
  faultCount: 0,
  accidentCount: 0,
  peakLoad: 0,
  valleyLoad: 0
})

const generationChartRef = ref<HTMLElement>()
const regionChartRef = ref<HTMLElement>()
const lossChartRef = ref<HTMLElement>()
const equipmentChartRef = ref<HTMLElement>()

let generationChart: echarts.ECharts | null = null
let regionChart: echarts.ECharts | null = null
let lossChart: echarts.ECharts | null = null
let equipmentChart: echarts.ECharts | null = null

const regions = ['东区', '西区', '南区', '北区']
const detailTableData = ref<any[]>([])
const plants = ref<PowerPlant[]>([])

function formatPower(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toString()
}

async function queryStatistics() {
  loading.value = true
  try {
    const startTime = dateRange.value[0] || dayjs().subtract(1, 'month').format('YYYY-MM-DD')
    const endTime = dateRange.value[1] || dayjs().format('YYYY-MM-DD')
    
    const [statsRes, plantsRes] = await Promise.all([
      statisticsAPI.get({ region: selectedRegion.value, startTime, endTime }),
      plantAPI.list()
    ])
    
    Object.assign(statsData, statsRes)
    plants.value = plantsRes as PowerPlant[]
    
    const regionResults = await Promise.all(
      regions.map(region => 
        statisticsAPI.get({ region, startTime, endTime })
      )
    )
    detailTableData.value = regionResults
    
    nextTick(() => {
      initCharts()
    })
    
    ElMessage.success('统计数据已更新')
  } catch (e) {
    console.error('查询统计数据失败', e)
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

function initCharts() {
  initGenerationChart()
  initRegionChart()
  initLossChart()
  initEquipmentChart()
}

function initGenerationChart() {
  if (!generationChartRef.value) return
  if (!generationChart) {
    generationChart = echarts.init(generationChartRef.value)
  }

  const months = []
  const data1 = []
  const data2 = []
  for (let i = 5; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
    data1.push(Math.round(800000 + Math.random() * 200000))
    data2.push(Math.round(760000 + Math.random() * 190000))
  }

  generationChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['发电量', '供电量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: 'MWh' },
    series: [
      { name: '发电量', type: 'bar', data: data1, itemStyle: { color: '#409eff' } },
      { name: '供电量', type: 'bar', data: data2, itemStyle: { color: '#67c23a' } }
    ]
  })
}

function initRegionChart() {
  if (!regionChartRef.value) return
  if (!regionChart) {
    regionChart = echarts.init(regionChartRef.value)
  }

  const regionData = detailTableData.value.map(r => ({
    name: r.region,
    value: r.totalGeneration
  }))

  regionChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} MWh ({d}%)'
    },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      name: '区域发电量',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: regionData,
      color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c']
    }]
  })
}

function initLossChart() {
  if (!lossChartRef.value) return
  if (!lossChart) {
    lossChart = echarts.init(lossChartRef.value)
  }

  const months = []
  const lossRates = []
  for (let i = 11; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('MM月'))
    lossRates.push((4 + Math.random() * 2).toFixed(1))
  }

  lossChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { 
      type: 'value', 
      name: '%',
      min: 3,
      max: 7
    },
    series: [{
      name: '线损率',
      type: 'line',
      smooth: true,
      data: lossRates,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
          { offset: 1, color: 'rgba(245, 108, 108, 0.05)' }
        ])
      },
      itemStyle: { color: '#f56c6c' },
      markLine: {
        silent: true,
        data: [{ yAxis: 5, lineStyle: { color: '#e6a23c', type: 'dashed' } }]
      }
    }]
  })
}

function initEquipmentChart() {
  if (!equipmentChartRef.value) return
  if (!equipmentChart) {
    equipmentChart = echarts.init(equipmentChartRef.value)
  }

  const typeData = [
    { value: plants.value.filter(p => p.type === 'thermal').length, name: '火电' },
    { value: plants.value.filter(p => p.type === 'hydro').length, name: '水电' },
    { value: plants.value.filter(p => p.type === 'nuclear').length, name: '核电' },
    { value: plants.value.filter(p => p.type === 'wind').length, name: '风电' },
    { value: plants.value.filter(p => p.type === 'solar').length, name: '光伏' }
  ].filter(d => d.value > 0)

  equipmentChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 台 ({d}%)' },
    series: [{
      type: 'pie',
      radius: '65%',
      data: typeData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: { formatter: '{b}\n{d}%' },
      color: ['#f56c6c', '#67c23a', '#409eff', '#e6a23c', '#ffd700']
    }]
  })
}

function exportPDF() {
  const doc = new jsPDF()
  const month = dayjs(dateRange.value[1] || dayjs().format('YYYY-MM-DD')).format('YYYY年MM月')
  
  doc.setFontSize(20)
  doc.text('电网运行月度报告', 105, 25, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`报告周期: ${month}`, 105, 35, { align: 'center' })
  
  doc.setFontSize(14)
  doc.text('一、主要运行指标', 14, 50)
  
  const summaryData = [
    ['指标', '数值', '同比变化'],
    ['总发电量', `${formatPower(statsData.totalGeneration)} MWh`, '+5.2%'],
    ['线损率', `${statsData.lineLossRate}%`, '-0.3%'],
    ['设备可用率', `${statsData.equipmentAvailability}%`, '+1.2%'],
    ['事故次数', `${statsData.accidentCount} 次`, '-2 次']
  ]
  
  autoTable(doc, {
    startY: 60,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [64, 158, 255] }
  })

  const pageHeight = doc.internal.pageSize.getHeight()
  
  doc.setFontSize(14)
  const yPos = (doc as any).lastAutoTable.finalY + 20
  doc.text('二、区域统计详情', 14, yPos)
  
  const regionDetail = detailTableData.value.map(d => [
    d.region,
    formatPower(d.totalGeneration),
    formatPower(d.totalConsumption),
    `${d.lineLossRate}%`,
    `${d.equipmentAvailability}%`,
    `${d.faultCount}`,
    `${d.accidentCount}`
  ])
  
  autoTable(doc, {
    startY: yPos + 10,
    head: [['区域', '发电量(MWh)', '供电量(MWh)', '线损率', '可用率', '故障', '事故']],
    body: regionDetail,
    theme: 'grid',
    headStyles: { fillColor: [64, 158, 255], fontSize: 10 },
    bodyStyles: { fontSize: 9 }
  })

  doc.setFontSize(10)
  doc.text('报告生成时间: ' + dayjs().format('YYYY-MM-DD HH:mm:ss'), 14, pageHeight - 20)
  doc.text('第 1 页 / 共 1 页', 180, pageHeight - 20, { align: 'right' })

  doc.save(`电网运行报告_${dayjs().format('YYYYMM')}.pdf`)
  ElMessage.success('PDF报告导出成功')
}

function handleResize() {
  generationChart?.resize()
  regionChart?.resize()
  lossChart?.resize()
  equipmentChart?.resize()
}

onMounted(() => {
  queryStatistics()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.statistics {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stat-box {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

.row-mt {
  margin-top: 0;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.high {
  color: #f56c6c;
  font-weight: bold;
}
</style>
