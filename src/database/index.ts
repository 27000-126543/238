import type {
  PowerPlant, Substation, TransmissionLine, DispatchScheme,
  DispatchInstruction, RealTimeData, Alarm, WorkOrder,
  SparePart, Staff, Team, Schedule, SwapRequest,
  MaintenancePlan, LoadForecast, StatisticsData,
  TopologyNode, TopologyLink
} from '@/types'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

const STORAGE_KEY = 'power_grid_db'

interface Database {
  plants: PowerPlant[]
  substations: Substation[]
  lines: TransmissionLine[]
  dispatchSchemes: DispatchScheme[]
  dispatchInstructions: DispatchInstruction[]
  realTimeData: RealTimeData[]
  alarms: Alarm[]
  workOrders: WorkOrder[]
  spareParts: SparePart[]
  staff: Staff[]
  teams: Team[]
  schedules: Schedule[]
  swapRequests: SwapRequest[]
  maintenancePlans: MaintenancePlan[]
  loadForecasts: LoadForecast[]
}

function getDefaultDB(): Database {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  
  const plants: PowerPlant[] = [
    {
      id: uuidv4(), name: '华能火电厂', type: 'thermal', capacity: 2000,
      ratedVoltage: 220, ratedCurrent: 5000, maxOutput: 2000, minOutput: 500,
      rampRate: 100, status: 'running', currentOutput: 1800, runHours: 8760,
      startCount: 52, location: '东部工业区', region: '东区',
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '三峡水力发电站', type: 'hydro', capacity: 3000,
      ratedVoltage: 500, ratedCurrent: 8000, maxOutput: 3000, minOutput: 300,
      rampRate: 200, status: 'running', currentOutput: 2500, runHours: 7200,
      startCount: 120, location: '长江流域', region: '南区',
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '阳江核电站', type: 'nuclear', capacity: 4000,
      ratedVoltage: 500, ratedCurrent: 10000, maxOutput: 4000, minOutput: 2000,
      rampRate: 50, status: 'running', currentOutput: 3800, runHours: 12000,
      startCount: 10, location: '沿海工业区', region: '南区',
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '内蒙风电场', type: 'wind', capacity: 800,
      ratedVoltage: 110, ratedCurrent: 3000, maxOutput: 800, minOutput: 0,
      rampRate: 300, status: 'running', currentOutput: 450, runHours: 4380,
      startCount: 300, location: '西北草原', region: '西区',
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '敦煌光伏电站', type: 'solar', capacity: 500,
      ratedVoltage: 110, ratedCurrent: 2000, maxOutput: 500, minOutput: 0,
      rampRate: 500, status: 'running', currentOutput: 320, runHours: 3650,
      startCount: 200, location: '西北戈壁', region: '西区',
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '大唐火电厂', type: 'thermal', capacity: 1800,
      ratedVoltage: 220, ratedCurrent: 4500, maxOutput: 1800, minOutput: 400,
      rampRate: 90, status: 'maintenance', currentOutput: 0, runHours: 9500,
      startCount: 60, location: '北部工业区', region: '北区',
      createTime: now, updateTime: now
    }
  ]

  const substations: Substation[] = [
    {
      id: uuidv4(), name: '东城500kV变电站', voltageLevel: 500, capacity: 3000,
      transformerCount: 4, status: 'normal', location: '东城区', region: '东区',
      busVoltage: 512, createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '西城220kV变电站', voltageLevel: 220, capacity: 1500,
      transformerCount: 3, status: 'normal', location: '西城区', region: '西区',
      busVoltage: 225, createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '南城500kV变电站', voltageLevel: 500, capacity: 2500,
      transformerCount: 3, status: 'normal', location: '南城区', region: '南区',
      busVoltage: 508, createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '北城220kV变电站', voltageLevel: 220, capacity: 1200,
      transformerCount: 2, status: 'warning', location: '北城区', region: '北区',
      busVoltage: 218, createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '中心110kV变电站', voltageLevel: 110, capacity: 600,
      transformerCount: 2, status: 'normal', location: '中心区', region: '东区',
      busVoltage: 112, createTime: now, updateTime: now
    }
  ]

  const lines: TransmissionLine[] = [
    {
      id: uuidv4(), name: '东三线', fromSubstation: substations[0].id,
      toSubstation: substations[2].id, voltageLevel: 500, ratedCapacity: 2000,
      length: 85, status: 'normal', currentFlow: 1200, maxCapacity: 2000,
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '东西线', fromSubstation: substations[0].id,
      toSubstation: substations[1].id, voltageLevel: 220, ratedCapacity: 1000,
      length: 45, status: 'normal', currentFlow: 650, maxCapacity: 1000,
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '南北线', fromSubstation: substations[2].id,
      toSubstation: substations[3].id, voltageLevel: 220, ratedCapacity: 1200,
      length: 60, status: 'warning', currentFlow: 1100, maxCapacity: 1200,
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '中西线', fromSubstation: substations[4].id,
      toSubstation: substations[1].id, voltageLevel: 110, ratedCapacity: 500,
      length: 25, status: 'normal', currentFlow: 280, maxCapacity: 500,
      createTime: now, updateTime: now
    },
    {
      id: uuidv4(), name: '东北线', fromSubstation: substations[0].id,
      toSubstation: substations[3].id, voltageLevel: 220, ratedCapacity: 800,
      length: 55, status: 'normal', currentFlow: 420, maxCapacity: 800,
      createTime: now, updateTime: now
    }
  ]

  const staff: Staff[] = [
    { id: uuidv4(), name: '张调度', position: '总调度长', skills: ['调度', '运维', '应急'], maxWorkHours: 160, currentWorkHours: 120, phone: '13800138001', status: 'on_duty' },
    { id: uuidv4(), name: '李值班', position: '值班员', skills: ['监控', '操作'], maxWorkHours: 180, currentWorkHours: 150, phone: '13800138002', status: 'on_duty' },
    { id: uuidv4(), name: '王运维', position: '运维工程师', skills: ['检修', '维护', '变压器'], maxWorkHours: 170, currentWorkHours: 140, phone: '13800138003', status: 'on_duty' },
    { id: uuidv4(), name: '赵维修', position: '维修技师', skills: ['检修', '线路', '开关'], maxWorkHours: 180, currentWorkHours: 160, phone: '13800138004', status: 'on_duty' },
    { id: uuidv4(), name: '陈分析', position: '数据分析员', skills: ['分析', '统计', '建模'], maxWorkHours: 160, currentWorkHours: 130, phone: '13800138005', status: 'on_duty' },
    { id: uuidv4(), name: '刘安全', position: '安全员', skills: ['安全', '培训', '应急'], maxWorkHours: 160, currentWorkHours: 110, phone: '13800138006', status: 'off_duty' }
  ]

  const teams: Team[] = [
    { id: uuidv4(), name: '检修一班', members: [staff[2].id, staff[3].id], leader: staff[2].id, skills: ['检修', '维护', '变压器', '线路'] },
    { id: uuidv4(), name: '运维二班', members: [staff[0].id, staff[1].id], leader: staff[0].id, skills: ['调度', '运维', '监控', '操作'] }
  ]

  const spareParts: SparePart[] = [
    { id: uuidv4(), name: '变压器绝缘油', model: '25#', quantity: 50, unit: '桶', safeStock: 20, location: 'A区仓库', lastUpdated: now },
    { id: uuidv4(), name: '高压断路器', model: 'ZW32-12', quantity: 8, unit: '台', safeStock: 5, location: 'B区仓库', lastUpdated: now },
    { id: uuidv4(), name: '隔离开关', model: 'GW4-110', quantity: 6, unit: '组', safeStock: 3, location: 'B区仓库', lastUpdated: now },
    { id: uuidv4(), name: '电压互感器', model: 'JDZ-10', quantity: 12, unit: '台', safeStock: 5, location: 'C区仓库', lastUpdated: now },
    { id: uuidv4(), name: '电流互感器', model: 'LMZ-10', quantity: 15, unit: '台', safeStock: 5, location: 'C区仓库', lastUpdated: now },
    { id: uuidv4(), name: '电缆终端头', model: '110kV', quantity: 3, unit: '套', safeStock: 4, location: 'D区仓库', lastUpdated: now }
  ]

  const workOrders: WorkOrder[] = [
    {
      id: uuidv4(), equipmentId: plants[0].id, equipmentType: 'plant', equipmentName: plants[0].name,
      type: 'preventive', priority: 'medium', description: '常规季度检修，检查锅炉和汽机运行状态',
      status: 'pending', sparePartsNeeded: [{ partId: spareParts[0].id, partName: spareParts[0].name, quantity: 2, unit: '桶' }],
      estimatedHours: 48, createdAt: now
    },
    {
      id: uuidv4(), equipmentId: lines[2].id, equipmentType: 'line', equipmentName: lines[2].name,
      type: 'corrective', priority: 'high', description: '线路负载过高，需要检查连接点和绝缘子',
      status: 'in_progress', assignedTeam: teams[0].id, assignedMembers: [staff[2].id, staff[3].id],
      sparePartsNeeded: [{ partId: spareParts[2].id, partName: spareParts[2].name, quantity: 1, unit: '组' }],
      estimatedHours: 8, createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
    }
  ]

  const alarms: Alarm[] = [
    {
      id: uuidv4(), type: 'flow', level: 'warning', equipmentId: lines[2].id, equipmentName: lines[2].name,
      message: '南北线传输功率接近额定容量', value: 91.7, threshold: 90,
      timestamp: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      acknowledged: true, handled: false
    },
    {
      id: uuidv4(), type: 'voltage', level: 'warning', equipmentId: substations[3].id, equipmentName: substations[3].name,
      message: '北城变电站母线电压偏低', value: 218, threshold: 220,
      timestamp: dayjs().subtract(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      acknowledged: false, handled: false
    }
  ]

  const schedules: Schedule[] = []
  for (let i = 0; i < 7; i++) {
    const date = dayjs().add(i, 'day').format('YYYY-MM-DD')
    const shifts = ['morning', 'afternoon', 'night'] as const
    shifts.forEach((shift, idx) => {
      const staffIdx = (i + idx) % staff.length
      schedules.push({
        id: uuidv4(), date, shift,
        staffId: staff[staffIdx].id,
        staffName: staff[staffIdx].name,
        position: staff[staffIdx].position,
        isSwapped: false
      })
    })
  }

  const loadForecasts: LoadForecast[] = []
  for (let i = 0; i < 24; i++) {
    const baseLoad = 8000
    const hourFactor = 0.6 + 0.4 * Math.sin((i - 6) * Math.PI / 12)
    loadForecasts.push({
      id: uuidv4(),
      timestamp: dayjs().hour(i).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
      region: '全网',
      forecastLoad: Math.round(baseLoad * hourFactor),
      source: 'mixed'
    })
  }

  const maintenancePlans: MaintenancePlan[] = [
    {
      id: uuidv4(), equipmentId: plants[5].id, equipmentType: 'plant',
      startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      endTime: dayjs().add(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
      description: '大唐火电厂年度大修',
      status: 'in_progress'
    }
  ]

  return {
    plants,
    substations,
    lines,
    dispatchSchemes: [],
    dispatchInstructions: [],
    realTimeData: [],
    alarms,
    workOrders,
    spareParts,
    staff,
    teams,
    schedules,
    swapRequests: [],
    maintenancePlans,
    loadForecasts
  }
}

let db: Database

function initDB() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      db = JSON.parse(saved)
    } catch {
      db = getDefaultDB()
    }
  } else {
    db = getDefaultDB()
  }
  return db
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function useDB() {
  if (!db) initDB()
  
  return {
    getPlants: () => [...db.plants],
    getPlant: (id: string) => db.plants.find(p => p.id === id),
    addPlant: (plant: Omit<PowerPlant, 'id' | 'createTime' | 'updateTime'>) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const newPlant = { ...plant, id: uuidv4(), createTime: now, updateTime: now } as PowerPlant
      db.plants.push(newPlant)
      saveDB()
      return newPlant
    },
    updatePlant: (id: string, data: Partial<PowerPlant>) => {
      const idx = db.plants.findIndex(p => p.id === id)
      if (idx > -1) {
        db.plants[idx] = { ...db.plants[idx], ...data, updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        saveDB()
        return db.plants[idx]
      }
      return null
    },
    deletePlant: (id: string) => {
      const idx = db.plants.findIndex(p => p.id === id)
      if (idx > -1) {
        db.plants.splice(idx, 1)
        saveDB()
        return true
      }
      return false
    },

    getSubstations: () => [...db.substations],
    getSubstation: (id: string) => db.substations.find(s => s.id === id),
    addSubstation: (substation: Omit<Substation, 'id' | 'createTime' | 'updateTime'>) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const newSubstation = { ...substation, id: uuidv4(), createTime: now, updateTime: now } as Substation
      db.substations.push(newSubstation)
      saveDB()
      return newSubstation
    },
    updateSubstation: (id: string, data: Partial<Substation>) => {
      const idx = db.substations.findIndex(s => s.id === id)
      if (idx > -1) {
        db.substations[idx] = { ...db.substations[idx], ...data, updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        saveDB()
        return db.substations[idx]
      }
      return null
    },
    deleteSubstation: (id: string) => {
      const idx = db.substations.findIndex(s => s.id === id)
      if (idx > -1) {
        db.substations.splice(idx, 1)
        saveDB()
        return true
      }
      return false
    },

    getLines: () => [...db.lines],
    getLine: (id: string) => db.lines.find(l => l.id === id),
    addLine: (line: Omit<TransmissionLine, 'id' | 'createTime' | 'updateTime'>) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const newLine = { ...line, id: uuidv4(), createTime: now, updateTime: now } as TransmissionLine
      db.lines.push(newLine)
      saveDB()
      return newLine
    },
    updateLine: (id: string, data: Partial<TransmissionLine>) => {
      const idx = db.lines.findIndex(l => l.id === id)
      if (idx > -1) {
        db.lines[idx] = { ...db.lines[idx], ...data, updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        saveDB()
        return db.lines[idx]
      }
      return null
    },
    deleteLine: (id: string) => {
      const idx = db.lines.findIndex(l => l.id === id)
      if (idx > -1) {
        db.lines.splice(idx, 1)
        saveDB()
        return true
      }
      return false
    },

    getDispatchSchemes: () => [...db.dispatchSchemes],
    getDispatchScheme: (id: string) => db.dispatchSchemes.find(s => s.id === id),
    addDispatchScheme: (scheme: Omit<DispatchScheme, 'id' | 'createdAt'>) => {
      const newScheme = { ...scheme, id: uuidv4(), createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } as DispatchScheme
      db.dispatchSchemes.push(newScheme)
      saveDB()
      return newScheme
    },
    updateDispatchScheme: (id: string, data: Partial<DispatchScheme>) => {
      const idx = db.dispatchSchemes.findIndex(s => s.id === id)
      if (idx > -1) {
        db.dispatchSchemes[idx] = { ...db.dispatchSchemes[idx], ...data }
        saveDB()
        return db.dispatchSchemes[idx]
      }
      return null
    },

    getDispatchInstructions: () => [...db.dispatchInstructions],
    addDispatchInstruction: (instruction: Omit<DispatchInstruction, 'id' | 'sentAt'>) => {
      const newInstruction = { ...instruction, id: uuidv4(), sentAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } as DispatchInstruction
      db.dispatchInstructions.push(newInstruction)
      saveDB()
      return newInstruction
    },
    updateDispatchInstruction: (id: string, data: Partial<DispatchInstruction>) => {
      const idx = db.dispatchInstructions.findIndex(i => i.id === id)
      if (idx > -1) {
        db.dispatchInstructions[idx] = { ...db.dispatchInstructions[idx], ...data }
        saveDB()
        return db.dispatchInstructions[idx]
      }
      return null
    },

    getAlarms: () => [...db.alarms],
    addAlarm: (alarm: Omit<Alarm, 'id' | 'timestamp'>) => {
      const newAlarm = { ...alarm, id: uuidv4(), timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss') } as Alarm
      db.alarms.unshift(newAlarm)
      if (db.alarms.length > 1000) db.alarms.pop()
      saveDB()
      return newAlarm
    },
    updateAlarm: (id: string, data: Partial<Alarm>) => {
      const idx = db.alarms.findIndex(a => a.id === id)
      if (idx > -1) {
        db.alarms[idx] = { ...db.alarms[idx], ...data }
        saveDB()
        return db.alarms[idx]
      }
      return null
    },

    getWorkOrders: () => [...db.workOrders],
    getWorkOrder: (id: string) => db.workOrders.find(w => w.id === id),
    addWorkOrder: (order: Omit<WorkOrder, 'id' | 'createdAt'>) => {
      const newOrder = { ...order, id: uuidv4(), createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } as WorkOrder
      db.workOrders.push(newOrder)
      saveDB()
      return newOrder
    },
    updateWorkOrder: (id: string, data: Partial<WorkOrder>) => {
      const idx = db.workOrders.findIndex(w => w.id === id)
      if (idx > -1) {
        db.workOrders[idx] = { ...db.workOrders[idx], ...data }
        saveDB()
        return db.workOrders[idx]
      }
      return null
    },

    getSpareParts: () => [...db.spareParts],
    getSparePart: (id: string) => db.spareParts.find(s => s.id === id),
    updateSparePart: (id: string, data: Partial<SparePart>) => {
      const idx = db.spareParts.findIndex(s => s.id === id)
      if (idx > -1) {
        db.spareParts[idx] = { ...db.spareParts[idx], ...data, lastUpdated: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        saveDB()
        return db.spareParts[idx]
      }
      return null
    },

    getStaff: () => [...db.staff],
    getStaffMember: (id: string) => db.staff.find(s => s.id === id),
    updateStaff: (id: string, data: Partial<Staff>) => {
      const idx = db.staff.findIndex(s => s.id === id)
      if (idx > -1) {
        db.staff[idx] = { ...db.staff[idx], ...data }
        saveDB()
        return db.staff[idx]
      }
      return null
    },

    getTeams: () => [...db.teams],
    getTeam: (id: string) => db.teams.find(t => t.id === id),

    getSchedules: () => [...db.schedules],
    addSchedule: (schedule: Omit<Schedule, 'id'>) => {
      const newSchedule = { ...schedule, id: uuidv4() } as Schedule
      db.schedules.push(newSchedule)
      saveDB()
      return newSchedule
    },
    updateSchedule: (id: string, data: Partial<Schedule>) => {
      const idx = db.schedules.findIndex(s => s.id === id)
      if (idx > -1) {
        db.schedules[idx] = { ...db.schedules[idx], ...data }
        saveDB()
        return db.schedules[idx]
      }
      return null
    },

    getSwapRequests: () => [...db.swapRequests],
    addSwapRequest: (request: Omit<SwapRequest, 'id' | 'createdAt'>) => {
      const newRequest = { ...request, id: uuidv4(), createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } as SwapRequest
      db.swapRequests.push(newRequest)
      saveDB()
      return newRequest
    },
    updateSwapRequest: (id: string, data: Partial<SwapRequest>) => {
      const idx = db.swapRequests.findIndex(r => r.id === id)
      if (idx > -1) {
        db.swapRequests[idx] = { ...db.swapRequests[idx], ...data }
        saveDB()
        return db.swapRequests[idx]
      }
      return null
    },

    getMaintenancePlans: () => [...db.maintenancePlans],
    getLoadForecasts: () => [...db.loadForecasts],

    getTopology: (): { nodes: TopologyNode[], links: TopologyLink[] } => {
      const nodes: TopologyNode[] = []
      const links: TopologyLink[] = []

      db.plants.forEach((plant, i) => {
        nodes.push({
          id: plant.id, name: plant.name, type: 'plant',
          x: 100 + (i % 3) * 250, y: 80 + Math.floor(i / 3) * 200,
          voltage: plant.ratedVoltage, load: plant.currentOutput / plant.maxOutput * 100,
          status: plant.status
        })
      })

      db.substations.forEach((sub, i) => {
        nodes.push({
          id: sub.id, name: sub.name, type: 'substation',
          x: 180 + (i % 3) * 250, y: 150 + Math.floor(i / 3) * 200 + 50,
          voltage: sub.busVoltage, load: (sub.capacity > 0 ? 50 : 0),
          status: sub.status
        })
      })

      db.lines.forEach(line => {
        links.push({
          id: line.id, source: line.fromSubstation, target: line.toSubstation,
          name: line.name, flow: line.currentFlow, maxCapacity: line.maxCapacity,
          loadRate: line.currentFlow / line.maxCapacity * 100, status: line.status
        })
      })

      return { nodes, links }
    },

    generateRealTimeData: (): RealTimeData => {
      const lines = db.lines.map(line => {
        const variation = (Math.random() - 0.5) * 0.1
        const flow = Math.round(line.currentFlow * (1 + variation))
        return {
          lineId: line.id, lineName: line.name,
          flow: Math.min(flow, line.maxCapacity),
          maxCapacity: line.maxCapacity,
          loadRate: flow / line.maxCapacity * 100,
          fromVoltage: 220 + (Math.random() - 0.5) * 10,
          toVoltage: 220 + (Math.random() - 0.5) * 10
        }
      })

      const plants = db.plants.map(plant => {
        if (plant.status === 'running') {
          const variation = (Math.random() - 0.5) * 0.05
          return {
            plantId: plant.id, plantName: plant.name,
            currentOutput: Math.round(plant.currentOutput * (1 + variation)),
            maxOutput: plant.maxOutput
          }
        }
        return { plantId: plant.id, plantName: plant.name, currentOutput: 0, maxOutput: plant.maxOutput }
      })

      const substations = db.substations.map(sub => ({
        substationId: sub.id, substationName: sub.name,
        busVoltage: sub.busVoltage + (Math.random() - 0.5) * 5
      }))

      const totalOutput = plants.reduce((sum, p) => sum + p.currentOutput, 0)
      const totalLoad = lines.reduce((sum, l) => sum + l.flow, 0) / 2
      
      const data: RealTimeData = {
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        frequency: 50 + (Math.random() - 0.5) * 0.2,
        avgVoltage: substations.reduce((sum, s) => sum + s.busVoltage, 0) / substations.length,
        totalLoad,
        totalOutput,
        lines,
        plants,
        substations
      }

      db.realTimeData.push(data)
      if (db.realTimeData.length > 1000) db.realTimeData.shift()
      saveDB()

      return data
    },

    getStatistics: (region: string, startTime: string, endTime: string): StatisticsData => {
      const filteredPlants = region === '全网' ? db.plants : db.plants.filter(p => p.region === region)
      const filteredLines = db.lines.filter(l => {
        const fromSub = db.substations.find(s => s.id === l.fromSubstation)
        const toSub = db.substations.find(s => s.id === l.toSubstation)
        if (region === '全网') return true
        return fromSub?.region === region || toSub?.region === region
      })

      const totalCapacity = filteredPlants.reduce((sum, p) => sum + p.capacity, 0)
      const days = dayjs(endTime).diff(dayjs(startTime), 'day') || 1
      
      const totalGeneration = totalCapacity * 24 * days * 0.65
      const lineLossRate = 4.5 + Math.random() * 2
      const totalConsumption = totalGeneration * (1 - lineLossRate / 100)
      
      const availableCount = filteredPlants.filter(p => p.status === 'running').length
      const equipmentAvailability = filteredPlants.length > 0 ? (availableCount / filteredPlants.length * 100) : 0

      return {
        region, startTime, endTime,
        totalGeneration: Math.round(totalGeneration),
        totalConsumption: Math.round(totalConsumption),
        lineLossRate: Math.round(lineLossRate * 10) / 10,
        equipmentAvailability: Math.round(equipmentAvailability * 10) / 10,
        faultCount: Math.floor(Math.random() * 5),
        accidentCount: Math.floor(Math.random() * 2),
        peakLoad: Math.round(totalCapacity * 0.85),
        valleyLoad: Math.round(totalCapacity * 0.4)
      }
    },

    resetDB: () => {
      db = getDefaultDB()
      saveDB()
    }
  }
}
