<template>
  <div class="dispatch">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>调度方案生成 (线性规划 + 遗传算法)</span>
              <div class="header-actions">
                <el-switch v-model="useGenetic" active-text="遗传算法" inactive-text="线性规划" />
                <el-button type="primary" @click="generateScheme" :loading="generating">
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
            <el-col :span="5">
              <el-statistic title="方案名称" :value="currentScheme.name" />
            </el-col>
            <el-col :span="4">
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
                <el-descriptions-item label="算法">
                  <el-tag type="info">
                    {{ useGenetic ? '遗传算法' : '线性规划' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
            <el-col :span="3">
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

          <el-alert 
            v-if="currentResult && !currentResult.constraints.rampCheck"
            title="爬坡约束警告"
            type="warning"
            :closable="false"
            class="alert-box"
          >
            部分机组出力变化超过爬坡速率限制，建议调整方案
          </el-alert>
          <el-alert 
            v-if="currentResult && !currentResult.constraints.n1Check"
            title="N-1安全校验失败"
            type="error"
            :closable="false"
            class="alert-box"
          >
            网络不满足N-1安全准则，单线路故障可能导致过载
          </el-alert>
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
            <el-table-column prop="targetOutput" label="目标出力(MW)" width="130" align="right" sortable />
            <el-table-column prop="rampUp" label="上爬坡(MW)" width="120" align="right">
              <template #default="{ row }">
                <span v-if="row.rampUp > 0" style="color: #67c23a">+{{ row.rampUp }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="rampDown" label="下爬坡(MW)" width="120" align="right">
              <template #default="{ row }">
                <span v-if="row.rampDown > 0" style="color: #f56c6c">-{{ row.rampDown }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="约束检查" width="100" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.rampUp <= 150 && row.rampDown <= 150" color="#67c23a"><Check /></el-icon>
                <el-icon v-else color="#e6a23c"><Warning /></el-icon>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>方案审批 & 指令推送</span>
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
                  :loading="submitting"
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
            <h4>调度指令推送</h4>
            <el-form label-width="100px">
              <el-form-item label="目标厂站">
                <el-select v-model="targetStation" placeholder="请选择目标厂站" style="width: 100%" filterable>
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
                  :loading="sending"
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
              <el-button size="small" @click="loadSchemes">刷新</el-button>
            </div>
          </template>
          <el-table :data="schemeHistory" size="small" border v-loading="loadingSchemes">
            <el-table-column prop="name" label="方案名称" min-width="180" />
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="结束时间" width="160" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="算法" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.useGenetic ? '遗传' : 'LP' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdBy" label="创建人" width="100" />
            <el-table-column prop="totalCost" label="总成本(元)" width="120" sortable />
            <el-table-column label="N-1" width="80">
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

    <el-dialog v-model="instructionDialogVisible" title="调度指令确认" width="700px">
      <el-table :data="instructions" size="small" border>
        <el-table-column prop="content" label="指令内容" min-width="200" />
        <el-table-column label="目标厂站" width="150">
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
        <el-table-column label="操作" width="200">
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
            <el-tag v-if="row.status === 'adjust_requested'" type="warning" size="small">
              待总调审批
            </el-tag>
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
import { dispatchAPI, plantAPI, substationAPI } from '@/api'
import type { DispatchScheme, DispatchInstruction, DispatchPlanItem } from '@/types'
import dayjs from 'dayjs'

const dispatchChartRef = ref<HTMLElement>()
let dispatchChart: echarts.ECharts | null = null

const currentResult = ref<{
  plans: DispatchPlanItem[]
  constraints: { n1Check: boolean; rampCheck: boolean; balanceCheck: boolean }
  totalCost: number
  lineFlows: { lineId: string; flow: number; maxCapacity: number }[]
} | null>(null)

const currentScheme = ref<DispatchScheme | null>(null)
const schemeName = ref('')
const createdBy = ref('调度员')
const useGenetic = ref(false)
const targetStation = ref('')
const instructionContent = ref('')
const instructionDialogVisible = ref(false)

const generating = ref(false)
const submitting = ref(false)
const sending = ref(false)
const loadingSchemes = ref(false)

const plants = ref<any[]>([])
const substations = ref<any[]>([])
const schemeHistory = ref<any[]>([])
const instructions = ref<any[]>([])

const planTableData = computed(() => {
  if (!currentResult.value) return []
  return currentResult.value.plans.slice(0, 72)
})

async function loadPlants() {
  try {
    const data: any = await plantAPI.list()
    plants.value = data as any[]
  } catch (e) {}
}

async function loadSubstations() {
  try {
    const data: any = await substationAPI.list()
    substations.value = data as any[]
  } catch (e) {}
}

async function loadSchemes() {
  loadingSchemes.value = true
  try {
    const data: any = await dispatchAPI.listSchemes()
    schemeHistory.value = data as any[]
  } catch (e) {
    ElMessage.error('加载历史方案失败')
  } finally {
    loadingSchemes.value = false
  }
}

async function loadInstructions() {
  try {
    const data: any = await dispatchAPI.listInstructions()
    instructions.value = data as any[]
  } catch (e) {}
}

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

async function generateScheme() {
  generating.value = true
  try {
    const result: any = await dispatchAPI.generate({
      hours: 24,
      useGenetic: useGenetic.value
    })
    
    currentResult.value = result
    
    schemeName.value = `调度方案_${dayjs().format('YYYYMMDD_HHmm')}_${useGenetic.value ? 'GA' : 'LP'}`
    
    currentScheme.value = {
      id: '',
      name: schemeName.value,
      startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      endTime: dayjs().add(24, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      status: 'draft',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: createdBy.value,
      n1CheckPassed: result.constraints.n1Check,
      rampCheckPassed: result.constraints.rampCheck,
      plans: result.plans
    }

    nextTick(() => {
      initDispatchChart()
    })
    
    ElMessage.success(`调度方案生成成功 (${useGenetic.value ? '遗传算法' : '线性规划'})`)
    
    if (!result.constraints.rampCheck) {
      ElMessage.warning('注意：部分机组不满足爬坡约束')
    }
    if (!result.constraints.n1Check) {
      ElMessage.error('警告：网络不满足N-1安全准则')
    }
  } catch (e) {
    ElMessage.error('生成调度方案失败')
  } finally {
    generating.value = false
  }
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
    title: {
      text: `${useGenetic.value ? '遗传算法' : '线性规划'}优化 - 24小时机组出力计划`,
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        let total = 0
        params.forEach((p: any) => { total += p.value })
        return `${params[0].axisValue}<br/>总出力: ${total.toFixed(0)} MW`
      }
    },
    legend: {
      data: Array.from(plantMap.keys()),
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours
    },
    yAxis: {
      type: 'value',
      name: 'MW',
      min: 0
    },
    series
  })
}

async function submitForApproval() {
  if (!currentScheme.value || !schemeName.value) {
    ElMessage.warning('请填写方案名称')
    return
  }
  
  submitting.value = true
  try {
    const saved: any = await dispatchAPI.createScheme({
      name: schemeName.value,
      startTime: currentScheme.value.startTime,
      endTime: currentScheme.value.endTime,
      status: 'pending_approval',
      createdBy: createdBy.value,
      plans: currentResult.value?.plans || [],
      n1CheckPassed: currentScheme.value.n1CheckPassed,
      rampCheckPassed: currentScheme.value.rampCheckPassed,
      totalCost: currentResult.value?.totalCost || 0,
      useGenetic: useGenetic.value
    })
    
    currentScheme.value = { ...currentScheme.value, ...saved, status: 'pending_approval' }
    await loadSchemes()
    ElMessage.success('已提交总调度长审批')
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

async function approveScheme() {
  if (!currentScheme.value || !currentScheme.value.id) return
  
  try {
    await dispatchAPI.updateScheme(currentScheme.value.id, {
      status: 'approved',
      approvedBy: '总调度长'
    })
    
    currentScheme.value.status = 'approved'
    currentScheme.value.approvedBy = '总调度长'
    await loadSchemes()
    ElMessage.success('方案已审批通过，可以推送指令')
  } catch (e) {
    ElMessage.error('审批失败')
  }
}

async function rejectScheme() {
  if (!currentScheme.value || !currentScheme.value.id) return
  
  try {
    await dispatchAPI.updateScheme(currentScheme.value.id, {
      status: 'rejected',
      approvedBy: '总调度长'
    })
    
    currentScheme.value.status = 'rejected'
    await loadSchemes()
    ElMessage.info('方案已驳回')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function sendInstruction() {
  if (!targetStation.value || !instructionContent.value) {
    ElMessage.warning('请选择目标厂站并填写指令内容')
    return
  }

  sending.value = true
  try {
    await dispatchAPI.createInstruction({
      schemeId: currentScheme.value?.id || '',
      targetStation: targetStation.value,
      content: instructionContent.value
    })
    
    await loadInstructions()
    ElMessage.success('调度指令已推送至厂站终端')
    instructionContent.value = ''
    instructionDialogVisible.value = true
  } catch (e) {
    ElMessage.error('推送失败')
  } finally {
    sending.value = false
  }
}

async function confirmInstruction(row: DispatchInstruction) {
  try {
    await dispatchAPI.updateInstruction(row.id, {
      status: 'confirmed',
      operatorName: '李值班'
    })
    await loadInstructions()
    ElMessage.success('值班员已确认指令')
  } catch (e) {}
}

async function requestAdjust(row: DispatchInstruction) {
  try {
    await dispatchAPI.updateInstruction(row.id, {
      status: 'adjust_requested',
      adjustReason: '负荷变化较大，建议调整出力'
    })
    await loadInstructions()
    ElMessage.info('已提交调整申请，等待总调审批')
  } catch (e) {}
}

function viewScheme(scheme: any) {
  currentScheme.value = scheme
  if (scheme.plans) {
    currentResult.value = {
      plans: scheme.plans,
      constraints: {
        n1Check: scheme.n1CheckPassed,
        rampCheck: scheme.rampCheckPassed,
        balanceCheck: true
      },
      totalCost: scheme.totalCost || 0,
      lineFlows: []
    }
    nextTick(() => {
      initDispatchChart()
    })
  }
}

onMounted(async () => {
  await loadPlants()
  await loadSubstations()
  await loadSchemes()
  await loadInstructions()
  
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
  gap: 15px;
  align-items: center;
}

.row-mt {
  margin-top: 0;
}

.chart-wrapper {
  margin-top: 20px;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.instruction-section h4 {
  margin-bottom: 15px;
  color: #303133;
}

.alert-box {
  margin-top: 15px;
}
</style>
