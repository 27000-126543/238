<template>
  <div class="topology">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card class="topology-card">
          <template #header>
            <div class="card-header">
              <span>电网拓扑图 (D3.js)</span>
              <div class="header-actions">
                <el-radio-group v-model="viewMode" size="small">
                  <el-radio-button value="voltage">电压分布</el-radio-button>
                  <el-radio-button value="load">负载热力</el-radio-button>
                </el-radio-group>
                <el-space>
                  <el-button size="small" @click="zoomIn">
                    <el-icon><ZoomIn /></el-icon>
                  </el-button>
                  <el-button size="small" @click="zoomOut">
                    <el-icon><ZoomOut /></el-icon>
                  </el-button>
                  <el-button size="small" @click="resetZoom">
                    <el-icon><Refresh /></el-icon>
                    重置
                  </el-button>
                  <el-button size="small" @click="refreshData">
                    <el-icon><RefreshRight /></el-icon>
                    刷新数据
                  </el-button>
                </el-space>
              </div>
            </div>
          </template>
          <div ref="topologyContainer" class="topology-container">
            <svg ref="svgRef" class="topology-svg"></svg>
            <div class="zoom-info">缩放: {{ zoomScale.toFixed(1) }}x</div>
          </div>
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
              <el-descriptions-item label="坐标">
                ({{ selectedNode.x?.toFixed(0) }}, {{ selectedNode.y?.toFixed(0) }})
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
              <div class="legend-title">线路负载率热力</div>
              <div class="legend-gradient load-gradient"></div>
              <div class="legend-labels">
                <span>0% (轻载)</span>
                <span>50%</span>
                <span>100% (重载)</span>
              </div>
            </div>
            <div class="legend-item" v-if="viewMode === 'voltage'">
              <div class="legend-title">节点电压状态</div>
              <div class="legend-gradient voltage-gradient"></div>
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
              <div class="legend-title">操作说明</div>
              <ul class="instructions">
                <li>拖拽节点可移动位置</li>
                <li>滚轮缩放视图</li>
                <li>空白处拖拽平移</li>
                <li>点击节点查看详情</li>
              </ul>
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
            <el-table-column prop="sourceName" label="起点" min-width="150" />
            <el-table-column prop="targetName" label="终点" min-width="150" />
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
import * as d3 from 'd3'
import { ElMessage } from 'element-plus'
import { topologyAPI, realtimeAPI } from '@/api'
import type { TopologyNode, TopologyLink } from '@/types'

const topologyContainer = ref<HTMLElement>()
const svgRef = ref<SVGSVGElement>()

const viewMode = ref<'voltage' | 'load'>('load')
const selectedNode = ref<any>(null)
const zoomScale = ref(1)

const nodes = ref<TopologyNode[]>([])
const links = ref<(TopologyLink & { sourceName?: string; targetName?: string })[]>([])
const linkData = computed(() => links.value)

let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let simulation: d3.Simulation<any, any> | null = null

async function loadData() {
  try {
    const data: any = await topologyAPI.get()
    nodes.value = data.nodes
    links.value = data.links.map((l: any) => ({
      ...l,
      sourceName: getNodeName(l.source),
      targetName: getNodeName(l.target)
    }))
    nextTick(() => {
      renderGraph()
    })
  } catch (e) {
    ElMessage.error('加载拓扑数据失败')
  }
}

async function refreshData() {
  try {
    const realtime: any = await realtimeAPI.getData()
    if (realtime.lines) {
      links.value = links.value.map(link => {
        const lineData = realtime.lines.find((l: any) => l.lineId === link.id)
        if (lineData) {
          return {
            ...link,
            flow: lineData.flow,
            loadRate: lineData.loadRate
          }
        }
        return link
      })
    }
    renderGraph()
    ElMessage.success('数据已刷新')
  } catch (e) {}
}

