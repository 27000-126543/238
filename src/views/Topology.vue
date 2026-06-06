<template>
  <div class="topology">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card class="topology-card">
          <template #header>
            <div class="card-header">
              <span>电网拓扑图</span>
              <div class="header-actions">
                <el-radio-group v-model="viewMode" size="small">
                  <el-radio-button value="voltage">电压分布</el-radio-button>
                  <el-radio-button value="load">负载热力</el-radio-button>
                </el-radio-group>
                <el-button size="small" @click="refreshTopology">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          <div ref="topologyChartRef" class="topology-container"></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>节点详情</span>
          </template>
          <div v-if="selectedNode" class="node-detail">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="名称">
                {{ selectedNode.name }}
              </el-descriptions-item>
              <el-descriptions-item label="类型">
                <el-tag :type="selectedNode.type === 'plant' ? 'primary' : 'success'" size="small">
                  {{ selectedNode.type === 'plant' ? '发电厂' : '变电站' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="电压">
                <span :style="{ color: getVoltageColor(selectedNode.voltage) }">
                  {{ selectedNode.voltage.toFixed(1) }} kV
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="负载率">
                <el-progress 
                  :percentage="Math.round(selectedNode.load)" 
                  :color="getLoadRateColor(selectedNode.load)"
                />
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(selectedNode.status)" size="small">
                  {{ getStatusText(selectedNode.status) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
          <el-empty v-else description="点击拓扑图节点查看详情" :image-size="100" />
        </el-card>

        <el-card class="legend-card">
          <template #header>
            <span>图例说明</span>
          </template>
          <div class="legend-list">
            <div class="legend-item" v-if="viewMode === 'load'">
              <div class="legend-title">线路负载率</div>
              <div class="legend-gradient"></div>
              <div class="legend-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div class="legend-item" v-if="viewMode === 'voltage'">
              <div class="legend-title">节点电压</div>
              <div class="legend-gradient voltage"></div>
              <div class="legend-labels">
                <span>偏低</span>
                <span>正常</span>
                <span>偏高</span>
              </div>
            </div>
            <el-divider />
            <div class="legend-item">
              <div class="legend-title">节点类型</div>
              <div class="legend-items">
                <div class="legend-item-inline">
                  <span class="node-dot plant"></span>
                  <span>发电厂</span>
                </div>
                <div class="legend-item-inline">
                  <span class="node-dot substation"></span>
                  <span>变电站</span>
                </div>
              </div>
            </div>
            <el-divider />
            <div class="legend-item">
              <div class="legend-title">节点状态</div>
              <div class="legend-items">
                <div class="legend-item-inline">
                  <span class="status-dot running"></span>
                  <span>运行/正常</span>
                </div>
                <div class="legend-item-inline">
                  <span class="status-dot warning"></span>
                  <span>告警</span>
                </div>
                <div class="legend-item-inline">
                  <span class="status-dot maintenance"></span>
                  <span>检修</span>
                </div>
                <div class="legend-item-inline">
                  <span class="status-dot fault"></span>
                  <span>故障</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>线路负载列表</span>
          </template>
          <el-table :data="linkData" size="small" border>
            <el-table-column prop="name" label="线路名称" min-width="150" />
            <el-table-column prop="source" label="起点" min-width="150">
              <template #default="{ row }">{{ getNodeName(row.source) }}</template>
            </el-table-column>
            <el-table-column prop="target" label="终点" min-width="150">
              <template #default="{ row }">{{ getNodeName(row.target) }}</template>
            </el-table-column>
            <el-table-column prop="flow" label="潮流(MW)" width="120" sortable />
            <el-table-column prop="maxCapacity" label="容量(MW)" width="120" />
            <el-table-column label="负载率" min-width="200">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round(row.loadRate)" 
                  :color="getLoadRateColor(row.loadRate)"
                  :stroke-width="12"
                />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useDB } from '@/database'
import type { TopologyNode, TopologyLink } from '@/types'

const db = useDB()
const topologyChartRef = ref<HTMLElement>()
let topologyChart: echarts.ECharts | null = null

const viewMode = ref<'voltage' | 'load'>('load')
const selectedNode = ref<TopologyNode | null>(null)

const topology = computed(() => db.getTopology())
const nodeData = computed(() => topology.value.nodes)
const linkData = computed(() => topology.value.links)

function getNodeName(id: string): string {
  const node = nodeData.value.find(n => n.id === id)
  return node?.name || id
}

function getStatusType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, any> = {
    running: 'success',
    normal: 'success',
    stopped: 'info',
    maintenance: 'warning',
    fault: 'danger',
    warning: 'warning'
  }
  return map[status] || 'info'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    running: '运行',
    normal: '正常',
    stopped: '停运',
    maintenance: '检修',
    fault: '故障',
    warning: '告警'
  }
  return map[status] || status
}

function getLoadRateColor(rate: number): string {
  if (rate >= 95) return '#f56c6c'
  if (rate >= 80) return '#e6a23c'
  if (rate >= 50) return '#409eff'
  return '#67c23a'
}

function getVoltageColor(voltage: number): string {
  const rated = 220
  const deviation = (voltage - rated) / rated * 100
  if (Math.abs(deviation) > 8) return '#f56c6c'
  if (Math.abs(deviation) > 5) return '#e6a23c'
  return '#67c23a'
}

function getLinkColor(link: TopologyLink): string {
  if (viewMode.value === 'load') {
    return getLoadRateColor(link.loadRate)
  }
  return '#909399'
}

function getNodeColor(node: TopologyNode): string {
  if (viewMode.value === 'voltage') {
    const deviation = Math.abs((node.voltage - 220) / 220 * 100)
    if (deviation > 8) return '#f56c6c'
    if (deviation > 5) return '#e6a23c'
    return '#67c23a'
  }
  return node.type === 'plant' ? '#409eff' : '#67c23a'
}

function initTopologyChart() {
  if (!topologyChartRef.value) return
  topologyChart = echarts.init(topologyChartRef.value)
  
  topologyChart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const node = nodeData.value.find(n => n.id === params.data.id)
      if (node) {
        selectedNode.value = node
      }
    }
  })

  updateTopologyChart()
}

