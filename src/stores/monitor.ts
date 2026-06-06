import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealTimeData, Alarm } from '@/types'
import { useDB } from '@/database'

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

  const db = useDB()

  function startMonitoring() {
    if (isMonitoring.value) return
    isMonitoring.value = true
    
    updateData()
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

  function updateData() {
    const data = db.generateRealTimeData()
    currentData.value = data
    historyData.value.push(data)
    if (historyData.value.length > 100) {
      historyData.value.shift()
    }

    checkAlarms(data)
  }

  function checkAlarms(data: RealTimeData) {
    const now = Date.now()

    if (data.frequency < 49.5 || data.frequency > 50.5) {
      const exists = alarms.value.some(a => 
        a.type === 'frequency' && !a.handled && 
        (now - new Date(a.timestamp).getTime()) < 30000
      )
      if (!exists) {
        const level = data.frequency < 49 || data.frequency > 51 ? 'critical' : 'danger'
        db.addAlarm({
          type: 'frequency',
          level,
          message: `系统频率异常: ${data.frequency.toFixed(2)}Hz`,
          value: data.frequency,
          threshold: level === 'critical' ? 49 : 49.5,
          acknowledged: false,
          handled: false
        })
      }
    }

    data.lines.forEach(line => {
      if (line.loadRate > 90) {
        const exists = alarms.value.some(a =>
          a.equipmentId === line.lineId && !a.handled &&
          (now - new Date(a.timestamp).getTime()) < 60000
        )
        if (!exists) {
          const level = line.loadRate > 98 ? 'critical' : line.loadRate > 95 ? 'danger' : 'warning'
          db.addAlarm({
            type: 'flow',
            level,
            equipmentId: line.lineId,
            equipmentName: line.lineName,
            message: `${line.lineName} 负载率超限: ${line.loadRate.toFixed(1)}%`,
            value: line.loadRate,
            threshold: 90,
            acknowledged: false,
            handled: false
          })
        }
      }
    })

    data.substations.forEach(sub => {
      const ratedVoltage = 220
      const deviation = Math.abs(sub.busVoltage - ratedVoltage) / ratedVoltage * 100
      if (deviation > 5) {
        const exists = alarms.value.some(a =>
          a.equipmentId === sub.substationId && !a.handled &&
          (now - new Date(a.timestamp).getTime()) < 60000
        )
        if (!exists) {
          db.addAlarm({
            type: 'voltage',
            level: deviation > 8 ? 'critical' : 'warning',
            equipmentId: sub.substationId,
            equipmentName: sub.substationName,
            message: `${sub.substationName} 电压偏差: ${deviation.toFixed(1)}%`,
            value: deviation,
            threshold: 5,
            acknowledged: false,
            handled: false
          })
        }
      }
    })

    alarms.value = db.getAlarms().slice(0, 100)
  }

  function acknowledgeAlarm(id: string) {
    db.updateAlarm(id, { acknowledged: true })
    alarms.value = db.getAlarms().slice(0, 100)
  }

  function handleAlarm(id: string, handler: string) {
    db.updateAlarm(id, { 
      handled: true, 
      handledBy: handler,
      handledAt: new Date().toISOString()
    })
    alarms.value = db.getAlarms().slice(0, 100)
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
