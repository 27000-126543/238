<template>
  <div class="maintenance">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>维保工单</span>
              <el-button type="primary" @click="generateWorkOrders" :loading="generating">
                <el-icon><MagicStick /></el-icon>
                自动生成工单
              </el-button>
            </div>
          </template>
          <el-table :data="workOrders" size="small" border v-loading="loading">
            <el-table-column prop="equipmentName" label="设备名称" min-width="140" />
            <el-table-column label="设备类型" width="100">
              <template #default="{ row }">
                {{ getEquipmentTypeText(row.equipmentType) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getWorkOrderType(row.type)" size="small">
                  {{ getWorkOrderTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="100">
              <template #default="{ row }">
                <el-tag :type="getPriorityType(row.priority)" size="small">
                  {{ getPriorityText(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="分配班组" width="120">
              <template #default="{ row }">
                {{ row.assignedTeam ? getTeamName(row.assignedTeam) : '未分配' }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="assignTeam(row)">分配班组</el-button>
                <el-button type="success" link size="small" @click="completeOrder(row)" v-if="row.status !== 'completed'">完成</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>备件库存</span>
          </template>
          <el-table :data="spareParts" size="small" border max-height="400" v-loading="loading">
            <el-table-column prop="name" label="备件名称" min-width="120" />
            <el-table-column prop="model" label="型号" width="100" />
            <el-table-column label="库存" width="120">
              <template #default="{ row }">
                <span :class="{ low: row.quantity < row.safeStock }">
                  {{ row.quantity }} {{ row.unit }}
                </span>
                <el-tag v-if="row.quantity < row.safeStock" type="danger" size="small" class="stock-warning">
                  预警
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="safeStock" label="安全库存" width="90" />
            <el-table-column prop="location" label="库位" width="100" />
          </el-table>
        </el-card>

        <el-card class="mt-card">
          <template #header>
            <span>维修班组</span>
          </template>
          <el-table :data="teams" size="small" border v-loading="loading">
            <el-table-column prop="name" label="班组名称" width="120" />
            <el-table-column label="人数" width="80">
              <template #default="{ row }">{{ row.members?.length || 0 }}</template>
            </el-table-column>
            <el-table-column label="技能" min-width="120">
              <template #default="{ row }">
                <el-tag v-for="skill in (row.skills || []).slice(0, 2)" :key="skill" size="small" style="margin-right: 4px;">
                  {{ skill }}
                </el-tag>
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
            <span>检修计划</span>
          </template>
          <el-table :data="maintenancePlans" size="small" border v-loading="loading">
            <el-table-column label="设备类型" width="100">
              <template #default="{ row }">
                {{ getEquipmentTypeText(row.equipmentType) }}
              </template>
            </el-table-column>
            <el-table-column prop="startTime" label="开始时间" width="160">
              <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
            </el-table-column>
            <el-table-column prop="endTime" label="结束时间" width="160">
              <template #default="{ row }">{{ formatTime(row.endTime) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="检修内容" min-width="200" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getPlanStatusType(row.status)" size="small">
                  {{ getPlanStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="assignDialogVisible" title="分配维修班组" width="500px">
      <el-form label-width="100px">
        <el-form-item label="选择班组">
          <el-select v-model="selectedTeam" placeholder="请选择班组" style="width: 100%">
            <el-option
              v-for="team in teams"
              :key="team.id"
              :label="`${team.name} (${team.members?.length || 0}人)`"
              :value="team.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="扣除备件">
          <el-checkbox-group v-model="deductParts">
            <el-checkbox 
              v-for="part in selectedOrder?.sparePartsNeeded" 
              :key="part.partId" 
              :value="part.partId"
            >
              {{ part.partName }} ({{ part.quantity }}{{ part.unit }})
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="submitting">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { workOrderAPI, sparePartAPI, staffAPI, maintenancePlanAPI, plantAPI, lineAPI } from '@/api'
import type { WorkOrder, PowerPlant, TransmissionLine } from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const generating = ref(false)
const submitting = ref(false)
const assignDialogVisible = ref(false)
const selectedTeam = ref('')
const deductParts = ref<string[]>([])
const selectedOrder = ref<WorkOrder | null>(null)

const workOrders = ref<WorkOrder[]>([])
const spareParts = ref<any[]>([])
const teams = ref<any[]>([])
const maintenancePlans = ref<any[]>([])
const plants = ref<PowerPlant[]>([])
const lines = ref<TransmissionLine[]>([])

async function loadData() {
  loading.value = true
  try {
    const [woRes, partsRes, teamsRes, plansRes, plantsRes, linesRes] = await Promise.all([
      workOrderAPI.list(),
      sparePartAPI.list(),
      staffAPI.listTeams(),
      maintenancePlanAPI.list(),
      plantAPI.list(),
      lineAPI.list()
    ])
    workOrders.value = woRes as WorkOrder[]
    spareParts.value = partsRes as any[]
    teams.value = teamsRes as any[]
    maintenancePlans.value = plansRes as any[]
    plants.value = plantsRes as PowerPlant[]
    lines.value = linesRes as TransmissionLine[]
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp: string): string {
  if (!timestamp) return '--'
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

function getEquipmentTypeText(type: string): string {
  const map: Record<string, string> = {
    plant: '发电厂',
    substation: '变电站',
    line: '输电线路'
  }
  return map[type] || type
}

function getWorkOrderType(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, any> = {
    routine: 'info',
    preventive: 'primary',
    corrective: 'warning'
  }
  return map[type] || 'info'
}

function getWorkOrderTypeText(type: string): string {
  const map: Record<string, string> = {
    routine: '常规',
    preventive: '预防性',
    corrective: '故障修复'
  }
  return map[type] || type
}

function getPriorityType(priority: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger'
  }
  return map[priority] || 'info'
}

function getPriorityText(priority: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return map[priority] || priority
}

function getStatusType(status: string): 'success' | 'info' | 'warning' | 'danger' | 'primary' {
  const map: Record<string, any> = {
    pending: 'warning',
    assigned: 'primary',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

function getPlanStatusType(status: string): 'success' | 'info' | 'warning' | 'primary' {
  const map: Record<string, any> = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

function getPlanStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待执行',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

function getTeamName(id: string): string {
  const team = teams.value.find(t => t.id === id)
  return team?.name || id
}

async function generateWorkOrders() {
  generating.value = true
  try {
    const newOrders: WorkOrder[] = []

    plants.value.forEach(plant => {
      if (plant.runHours > 8000) {
        const exist = workOrders.value.some(w => 
          w.equipmentId === plant.id && w.status !== 'completed'
        )
        if (!exist) {
          newOrders.push({
            id: '',
            equipmentId: plant.id,
            equipmentType: 'plant',
            equipmentName: plant.name,
            type: 'preventive',
            priority: plant.runHours > 10000 ? 'high' : 'medium',
            description: `运行时长${plant.runHours}小时，需进行季度预防性检修`,
            status: 'pending',
            sparePartsNeeded: [
              { partId: spareParts.value[0]?.id || '', partName: spareParts.value[0]?.name || '变压器绝缘油', quantity: 2, unit: '桶' }
            ],
            estimatedHours: 48,
            createdAt: ''
          })
        }
      }
    })

    lines.value.forEach(line => {
      if (line.status === 'warning' || (line.maxCapacity > 0 && line.currentFlow / line.maxCapacity > 0.85)) {
        const exist = workOrders.value.some(w => 
          w.equipmentId === line.id && w.status !== 'completed'
        )
        if (!exist) {
          newOrders.push({
            id: '',
            equipmentId: line.id,
            equipmentType: 'line',
            equipmentName: line.name,
            type: 'corrective',
            priority: 'high',
            description: '线路负载过高，需检查连接点和绝缘子',
            status: 'pending',
            sparePartsNeeded: [
              { partId: spareParts.value[2]?.id || '', partName: spareParts.value[2]?.name || '隔离开关', quantity: 1, unit: '组' }
            ],
            estimatedHours: 8,
            createdAt: ''
          })
        }
      }
    })

    for (const order of newOrders) {
      await workOrderAPI.create(order)
    }

    await loadData()
    ElMessage.success(`已根据设备状态自动生成${newOrders.length}条维保工单`)
  } catch (e) {
    console.error('生成工单失败', e)
    ElMessage.error('生成工单失败')
  } finally {
    generating.value = false
  }
}

function assignTeam(row: WorkOrder) {
  selectedOrder.value = row
  selectedTeam.value = row.assignedTeam || ''
  deductParts.value = row.sparePartsNeeded?.map(p => p.partId) || []
  assignDialogVisible.value = true
}

async function confirmAssign() {
  if (!selectedOrder.value || !selectedTeam.value) {
    ElMessage.warning('请选择班组')
    return
  }

  submitting.value = true
  try {
    const team = teams.value.find(t => t.id === selectedTeam.value)
    
    await workOrderAPI.update(selectedOrder.value.id, {
      status: 'assigned',
      assignedTeam: selectedTeam.value,
      assignedMembers: team?.members || []
    })

    for (const partId of deductParts.value) {
      const part = spareParts.value.find(p => p.id === partId)
      const orderPart = selectedOrder.value?.sparePartsNeeded?.find(p => p.partId === partId)
      if (part && orderPart) {
        await sparePartAPI.update(partId, {
          quantity: Math.max(0, part.quantity - orderPart.quantity)
        })
      }
    }

    await loadData()
    assignDialogVisible.value = false
    ElMessage.success('班组分配成功，备件已扣减')
  } catch (e) {
    console.error('分配失败', e)
    ElMessage.error('分配失败')
  } finally {
    submitting.value = false
  }
}

async function completeOrder(row: WorkOrder) {
  try {
    await workOrderAPI.update(row.id, {
      status: 'completed',
      completedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      actualHours: row.estimatedHours
    })
    await loadData()
    ElMessage.success('工单已完成')
  } catch (e) {
    console.error('完成工单失败', e)
    ElMessage.error('操作失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.maintenance {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mt-card {
  margin-top: 20px;
}

.row-mt {
  margin-top: 0;
}

.stock-warning {
  margin-left: 8px;
}

.low {
  color: #f56c6c;
  font-weight: bold;
}
</style>