function updateTopologyChart() {
  if (!topologyChart) return

  const nodes = nodeData.value.map(node => ({
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    symbolSize: node.type === 'plant' ? 50 : 40,
    itemStyle: {
      color: getNodeColor(node),
      borderColor: getStatusBorderColor(node.status),
      borderWidth: 3
    },
    label: {
      show: true,
      position: 'bottom',
      fontSize: 11,
      formatter: node.name
    },
    value: viewMode.value === 'load' ? node.load : node.voltage
  }))

  const links = linkData.value.map(link => ({
    source: link.source,
    target: link.target,
    name: link.name,
    lineStyle: {
      color: getLinkColor(link),
      width: Math.max(2, link.loadRate / 20),
      curveness: 0.1
    },
    label: {
      show: true,
      formatter: `${link.loadRate.toFixed(0)}%`,
      fontSize: 10,
      backgroundColor: '#fff',
      padding: [2, 4],
      borderRadius: 4
    },
    value: link.loadRate
  }))

  topologyChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = nodeData.value.find(n => n.id === params.data.id)
          if (node) {
            return `
              <div style="padding: 8px;">
                <strong>${node.name}</strong><br/>
                类型: ${node.type === 'plant' ? '发电厂' : '变电站'}<br/>
                电压: ${node.voltage.toFixed(1)} kV<br/>
                负载率: ${node.load.toFixed(1)}%<br/>
                状态: ${getStatusText(node.status)}
              </div>
            `
          }
        } else if (params.dataType === 'edge') {
          const link = linkData.value.find(l => 
            (l.source === params.data.source && l.target === params.data.target) ||
            (l.source === params.data.target && l.target === params.data.source)
          )
          if (link) {
            return `
              <div style="padding: 8px;">
                <strong>${link.name}</strong><br/>
                潮流: ${link.flow} MW<br/>
                容量: ${link.maxCapacity} MW<br/>
                负载率: ${link.loadRate.toFixed(1)}%
              </div>
            `
          }
        }
        return ''
      }
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        data: nodes,
        links: links,
        roam: true,
        draggable: true,
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 6
          }
        }
      }
    ]
  })
}

function getStatusBorderColor(status: string): string {
  const map: Record<string, string> = {
    running: '#67c23a',
    normal: '#67c23a',
    stopped: '#909399',
    maintenance: '#e6a23c',
    fault: '#f56c6c',
    warning: '#e6a23c'
  }
  return map[status] || '#909399'
}

function refreshTopology() {
  db.generateRealTimeData()
  updateTopologyChart()
}

watch(viewMode, () => {
  updateTopologyChart()
})

function handleResize() {
  topologyChart?.resize()
}

onMounted(() => {
  setTimeout(() => {
    initTopologyChart()
    window.addEventListener('resize', handleResize)
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  topologyChart?.dispose()
})
</script>

<style scoped>
.topology {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topology-card {
  height: 600px;
}

.topology-card :deep(.el-card__body) {
  height: calc(100% - 57px);
  padding: 0;
}

.topology-container {
  width: 100%;
  height: 100%;
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

.node-detail {
  padding: 10px 0;
}

.legend-card {
  margin-top: 20px;
}

.legend-list {
  padding: 10px 0;
}

.legend-item {
  margin-bottom: 15px;
}

.legend-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.legend-gradient {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, #67c23a, #e6a23c, #f56c6c);
  margin-bottom: 4px;
}

.legend-gradient.voltage {
  background: linear-gradient(to right, #409eff, #67c23a, #e6a23c);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #909399;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.legend-item-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.node-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.node-dot.plant {
  background: #409eff;
}

.node-dot.substation {
  background: #67c23a;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.running {
  background: #67c23a;
}

.status-dot.warning {
  background: #e6a23c;
}

.status-dot.maintenance {
  background: #909399;
}

.status-dot.fault {
  background: #f56c6c;
}

.row-mt {
  margin-top: 0;
}
</style>
