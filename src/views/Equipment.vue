<template>
  <div class="equipment">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-tabs v-model="activeTab" @tab-change="handleTabChange">
            <el-tab-pane label="发电厂" name="plants" />
            <el-tab-pane label="变电站" name="substations" />
            <el-tab-pane label="输电线路" name="lines" />
          </el-tabs>
          <el-button type="primary" @click="handleAdd" :loading="loading">
            <el-icon><Plus /></el-icon>
            新增设备
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <template v-if="activeTab === 'plants'">
          <el-table-column prop="name" label="电厂名称" min-width="150" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getPlantTagType(row.type)" size="small">
                {{ getPlantTypeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="capacity" label="装机容量(MW)" width="120" sortable />
          <el-table-column prop="ratedVoltage" label="额定电压(kV)" width="120" />
          <el-table-column prop="currentOutput" label="当前出力(MW)" width="130" sortable />
          <el-table-column prop="rampRate" label="爬坡速率(MW/h)" width="130" />
          <el-table-column prop="costPerMwh" label="发电成本(元/MWh)" width="140" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="region" label="区域" width="100" />
          <el-table-column prop="runHours" label="运行时长(h)" width="110" sortable />
        </template>

        <template v-if="activeTab === 'substations'">
          <el-table-column prop="name" label="变电站名称" min-width="180" />
          <el-table-column prop="voltageLevel" label="电压等级(kV)" width="120" sortable />
          <el-table-column prop="capacity" label="容量(MVA)" width="100" sortable />
          <el-table-column prop="transformerCount" label="变压器数量" width="110" />
          <el-table-column prop="busVoltage" label="母线电压(kV)" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="region" label="区域" width="100" />
        </template>

        <template v-if="activeTab === 'lines'">
          <el-table-column prop="name" label="线路名称" min-width="120" />
          <el-table-column prop="voltageLevel" label="电压等级(kV)" width="120" sortable />
          <el-table-column label="起点" min-width="140">
            <template #default="{ row }">
              {{ getSubstationName(row.fromSubstation) }}
            </template>
          </el-table-column>
          <el-table-column label="终点" min-width="140">
            <template #default="{ row }">
              {{ getSubstationName(row.toSubstation) }}
            </template>
          </el-table-column>
          <el-table-column prop="length" label="长度(km)" width="100" sortable />
          <el-table-column prop="currentFlow" label="当前潮流(MW)" width="130" sortable />
          <el-table-column label="负载率(%)" width="110">
            <template #default="{ row }">
              <el-progress 
                :percentage="Math.round(row.currentFlow / row.maxCapacity * 100)" 
                :color="getLoadRateColor(row.currentFlow / row.maxCapacity * 100)"
                :stroke-width="10"
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
        </template>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <template v-if="activeTab === 'plants'">
          <el-form-item label="电厂名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入电厂名称" />
          </el-form-item>
          <el-form-item label="电厂类型" prop="type">
            <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
              <el-option label="火电厂" value="thermal" />
              <el-option label="水电厂" value="hydro" />
              <el-option label="核电站" value="nuclear" />
              <el-option label="风电场" value="wind" />
              <el-option label="光伏电站" value="solar" />
            </el-select>
          </el-form-item>
          <el-form-item label="装机容量(MW)" prop="capacity">
            <el-input-number v-model="formData.capacity" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="额定电压(kV)" prop="ratedVoltage">
            <el-input-number v-model="formData.ratedVoltage" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="发电成本(元/MWh)" prop="costPerMwh">
            <el-input-number v-model="formData.costPerMwh" :min="0" :step="0.01" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大出力(MW)" prop="maxOutput">
            <el-input-number v-model="formData.maxOutput" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最小出力(MW)" prop="minOutput">
            <el-input-number v-model="formData.minOutput" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="爬坡速率(MW/h)" prop="rampRate">
            <el-input-number v-model="formData.rampRate" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="运行状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="运行中" value="running" />
              <el-option label="停运" value="stopped" />
              <el-option label="检修中" value="maintenance" />
              <el-option label="故障" value="fault" />
            </el-select>
          </el-form-item>
          <el-form-item label="所在区域" prop="region">
            <el-select v-model="formData.region" placeholder="请选择区域" style="width: 100%">
              <el-option label="东区" value="东区" />
              <el-option label="西区" value="西区" />
              <el-option label="南区" value="南区" />
              <el-option label="北区" value="北区" />
            </el-select>
          </el-form-item>
          <el-form-item label="位置" prop="location">
            <el-input v-model="formData.location" placeholder="请输入位置" />
          </el-form-item>
        </template>

        <template v-if="activeTab === 'substations'">
          <el-form-item label="变电站名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入变电站名称" />
          </el-form-item>
          <el-form-item label="电压等级(kV)" prop="voltageLevel">
            <el-input-number v-model="formData.voltageLevel" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="容量(MVA)" prop="capacity">
            <el-input-number v-model="formData.capacity" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="变压器数量" prop="transformerCount">
            <el-input-number v-model="formData.transformerCount" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="运行状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="正常" value="normal" />
              <el-option label="告警" value="warning" />
              <el-option label="故障" value="fault" />
              <el-option label="检修中" value="maintenance" />
            </el-select>
          </el-form-item>
          <el-form-item label="所在区域" prop="region">
            <el-select v-model="formData.region" placeholder="请选择区域" style="width: 100%">
              <el-option label="东区" value="东区" />
              <el-option label="西区" value="西区" />
              <el-option label="南区" value="南区" />
              <el-option label="北区" value="北区" />
            </el-select>
          </el-form-item>
          <el-form-item label="位置" prop="location">
            <el-input v-model="formData.location" placeholder="请输入位置" />
          </el-form-item>
        </template>

        <template v-if="activeTab === 'lines'">
          <el-form-item label="线路名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入线路名称" />
          </el-form-item>
          <el-form-item label="电压等级(kV)" prop="voltageLevel">
            <el-input-number v-model="formData.voltageLevel" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="起点变电站" prop="fromSubstation">
            <el-select v-model="formData.fromSubstation" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="sub in substations"
                :key="sub.id"
                :label="sub.name"
                :value="sub.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="终点变电站" prop="toSubstation">
            <el-select v-model="formData.toSubstation" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="sub in substations"
                :key="sub.id"
                :label="sub.name"
                :value="sub.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="额定容量(MW)" prop="ratedCapacity">
            <el-input-number v-model="formData.ratedCapacity" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="长度(km)" prop="length">
            <el-input-number v-model="formData.length" :min="0" :step="0.1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="运行状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="正常" value="normal" />
              <el-option label="告警" value="warning" />
              <el-option label="故障" value="fault" />
              <el-option label="检修中" value="maintenance" />
            </el-select>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { plantAPI, substationAPI, lineAPI } from '@/api'
import type { PowerPlant, Substation, TransmissionLine } from '@/types'

const activeTab = ref('plants')
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref<FormInstance>()

const plants = ref<any[]>([])
const substations = ref<any[]>([])
const lines = ref<any[]>([])

const tableData = computed(() => {
  switch (activeTab.value) {
    case 'plants': return plants.value
    case 'substations': return substations.value
    case 'lines': return lines.value
    default: return []
  }
})

const dialogTitle = computed(() => isEdit.value ? '编辑设备' : '新增设备')

const formData = reactive<any>({
  name: '',
  type: 'thermal',
  capacity: 0,
  ratedVoltage: 0,
  ratedCurrent: 0,
  maxOutput: 0,
  minOutput: 0,
  rampRate: 0,
  status: 'running',
  currentOutput: 0,
  runHours: 0,
  startCount: 0,
  location: '',
  region: '东区',
  costPerMwh: 0.3,
  voltageLevel: 0,
  transformerCount: 2,
  busVoltage: 0,
  fromSubstation: '',
  toSubstation: '',
  ratedCapacity: 0,
  length: 0,
  currentFlow: 0,
  maxCapacity: 0
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

async function loadData() {
  loading.value = true
  try {
    const [p, s, l] = await Promise.all([
      plantAPI.list(),
      substationAPI.list(),
      lineAPI.list()
    ])
    plants.value = p as any[]
    substations.value = s as any[]
    lines.value = l as any[]
  } catch (e) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function getPlantTypeText(type: string): string {
  const map: Record<string, string> = {
    thermal: '火电',
    hydro: '水电',
    nuclear: '核电',
    wind: '风电',
    solar: '光伏'
  }
  return map[type] || type
}

function getPlantTagType(type: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, any> = {
    thermal: 'danger',
    hydro: 'success',
    nuclear: 'primary',
    wind: 'warning',
    solar: 'warning'
  }
  return map[type] || 'info'
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

function getSubstationName(id: string): string {
  const sub = substations.value.find(s => s.id === id)
  return sub?.name || id
}

function getLoadRateColor(rate: number): string {
  if (rate >= 95) return '#f56c6c'
  if (rate >= 80) return '#e6a23c'
  return '#67c23a'
}

function handleTabChange() {
  resetForm()
}

function handleAdd() {
  isEdit.value = false
  editId.value = ''
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(formData, row)
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  ElMessageBox.confirm('确定要删除该设备吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      switch (activeTab.value) {
        case 'plants':
          await plantAPI.delete(row.id)
          break
        case 'substations':
          await substationAPI.delete(row.id)
          break
        case 'lines':
          await lineAPI.delete(row.id)
          break
      }
      ElMessage.success('删除成功')
      await loadData()
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    type: 'thermal',
    capacity: 0,
    ratedVoltage: 0,
    ratedCurrent: 0,
    maxOutput: 0,
    minOutput: 0,
    rampRate: 0,
    status: 'running',
    currentOutput: 0,
    runHours: 0,
    startCount: 0,
    location: '',
    region: '东区',
    costPerMwh: 0.3,
    voltageLevel: 0,
    transformerCount: 2,
    busVoltage: 0,
    fromSubstation: '',
    toSubstation: '',
    ratedCapacity: 0,
    length: 0,
    currentFlow: 0,
    maxCapacity: 0
  })
  formRef.value?.resetFields()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      switch (activeTab.value) {
        case 'plants':
          await plantAPI.update(editId.value, formData)
          break
        case 'substations':
          await substationAPI.update(editId.value, formData)
          break
        case 'lines':
          formData.maxCapacity = formData.ratedCapacity
          await lineAPI.update(editId.value, formData)
          break
      }
      ElMessage.success('更新成功')
    } else {
      switch (activeTab.value) {
        case 'plants':
          await plantAPI.create(formData)
          break
        case 'substations':
          await substationAPI.create(formData)
          break
        case 'lines':
          formData.maxCapacity = formData.ratedCapacity
          await lineAPI.create(formData)
          break
      }
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.equipment {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
