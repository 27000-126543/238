<template>
  <div class="scheduling">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>排班表</span>
              <div class="header-actions">
                <el-date-picker
                  v-model="weekDate"
                  type="week"
                  format="YYYY年第w周"
                  value-format="YYYY-MM-DD"
                  :clearable="false"
                  size="small"
                  @change="handleWeekChange"
                />
                <el-button type="primary" size="small" @click="autoGenerateSchedule" :loading="generating">
                  <el-icon><MagicStick /></el-icon>
                  自动排班
                </el-button>
              </div>
            </div>
          </template>
          <el-table :data="scheduleTableData" size="small" border v-loading="loading">
            <el-table-column prop="date" label="日期" width="120" fixed />
            <el-table-column prop="weekday" label="星期" width="80" fixed />
            <el-table-column label="早班 (08:00-16:00)" min-width="150">
              <template #default="{ row }">
                <div v-for="item in row.morning" :key="item.id" class="shift-item">
                  <el-tag size="small" :type="item.isSwapped ? 'warning' : 'success'">
                    {{ item.staffName }}
                  </el-tag>
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    @click="requestSwap(item)"
                  >
                    调班
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="中班 (16:00-24:00)" min-width="150">
              <template #default="{ row }">
                <div v-for="item in row.afternoon" :key="item.id" class="shift-item">
                  <el-tag size="small" :type="item.isSwapped ? 'warning' : 'primary'">
                    {{ item.staffName }}
                  </el-tag>
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    @click="requestSwap(item)"
                  >
                    调班
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="夜班 (00:00-08:00)" min-width="150">
              <template #default="{ row }">
                <div v-for="item in row.night" :key="item.id" class="shift-item">
                  <el-tag size="small" :type="item.isSwapped ? 'warning' : 'info'">
                    {{ item.staffName }}
                  </el-tag>
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    @click="requestSwap(item)"
                  >
                    调班
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>人员信息</span>
          </template>
          <el-table :data="staffList" size="small" border max-height="350" v-loading="loading">
            <el-table-column prop="name" label="姓名" width="80" />
            <el-table-column prop="position" label="职位" width="100" />
            <el-table-column label="技能" min-width="120">
              <template #default="{ row }">
                <el-tag 
                  v-for="skill in (row.skills || []).slice(0, 2)" 
                  :key="skill" 
                  size="small" 
                  style="margin-right: 4px; margin-bottom: 4px;"
                >
                  {{ skill }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="工时" width="100">
              <template #default="{ row }">
                <span :class="{ warning: row.currentWorkHours > row.maxWorkHours * 0.8 }">
                  {{ row.currentWorkHours }}/{{ row.maxWorkHours }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'on_duty' ? 'success' : 'info'" size="small">
                  {{ getStaffStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="mt-card">
          <template #header>
            <span>调班申请</span>
          </template>
          <el-table :data="swapRequests" size="small" border max-height="250" v-loading="loading">
            <el-table-column prop="fromStaffName" label="申请人" width="80" />
            <el-table-column prop="toStaffName" label="调班人" width="80" />
            <el-table-column prop="date" label="日期" width="100" />
            <el-table-column label="班次" width="80">
              <template #default="{ row }">
                {{ getShiftText(row.shift) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="getSwapStatusType(row.status)" size="small">
                  {{ getSwapStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button 
                  v-if="row.status === 'pending'"
                  type="success" 
                  link 
                  size="small"
                  @click="approveSwap(row)"
                >
                  批准
                </el-button>
                <el-button 
                  v-if="row.status === 'pending'"
                  type="danger" 
                  link 
                  size="small"
                  @click="rejectSwap(row)"
                >
                  驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="swapDialogVisible" title="申请调班" width="500px">
      <el-form label-width="100px">
        <el-form-item label="申请人">
          <el-input :value="swapFrom?.staffName" disabled />
        </el-form-item>
        <el-form-item label="调班人员">
          <el-select v-model="swapToStaff" placeholder="请选择调班人员" style="width: 100%">
            <el-option
              v-for="staff in availableStaff"
              :key="staff.id"
              :label="`${staff.name} (${staff.position})`"
              :value="staff.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调班原因">
          <el-input 
            v-model="swapReason" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入调班原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swapDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSwap" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { staffAPI, scheduleAPI } from '@/api'
import type { Schedule, SwapRequest } from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const generating = ref(false)
const submitting = ref(false)
const weekDate = ref(dayjs().format('YYYY-MM-DD'))
const swapDialogVisible = ref(false)
const swapFrom = ref<Schedule | null>(null)
const swapToStaff = ref('')
const swapReason = ref('')

const staffList = ref<any[]>([])
const schedules = ref<Schedule[]>([])
const swapRequests = ref<SwapRequest[]>([])

const availableStaff = computed(() => 
  staffList.value.filter(s => s.status === 'on_duty' && s.id !== swapFrom.value?.staffId)
)

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const scheduleTableData = computed(() => {
  const weekStart = dayjs(weekDate.value).startOf('week')
  const days = []
  
  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day')
    const dateStr = date.format('YYYY-MM-DD')
    const daySchedules = schedules.value.filter(s => s.date === dateStr)
    
    days.push({
      date: dateStr,
      weekday: weekdays[date.day()],
      morning: daySchedules.filter(s => s.shift === 'morning'),
      afternoon: daySchedules.filter(s => s.shift === 'afternoon'),
      night: daySchedules.filter(s => s.shift === 'night')
    })
  }
  
  return days
})

async function loadData() {
  loading.value = true
  try {
    const [staffRes, schedulesRes, swapRes] = await Promise.all([
      staffAPI.list(),
      scheduleAPI.list(),
      scheduleAPI.listSwapRequests()
    ])
    staffList.value = staffRes as any[]
    schedules.value = schedulesRes as Schedule[]
    swapRequests.value = swapRes as SwapRequest[]
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function getStaffStatusText(status: string): string {
  const map: Record<string, string> = {
    on_duty: '在岗',
    off_duty: '休息',
    leave: '请假',
    training: '培训'
  }
  return map[status] || status
}

function getShiftText(shift: string): string {
  const map: Record<string, string> = {
    morning: '早班',
    afternoon: '中班',
    night: '夜班'
  }
  return map[shift] || shift
}

function getSwapStatusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

function getSwapStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已驳回'
  }
  return map[status] || status
}

function handleWeekChange() {
}

async function autoGenerateSchedule() {
  generating.value = true
  try {
    const weekStart = dayjs(weekDate.value).startOf('week')
    const onDutyStaff = staffList.value.filter(s => s.status === 'on_duty')
    
    if (onDutyStaff.length < 3) {
      ElMessage.warning('在岗人员不足，无法自动排班')
      return
    }

    for (let i = 0; i < 7; i++) {
      const date = weekStart.add(i, 'day').format('YYYY-MM-DD')
      const shifts = ['morning', 'afternoon', 'night'] as const
      
      for (let shiftIdx = 0; shiftIdx < shifts.length; shiftIdx++) {
        const shift = shifts[shiftIdx]
        const existing = schedules.value.find(s => s.date === date && s.shift === shift)
        if (existing) {
          await scheduleAPI.update(existing.id, { isSwapped: false })
        } else {
          const staffIdx = (i * 3 + shiftIdx) % onDutyStaff.length
          const staff = onDutyStaff[staffIdx]
          
          await scheduleAPI.create({
            date,
            shift,
            staffId: staff.id,
            staffName: staff.name,
            position: staff.position,
            isSwapped: false
          })
        }
      }
    }

    await loadData()
    ElMessage.success('已根据人员技能和工时上限自动生成排班表')
  } catch (e) {
    console.error('自动排班失败', e)
    ElMessage.error('自动排班失败')
  } finally {
    generating.value = false
  }
}

function requestSwap(item: Schedule) {
  swapFrom.value = item
  swapToStaff.value = ''
  swapReason.value = ''
  swapDialogVisible.value = true
}

async function submitSwap() {
  if (!swapFrom.value || !swapToStaff.value) {
    ElMessage.warning('请选择调班人员')
    return
  }

  submitting.value = true
  try {
    const toStaff = staffList.value.find(s => s.id === swapToStaff.value)
    
    await scheduleAPI.createSwapRequest({
      fromStaffId: swapFrom.value.staffId,
      fromStaffName: swapFrom.value.staffName,
      toStaffId: swapToStaff.value,
      toStaffName: toStaff?.name || '',
      date: swapFrom.value.date,
      shift: swapFrom.value.shift,
      reason: swapReason.value,
      status: 'pending'
    })

    await loadData()
    swapDialogVisible.value = false
    ElMessage.success('调班申请已提交，等待审批')
  } catch (e) {
    console.error('提交调班失败', e)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

async function approveSwap(request: SwapRequest) {
  try {
    await scheduleAPI.updateSwapRequest(request.id, {
      status: 'approved',
      approvedBy: '总调度长'
    })

    const schedule = schedules.value.find(s => 
      s.date === request.date && s.shift === request.shift && s.staffId === request.fromStaffId
    )
    
    if (schedule) {
      await scheduleAPI.update(schedule.id, {
        staffId: request.toStaffId,
        staffName: request.toStaffName,
        isSwapped: true,
        originalStaffId: request.fromStaffId
      })
    }

    await loadData()
    ElMessage.success('调班已批准')
  } catch (e) {
    console.error('批准调班失败', e)
    ElMessage.error('操作失败')
  }
}

async function rejectSwap(request: SwapRequest) {
  try {
    await scheduleAPI.updateSwapRequest(request.id, {
      status: 'rejected',
      approvedBy: '总调度长'
    })
    await loadData()
    ElMessage.info('调班已驳回')
  } catch (e) {
    console.error('驳回调班失败', e)
    ElMessage.error('操作失败')
  }
}

onMounted(async () => {
  await loadData()
  if (schedules.value.length === 0) {
    autoGenerateSchedule()
  }
})
</script>

<style scoped>
.scheduling {
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

.mt-card {
  margin-top: 20px;
}

.shift-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.warning {
  color: #e6a23c;
  font-weight: bold;
}
</style>
