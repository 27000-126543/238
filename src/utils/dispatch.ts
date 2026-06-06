import type { PowerPlant, TransmissionLine, LoadForecast, MaintenancePlan, DispatchPlanItem } from '@/types'
import { useDB } from '@/database'

export interface DispatchConstraint {
  n1Check: boolean
  rampCheck: boolean
  balanceCheck: boolean
}

export interface DispatchResult {
  plans: DispatchPlanItem[]
  constraints: DispatchConstraint
  totalCost: number
  lineFlows: { lineId: string; flow: number; maxCapacity: number }[]
}

export function generateDispatchScheme(
  hours: number = 24,
  weatherData?: { temperature: number; windSpeed: number; solarRadiation: number }[]
): DispatchResult {
  const db = useDB()
  const plants = db.getPlants().filter(p => p.status === 'running')
  const lines = db.getLines().filter(l => l.status !== 'maintenance')
  const forecasts = db.getLoadForecasts()
  const maintenancePlans = db.getMaintenancePlans().filter(p => p.status !== 'completed' && p.status !== 'cancelled')

  const plans: DispatchPlanItem[] = []
  const lineFlows: { lineId: string; flow: number; maxCapacity: number }[] = []

  for (let hour = 0; hour < hours; hour++) {
    const forecast = forecasts[hour] || forecasts[forecasts.length - 1]
    let targetLoad = forecast?.forecastLoad || 8000

    if (weatherData && weatherData[hour]) {
      const w = weatherData[hour]
      targetLoad *= 1 + (w.temperature - 25) * 0.01
    }

    const maintenanceIds = maintenancePlans
      .filter(p => {
        const now = new Date()
        now.setHours(now.getHours() + hour)
        return new Date(p.startTime) <= now && new Date(p.endTime) >= now && p.equipmentType === 'plant'
      })
      .map(p => p.equipmentId)

    const availablePlants = plants.filter(p => !maintenanceIds.includes(p.id))

    const sortedPlants = [...availablePlants].sort((a, b) => {
      const costA = getPlantCost(a.type)
      const costB = getPlantCost(b.type)
      return costA - costB
    })

    let remainingLoad = targetLoad
    const hourPlants: { plant: PowerPlant; output: number }[] = []

    for (const plant of sortedPlants) {
      if (remainingLoad <= 0) break

      let maxOutput = plant.maxOutput
      if (hour > 0) {
        const prevPlan = plans.find(p => p.hour === hour - 1 && p.plantId === plant.id)
        if (prevPlan) {
          maxOutput = Math.min(maxOutput, prevPlan.targetOutput + plant.rampRate)
        }
      }

      const output = Math.min(maxOutput, remainingLoad, plant.maxOutput)
      const finalOutput = Math.max(output, plant.minOutput)

      if (finalOutput > 0) {
        hourPlants.push({ plant, output: Math.round(finalOutput) })
        remainingLoad -= finalOutput
      }
    }

    const deficit = remainingLoad > 0 ? remainingLoad : 0
    if (deficit > 0) {
      const nuclearPlants = hourPlants.filter(h => h.plant.type === 'nuclear')
      for (const h of nuclearPlants) {
        const extra = Math.min(deficit, h.plant.maxOutput - h.output)
        h.output += extra
        remainingLoad -= extra
      }
    }

    hourPlants.forEach(({ plant, output }) => {
      let rampUp = 0
      let rampDown = 0
      if (hour > 0) {
        const prevPlan = plans.find(p => p.hour === hour - 1 && p.plantId === plant.id)
        if (prevPlan) {
          const diff = output - prevPlan.targetOutput
          if (diff > 0) rampUp = diff
          else rampDown = -diff
        }
      }

      plans.push({
        hour,
        plantId: plant.id,
        plantName: plant.name,
        targetOutput: output,
        rampUp,
        rampDown
      })
    })
  }

  lines.forEach(line => {
    const avgFlow = line.currentFlow
    lineFlows.push({
      lineId: line.id,
      flow: Math.round(avgFlow),
      maxCapacity: line.maxCapacity
    })
  })

  const rampCheck = checkRampConstraints(plans, plants)
  const n1Check = checkN1Constraint(lineFlows, lines)
  const balanceCheck = checkPowerBalance(plans, forecasts, hours)

  const totalCost = plans.reduce((sum, p) => {
    const plant = plants.find(pl => pl.id === p.plantId)
    if (plant) {
      sum += p.targetOutput * getPlantCost(plant.type)
    }
    return sum
  }, 0)

  return {
    plans,
    constraints: { n1Check, rampCheck, balanceCheck },
    totalCost: Math.round(totalCost),
    lineFlows
  }
}

