<template>
  <div class="dispatch">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>调度方案生成</span>
              <div class="header-actions">
                <el-button type="primary" @click="generateScheme">
                  <el-icon><MagicStick /></el-icon>
                  生成24小时调度方案
                </el-button>
                <el-button @click="resetScheme">
                  <el-icon><Refresh /></el-icon>
                  重置
                </el-button>
              </div>
            </div>
          </template>

          <el-row :gutter="20" v-if="currentScheme">
            <el-col :span="6">
              <el-statistic title="方案名称" :value="currentScheme.name" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总发电成本(元)" :value="currentResult?.totalCost || 0" />
            </el-col>
            <el-col :span="4">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="N-1校验">
                  <el-tag :type="currentScheme.n1CheckPassed ? 'success' : 'danger'">
                    {{ currentScheme.n1CheckPassed ? '通过' : '不通过' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
            <el-col :span="4">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="爬坡校验">
                  <el-tag :type="currentScheme.rampCheckPassed ? 'success' : 'danger'">
                    {{ currentScheme.rampCheckPassed ? '通过' : '不通过' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
            <el-col :span="4">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusType(currentScheme.status)">
                    {{ getStatusText(currentScheme.status) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>

          <el-empty v-else description="点击上方按钮生成调度方案" :image-size="120">
            <el-button type="primary" @click="generateScheme">立即生成</el-button>
          </el-empty>

          <div v-if="currentResult" class="chart-wrapper">
            <div ref="dispatchChartRef" class="chart-container"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>出力计划详情</span>
              <el-tag type="info">共 {{ currentResult?.plans.length || 0 }} 条记录</el-tag>
            </div>
          </template>
          <el-table :data="planTableData" size="small" border max-height="400">
            <el-table-column prop="hour" label="时段" width="80" align="center">
              <template #default="{ row }">{{ row.hour }}:00</template>
            </el-table-column>
            <el-table-column prop="plantName" label="电厂" min-width="140" />
            <el-table-column prop="targetOutput" label="目标出力(MW)" width="120" align="right" sortable />
            <el-table-column prop="rampUp" label="上爬坡(MW)" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.rampUp > 0" style="color: #67c23a">+{{ row.rampUp }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="rampDown" label="下爬坡(MW)" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.rampDown > 0" style="color: #f56c6c">-{{ row.rampDown }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>方案审批</span>
            </div>
          </template>
          
          <el-form label-width="100px">
            <el-form-item label="方案名称">
              <el-input v-model="schemeName" placeholder="请输入方案名称" />
            </el-form-item>
            <el-form-item label="创建人">
              <el-input v-model="createdBy" placeholder="请输入创建人" />
            </el-form-item>
            <el-form-item>
              <el-space wrap>
                <el-button 
                  type="primary" 
                  @click="submitForApproval"
                  :disabled="!currentScheme || currentScheme.status !== 'draft'"
                >
                  提交审批
                </el-button>
                <el-button 
                  type="success" 
                  @click="approveScheme"
                  :disabled="!currentScheme || currentScheme.status !== 'pending_approval'"
                >
                  <el-icon><Check /></el-icon>
                  审批通过
                </el-button>
                <el-button 
                  type="danger" 
                  @click="rejectScheme"
                  :disabled="!currentScheme || currentScheme.status !== 'pending_approval'"
                >
                  <el-icon><Close /></el-icon>
                  驳回
                </el-button>
              </el-space>
            </el-form-item>
          </el-form>

          <el-divider />

          <div class="instruction-section">
            <h4>指令推送</h4>
            <el-form label-width="100px">
              <el-form-item label="目标厂站">
                <el-select v-model="targetStation" placeholder="请选择目标厂站" style="width: 100%">
                  <el-option-group label="发电厂">
                    <el-option
                      v-for="plant in plants"
                      :key="plant.id"
                      :label="plant.name"
                      :value="plant.id"
                    />
                  </el-option-group>
                  <el-option-group label="变电站">
                    <el-option
                      v-for="sub in substations"
                      :key="sub.id"
                      :label="sub.name"
                      :value="sub.id"
                    />
                  </el-option-group>
                </el-select>
              </el-form-item>
              <el-form-item label="指令内容">
                <el-input 
                  v-model="instructionContent" 
                  type="textarea" 
                  :rows="3"
                  placeholder="请输入调度指令内容"
                />
              </el-form-item>
              <el-form-item>
                <el-button 
                  type="warning" 
                  @click="sendInstruction"
                  :disabled="!currentScheme || currentScheme.status !== 'approved' || !targetStation"
                >
                  <el-icon><Promotion /></el-icon>
                  推送指令
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="row-mt">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>历史调度方案</span>
            </div>
          </template>
          <el-table :data="schemeHistory" size="small" border>
            <el-table-column prop="name" label="方案名称" min-width="180" />
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="结束时间" width="160" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdBy" label="创建人" width="100" />
            <el-table-column prop="approvedBy" label="审批人" width="100" />
            <el-table-column prop="n1CheckPassed" label="N-1校验" width="100">
              <template #default="{ row }">
                <el-icon :color="row.n1CheckPassed ? '#67c23a' : '#f56c6c'">
                  <component :is="row.n1CheckPassed ? 'Check' : 'Close'" />
                </el-icon>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewScheme(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="instructionDialogVisible" title="调度指令确认" width="600px">
      <el-table :data="instructions" size="small" border>
        <el-table-column prop="content" label="指令内容" min-width="200" />
        <el-table-column prop="targetStation" label="目标厂站" width="150">
          <template #default="{ row }">
            {{ getStationName(row.targetStation) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getInstructionStatusType(row.status)" size="small">
              {{ getInstructionStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sentAt" label="发送时间" width="160" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'sent'"
              type="success" 
              link 
              size="small"
              @click="confirmInstruction(row)"
            >
              值班员确认
            </el-button>
            <el-button 
              v-if="row.status === 'sent'"
              type="warning" 
              link 
              size="small"
              @click="requestAdjust(row)"
            >
              申请调整
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useDB } from '@/database'
import { generateDispatchScheme, type DispatchResult } from '@/utils/dispatch'
import type { DispatchScheme, DispatchInstruction } from '@/types'
import dayjs from 'dayjs'

const db = useDB()
const dispatchChartRef = ref<HTMLElement>()
let dispatchChart: echarts.ECharts | null = null

const currentResult = ref<DispatchResult | null>(null)
const currentScheme = ref<DispatchScheme | null>(null)
const schemeName = ref('')
const createdBy = ref('调度员')
const targetStation = ref('')
const instructionContent = ref('')
const instructionDialogVisible = ref(false)

const plants = computed(() => db.getPlants())
const substations = computed(() => db.getSubstations())
const schemeHistory = computed(() => db.getDispatchSchemes())
const instructions = computed(() => db.getDispatchInstructions())

const planTableData = computed(() => {
  if (!currentResult.value) return []
  return currentResult.value.plans.slice(0, 48)
})

function getStatusType(status: string): 'success' | 'info' | 'warning' | 'danger' | 'primary' {
  const map: Record<string, any> = {
    draft: 'info',
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'danger',
    executed: 'primary'
  }
  return map[status] || 'info'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    pending_approval: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    executed: '已执行'
  }
  return map[status] || status
}

function getInstructionStatusType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, any> = {
    sent: 'warning',
    confirmed: 'success',
    adjust_requested: 'danger',
    adjust_approved: 'success',
    adjust_rejected: 'danger'
  }
  return map[status] || 'info'
}

function getInstructionStatusText(status: string): string {
  const map: Record<string, string> = {
    sent: '已发送',
    confirmed: '已确认',
    adjust_requested: '申请调整',
    adjust_approved: '调整批准',
    adjust_rejected: '调整驳回'
  }
  return map[status] || status
}

function getStationName(id: string): string {
  const plant = plants.value.find(p => p.id === id)
  if (plant) return plant.name
  const sub = substations.value.find(s => s.id === id)
  return sub?.name || id
}

function generateScheme() {
  currentResult.value = generateDispatchScheme(24)
  
  schemeName.value = `调度方案_${dayjs().format('YYYYMMDD_HHmm')}`
  
  currentScheme.value = {
    id: '',
    name: schemeName.value,
    startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    endTime: dayjs().add(24, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'draft',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    createdBy: createdBy.value,
    n1CheckPassed: currentResult.value.constraints.n1Check,
    rampCheckPassed: currentResult.value.constraints.rampCheck,
    plans: currentResult.value.plans
  }

  nextTick(() => {
    initDispatchChart()
  })
  
  ElMessage.success('调度方案生成成功')
}

function resetScheme() {
  currentResult.value = null
  currentScheme.value = null
  schemeName.value = ''
}

function initDispatchChart() {
  if (!dispatchChartRef.value || !currentResult.value) return
  if (!dispatchChart) {
    dispatchChart = echarts.init(dispatchChartRef.value)
  }

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const plantMap = new Map<string, number[]>()
  
  plants.value.forEach(p => {
    plantMap.set(p.name, new Array(24).fill(0))
  })

  currentResult.value.plans.forEach(plan => {
    if (plan.hour < 24) {
      const data = plantMap.get(plan.plantName)
      if (data) {
        data[plan.hour] = plan.targetOutput
      }
    }
  })

  const series = Array.from(plantMap.entries()).map(([name, data]) => ({
    name,
    type: 'line',
    stack: 'total',
    smooth: true,
    areaStyle: {},
    data
  }))

  dispatchChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: Array.from(plantMap.keys())
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
    series
  })
}

function submitForApproval() {
  if (!currentScheme.value || !schemeName.value) {
    ElMessage.warning('请填写方案名称')
    return
  }
  
  currentScheme.value.name = schemeName.value
  currentScheme.value.status = 'pending_approval'
  
  const saved = db.addDispatchScheme(currentScheme.value)
  currentScheme.value = saved
  
  ElMessage.success('已提交审批')
}

function approveScheme() {
  if (!currentScheme.value) return
  
  currentScheme.value = db.updateDispatchScheme(currentScheme.value.id, {
    status: 'approved',
    approvedBy: '总调度长',
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })
  
  ElMessage.success('方案已审批通过，可以推送指令')
}

function rejectScheme() {
  if (!currentScheme.value) return
  
  currentScheme.value = db.updateDispatchScheme(currentScheme.value.id, {
    status: 'rejected',
    approvedBy: '总调度长',
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })
  
  ElMessage.info('方案已驳回')
}

function sendInstruction() {
  if (!targetStation.value || !instructionContent.value) {
    ElMessage.warning('请选择目标厂站并填写指令内容')
    return
  }

  db.addDispatchInstruction({
    schemeId: currentScheme.value?.id || '',
    targetStation: targetStation.value,
    content: instructionContent.value,
    status: 'sent'
  })
  
  ElMessage.success('调度指令已推送至厂站终端')
  instructionContent.value = ''
  instructionDialogVisible.value = true
}

function confirmInstruction(row: DispatchInstruction) {
  db.updateDispatchInstruction(row.id, {
    status: 'confirmed',
    confirmedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operatorName: '李值班'
  })
  ElMessage.success('值班员已确认指令')
}

function requestAdjust(row: DispatchInstruction) {
  db.updateDispatchInstruction(row.id, {
    status: 'adjust_requested',
    adjustReason: '负荷变化较大，建议调整出力'
  })
  ElMessage.info('已提交调整申请，等待总调审批')
}

function viewScheme(scheme: DispatchScheme) {
  currentScheme.value = scheme
  if (scheme.plans) {
    currentResult.value = {
      plans: scheme.plans,
      constraints: {
        n1Check: scheme.n1CheckPassed,
        rampCheck: scheme.rampCheckPassed,
        balanceCheck: true
      },
      totalCost: 0,
      lineFlows: []
    }
    nextTick(() => {
      initDispatchChart()
    })
  }
}

onMounted(() => {
  nextTick(() => {
    if (dispatchChartRef.value) {
      dispatchChart = echarts.init(dispatchChartRef.value)
    }
  })
})
</script>

<style scoped>
.dispatch {
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
}

.row-mt {
  margin-top: 0;
}

.chart-wrapper {
  margin-top: 20px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.instruction-section h4 {
  margin-bottom: 15px;
  color: #303133;
}
</style>
