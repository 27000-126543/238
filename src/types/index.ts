export interface PowerPlant {
  id: string
  name: string
  type: 'thermal' | 'hydro' | 'nuclear' | 'wind' | 'solar'
  capacity: number
  ratedVoltage: number
  ratedCurrent: number
  maxOutput: number
  minOutput: number
  rampRate: number
  status: 'running' | 'stopped' | 'maintenance' | 'fault'
  currentOutput: number
  runHours: number
  startCount: number
  location: string
  region: string
  createTime: string
  updateTime: string
}

export interface Substation {
  id: string
  name: string
  voltageLevel: number
  capacity: number
  transformerCount: number
  status: 'normal' | 'warning' | 'fault' | 'maintenance'
  location: string
  region: string
  busVoltage: number
  createTime: string
  updateTime: string
}

export interface TransmissionLine {
  id: string
  name: string
  fromSubstation: string
  toSubstation: string
  voltageLevel: number
  ratedCapacity: number
  length: number
  status: 'normal' | 'warning' | 'fault' | 'maintenance'
  currentFlow: number
  maxCapacity: number
  createTime: string
  updateTime: string
}

export interface LoadForecast {
  id: string
  timestamp: string
  region: string
  forecastLoad: number
  actualLoad?: number
  source: 'historical' | 'weather' | 'mixed'
}

export interface MaintenancePlan {
  id: string
  equipmentId: string
  equipmentType: 'plant' | 'substation' | 'line'
  startTime: string
  endTime: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

export interface DispatchScheme {
  id: string
  name: string
  startTime: string
  endTime: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executed'
  createdAt: string
  createdBy: string
  approvedBy?: string
  approvedAt?: string
  n1CheckPassed: boolean
  rampCheckPassed: boolean
  plans: DispatchPlanItem[]
}

export interface DispatchPlanItem {
  hour: number
  plantId: string
  plantName: string
  targetOutput: number
  rampUp: number
  rampDown: number
}

export interface DispatchInstruction {
  id: string
  schemeId: string
  targetStation: string
  content: string
  status: 'sent' | 'confirmed' | 'adjust_requested' | 'adjust_approved' | 'adjust_rejected'
  sentAt: string
  confirmedAt?: string
  operatorName?: string
  adjustReason?: string
}

export interface RealTimeData {
  timestamp: string
  frequency: number
  avgVoltage: number
  totalLoad: number
  totalOutput: number
  lines: LineFlowData[]
  plants: PlantOutputData[]
  substations: SubstationData[]
}

export interface LineFlowData {
  lineId: string
  lineName: string
  flow: number
  maxCapacity: number
  loadRate: number
  fromVoltage: number
  toVoltage: number
}

export interface PlantOutputData {
  plantId: string
  plantName: string
  currentOutput: number
  maxOutput: number
}

export interface SubstationData {
  substationId: string
  substationName: string
  busVoltage: number
}

export interface Alarm {
  id: string
  type: 'frequency' | 'voltage' | 'flow' | 'equipment'
  level: 'warning' | 'danger' | 'critical'
  equipmentId?: string
  equipmentName?: string
  message: string
  value: number
  threshold: number
  timestamp: string
  acknowledged: boolean
  handled: boolean
  handledBy?: string
  handledAt?: string
}

export interface EmergencyPlan {
  id: string
  name: string
  type: 'load_shedding' | 'generator_shedding' | 'grid_split'
  triggerCondition: string
  actionSteps: string
  status: 'active' | 'inactive'
}

export interface WorkOrder {
  id: string
  equipmentId: string
  equipmentType: 'plant' | 'substation' | 'line'
  equipmentName: string
  type: 'routine' | 'corrective' | 'preventive'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  description: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  assignedTeam?: string
  assignedMembers?: string[]
  sparePartsNeeded: SparePartItem[]
  estimatedHours: number
  actualHours?: number
  createdAt: string
  completedAt?: string
}

export interface SparePartItem {
  partId: string
  partName: string
  quantity: number
  unit: string
}

export interface SparePart {
  id: string
  name: string
  model: string
  quantity: number
  unit: string
  safeStock: number
  location: string
  lastUpdated: string
}

export interface Staff {
  id: string
  name: string
  position: string
  skills: string[]
  maxWorkHours: number
  currentWorkHours: number
  phone: string
  status: 'on_duty' | 'off_duty' | 'leave' | 'training'
}

export interface Team {
  id: string
  name: string
  members: string[]
  leader: string
  skills: string[]
}

export interface Schedule {
  id: string
  date: string
  shift: 'morning' | 'afternoon' | 'night'
  staffId: string
  staffName: string
  position: string
  isSwapped: boolean
  originalStaffId?: string
}

export interface SwapRequest {
  id: string
  fromStaffId: string
  fromStaffName: string
  toStaffId: string
  toStaffName: string
  date: string
  shift: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedBy?: string
}

export interface StatisticsData {
  region: string
  startTime: string
  endTime: string
  totalGeneration: number
  totalConsumption: number
  lineLossRate: number
  equipmentAvailability: number
  faultCount: number
  accidentCount: number
  peakLoad: number
  valleyLoad: number
}

export interface TopologyNode {
  id: string
  name: string
  type: 'plant' | 'substation'
  x: number
  y: number
  voltage: number
  load: number
  status: string
}

export interface TopologyLink {
  id: string
  source: string
  target: string
  name: string
  flow: number
  maxCapacity: number
  loadRate: number
  status: string
}
