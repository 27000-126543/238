import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { realtimeAPI, alarmAPI } from '@/api'
import type { RealTimeData, Alarm } from '@/types'
import { ElMessage } from 'element-plus'

export const useMonitorStore = defineStore('monitor', () => {
  const currentData = ref<RealTimeData | null>(null)
  const historyData = ref<RealTimeData[]>([])
  const alarms = ref<Alarm[]>([])
  const isMonitoring = ref(false)
  let timer: number | null = null

  const unacknowledgedAlarms = computed(() =>
    alarms.value.filter(a => !a.acknowledged)
  )

  const criticalAlarms = computed(() =>
    alarms.value.filter(a => a.level === 'critical' && !a.handled)
  )

  async function startMonitoring() {
    if (isMonitoring.value) return
    isMonitoring.value = true

    try {
      await loadAlarms()
      await updateData()
    } catch (e) {}

    timer = window.setInterval(() => {
      updateData()
    }, 5000)
  }

  function stopMonitoring() {
    isMonitoring.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  async function updateData() {
    try {
      const data: any = await realtimeAPI.getData()
      currentData.value = data as RealTimeData
      historyData.value.push(data)
      if (historyData.value.length > 100) {
        historyData.value.shift()
      }

      checkAlarms(data)
    } catch (e) {
      console.error('Failed to fetch realtime data:', e)
    }
  }

  async function loadAlarms() {
    try {
      const data: any = await alarmAPI.list()
      alarms.value = (data as any[]).slice(0, 100)
    } catch (e) {}
  }

  async function checkAlarms(data: RealTimeData) {
    const now = Date.now()

    if (data.frequency < 49.5 || data.frequency > 50.5) {
      const exists = alarms.value.some(a =>
        a.type === 'frequency' && !a.handled &&
        (now - new Date(a.timestamp).getTime()) < 30000
      )
      if (!exists) {
        const level = data.frequency < 49 || data.frequency > 51 ? 'critical' : 'danger'
        try {
          await alarmAPI.create({
            type: 'frequency',
            level,
            message: `系统频率异常: ${data.frequency.toFixed(2)}Hz`,
            value: data.frequency,
            threshold: level === 'critical' ? 49 : 49.5
          })
        } catch (e) {}
      }
    }

    data.lines?.forEach(line => {
      if (line.loadRate > 90) {
        const exists = alarms.value.some(a =>
          a.equipmentId === line.lineId && !a.handled &&
          (now - new Date(a.timestamp).getTime()) < 60000
        )
        if (!exists) {
          const level = line.loadRate > 98 ? 'critical' : line.loadRate > 95 ? 'danger' : 'warning'
          alarmAPI.create({
            type: 'flow',
            level,
            equipmentId: line.lineId,
            equipmentName: line.lineName,
            message: `${line.lineName} 负载率超限: ${line.loadRate.toFixed(1)}%`,
            value: line.loadRate,
            threshold: 90
          }).catch(() => {})
        }
      }
    })

    await loadAlarms()
  }

  async function acknowledgeAlarm(id: string) {
    try {
      await alarmAPI.update(id, { acknowledged: true })
      await loadAlarms()
      ElMessage.success('告警已确认')
    } catch (e) {}
  }

  async function handleAlarm(id: string, handler: string) {
    try {
      await alarmAPI.update(id, {
        handled: true,
        handledBy: handler
      })
      await loadAlarms()
      ElMessage.success('告警已处理')
    } catch (e) {}
  }

  return {
    currentData,
    historyData,
    alarms,
    isMonitoring,
    unacknowledgedAlarms,
    criticalAlarms,
    startMonitoring,
    stopMonitoring,
    updateData,
    acknowledgeAlarm,
    handleAlarm
  }
})