function getNodeName(id: string): string {
  const node = nodes.value.find(n => n.id === id)
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
  const deviation = Math.abs((voltage - rated) / rated * 100)
  if (deviation > 8) return '#f56c6c'
  if (deviation > 5) return '#e6a23c'
  return '#67c23a'
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

function getLinkColor(link: TopologyLink): string {
  if (viewMode.value === 'load') {
    return getLoadRateColor(link.loadRate)
  }
  return '#909399'
}

function renderGraph() {
  if (!svgRef.value || !topologyContainer.value) return

  const width = topologyContainer.value.clientWidth
  const height = topologyContainer.value.clientHeight

  d3.select(svgRef.value).selectAll('*').remove()

  svg = d3.select(svgRef.value)
    .attr('width', width)
    .attr('height', height)

  const defs = svg.append('defs')
  const gradient = defs.append('linearGradient')
    .attr('id', 'loadGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%')
  
  gradient.append('stop').attr('offset', '0%').attr('stop-color', '#67c23a')
  gradient.append('stop').attr('offset', '50%').attr('stop-color', '#e6a23c')
  gradient.append('stop').attr('offset', '100%').attr('stop-color', '#f56c6c')

  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      zoomScale.value = event.transform.k
      g?.attr('transform', event.transform)
    })

  svg.call(zoomBehavior)

  g = svg.append('g')

  const arrowMarker = defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 25)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
  
  arrowMarker.append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#909399')

  const linkGroup = g.append('g').attr('class', 'links')
  const nodeGroup = g.append('g').attr('class', 'nodes')
  const labelGroup = g.append('g').attr('class', 'labels')

  const linkElements = linkGroup.selectAll('line')
    .data(links.value)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', d => getLinkColor(d as any))
    .attr('stroke-width', d => Math.max(2, (d as any).loadRate / 15))
    .attr('stroke-opacity', 0.8)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke-width', Math.max(4, (d as any).loadRate / 10))
        .attr('stroke-opacity', 1)
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke-width', Math.max(2, (d as any).loadRate / 15))
        .attr('stroke-opacity', 0.8)
    })

  const linkLabels = linkGroup.selectAll('.link-label')
    .data(links.value)
    .enter()
    .append('g')
    .attr('class', 'link-label')

  linkLabels.append('rect')
    .attr('rx', 3)
    .attr('ry', 3)
    .attr('fill', 'white')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 1)

  linkLabels.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#333')
    .text(d => `${(d as any).loadRate.toFixed(0)}%`)

  const nodeElements = nodeGroup.selectAll('circle')
    .data(nodes.value)
    .enter()
    .append('circle')
    .attr('class', 'node')
    .attr('r', d => d.type === 'plant' ? 25 : 20)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('fill', d => getNodeColor(d))
    .attr('stroke', d => getStatusBorderColor(d.status))
    .attr('stroke-width', 3)
    .attr('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', (d as any).type === 'plant' ? 30 : 25)
      showTooltip(event, d)
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('r', (d as any).type === 'plant' ? 25 : 20)
      hideTooltip()
    })
    .on('click', function(event, d) {
      selectedNode.value = d
    })
    .call(d3.drag<SVGCircleElement, TopologyNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    )

  const nodeLabels = labelGroup.selectAll('text.node-label')
    .data(nodes.value)
    .enter()
    .append('text')
    .attr('class', 'node-label')
    .attr('x', d => d.x)
    .attr('y', d => (d.y ?? 0) + (d.type === 'plant' ? 40 : 35))
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('fill', '#333')
    .attr('pointer-events', 'none')
    .text(d => d.name)

  simulation = d3.forceSimulation(nodes.value)
    .force('link', d3.forceLink(links.value).id((d: any) => d.id).distance(150).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))
    .on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      linkLabels
        .attr('transform', (d: any) => {
          const x = (d.source.x + d.target.x) / 2
          const y = (d.source.y + d.target.y) / 2
          return `translate(${x}, ${y})`
        })
        .each(function(d: any) {
          const text = d3.select(this).select('text')
          const rect = d3.select(this).select('rect')
          const bbox = (text.node() as SVGTextElement)?.getBBox()
          if (bbox) {
            rect
              .attr('x', -bbox.width / 2 - 4)
              .attr('y', -bbox.height / 2 - 2)
              .attr('width', bbox.width + 8)
              .attr('height', bbox.height + 4)
          }
        })

      nodeElements
        .attr('cx', d => d.x ?? 0)
        .attr('cy', d => d.y ?? 0)

      nodeLabels
        .attr('x', d => d.x ?? 0)
        .attr('y', d => (d.y ?? 0) + (d.type === 'plant' ? 40 : 35))
    })

  setTimeout(() => {
    simulation?.alphaTarget(0).stop()
  }, 3000)
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

function showTooltip(event: MouseEvent, d: any) {
  let tooltip = d3.select('.d3-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', 'white')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
  }

  tooltip.html(`
    <div style="font-weight: bold; margin-bottom: 6px;">${d.name}</div>
    <div>类型: ${d.type === 'plant' ? '发电厂' : '变电站'}</div>
    <div>电压: ${d.voltage?.toFixed(1)} kV</div>
    <div>负载率: ${d.load?.toFixed(1)}%</div>
    <div>状态: ${getStatusText(d.status)}</div>
  `)

  tooltip
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 10) + 'px')
    .style('opacity', 1)
}

function hideTooltip() {
  d3.select('.d3-tooltip').style('opacity', 0)
}

function zoomIn() {
  svg?.transition().duration(300).call(zoomBehavior?.scaleBy as any, 1.3)
}

function zoomOut() {
  svg?.transition().duration(300).call(zoomBehavior?.scaleBy as any, 0.7)
}

function resetZoom() {
  svg?.transition().duration(300).call(zoomBehavior?.transform as any, d3.zoomIdentity)
}

watch(viewMode, () => {
  renderGraph()
})

function handleResize() {
  if (topologyContainer.value && svgRef.value) {
    const width = topologyContainer.value.clientWidth
    const height = topologyContainer.value.clientHeight
    d3.select(svgRef.value)
      .attr('width', width)
      .attr('height', height)
  }
}

onMounted(async () => {
  await loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  simulation?.stop()
  d3.select('.d3-tooltip').remove()
})
</script>

<style scoped>
.topology {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topology-card {
  height: 650px;
}

.topology-card :deep(.el-card__body) {
  height: calc(100% - 57px);
  padding: 0;
}

.topology-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

.topology-svg {
  display: block;
}

.zoom-info {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
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
  height: 14px;
  border-radius: 7px;
  margin-bottom: 4px;
}

.load-gradient {
  background: linear-gradient(to right, #67c23a, #e6a23c, #f56c6c);
}

.voltage-gradient {
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.node-dot.plant {
  background: #409eff;
}

.node-dot.substation {
  background: #67c23a;
}

.instructions {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
}

.row-mt {
  margin-top: 0;
}

:deep(.link) {
  transition: all 0.2s ease;
}

:deep(.node) {
  transition: r 0.2s ease;
}
</style>