function getPlantCost(type: PowerPlant['type']): number {
  const costs: Record<PowerPlant['type'], number> = {
    nuclear: 0.15,
    hydro: 0.08,
    thermal: 0.35,
    wind: 0.12,
    solar: 0.10
  }
  return costs[type] || 0.3
}

function checkRampConstraints(plans: DispatchPlanItem[], plants: PowerPlant[]): boolean {
  for (const plan of plans) {
    const plant = plants.find(p => p.id === plan.plantId)
    if (!plant) continue
    if (plan.rampUp > plant.rampRate || plan.rampDown > plant.rampRate) {
      return false
    }
  }
  return true
}

function checkN1Constraint(
  lineFlows: { lineId: string; flow: number; maxCapacity: number }[],
  lines: TransmissionLine[]
): boolean {
  for (let i = 0; i < lines.length; i++) {
    const remainingLines = lineFlows.filter((_, idx) => idx !== i)
    const totalFlow = remainingLines.reduce((sum, l) => sum + l.flow, 0)
    const totalCapacity = remainingLines.reduce((sum, l) => sum + l.maxCapacity, 0)
    
    if (totalFlow > totalCapacity * 0.9) {
      return false
    }
  }
  return true
}

function checkPowerBalance(
  plans: DispatchPlanItem[],
  forecasts: LoadForecast[],
  hours: number
): boolean {
  for (let hour = 0; hour < hours; hour++) {
    const hourPlans = plans.filter(p => p.hour === hour)
    const totalOutput = hourPlans.reduce((sum, p) => sum + p.targetOutput, 0)
    const forecast = forecasts[hour] || forecasts[forecasts.length - 1]
    
    if (forecast) {
      const diff = Math.abs(totalOutput - forecast.forecastLoad)
      if (diff > forecast.forecastLoad * 0.1) {
        return false
      }
    }
  }
  return true
}

export function findOptimalPath(
  fromId: string,
  toId: string,
  lines: { id: string; fromSubstation: string; toSubstation: string; maxCapacity: number; currentFlow: number }[]
): string[] | null {
  const graph: Map<string, { to: string; lineId: string; capacity: number }[]> = new Map()

  lines.forEach(line => {
    if (!graph.has(line.fromSubstation)) {
      graph.set(line.fromSubstation, [])
    }
    if (!graph.has(line.toSubstation)) {
      graph.set(line.toSubstation, [])
    }
    const remainingCapacity = line.maxCapacity - line.currentFlow
    graph.get(line.fromSubstation)!.push({ to: line.toSubstation, lineId: line.id, capacity: remainingCapacity })
    graph.get(line.toSubstation)!.push({ to: line.fromSubstation, lineId: line.id, capacity: remainingCapacity })
  })

  const queue: { current: string; path: string[]; minCapacity: number }[] = [{ current: fromId, path: [], minCapacity: Infinity }]
  const visited: Set<string> = new Set()

  while (queue.length > 0) {
    queue.sort((a, b) => b.minCapacity - a.minCapacity)
    const { current, path, minCapacity } = queue.shift()!

    if (current === toId) {
      return path
    }

    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = graph.get(current) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        const newMinCapacity = Math.min(minCapacity, neighbor.capacity)
        queue.push({
          current: neighbor.to,
          path: [...path, neighbor.lineId],
          minCapacity: newMinCapacity
        })
      }
    }
  }

  return null
}
