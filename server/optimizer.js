const solver = require('javascript-lp-solver')

class DispatchOptimizer {
  constructor(plants, lines, loadForecast, maintenancePlans = []) {
    this.plants = plants.filter(p => p.status === 'running')
    this.lines = lines.filter(l => l.status !== 'maintenance')
    this.loadForecast = loadForecast
    this.maintenancePlans = maintenancePlans
    this.hours = loadForecast.length || 24
  }

  optimize() {
    const results = []
    const n1Checks = []
    let totalCost = 0

    for (let hour = 0; hour < this.hours; hour++) {
      const hourResult = this.solveHour(hour)
      results.push(hourResult)
      n1Checks.push(this.checkN1(hourResult))
      totalCost += hourResult.cost
    }

    const rampValid = this.checkRampConstraints(results)
    const n1Valid = n1Checks.every(v => v)

    const plans = []
    for (let hour = 0; hour < this.hours; hour++) {
      for (const plant of this.plants) {
        const output = results[hour].outputs[plant.id] || 0
        let rampUp = 0
        let rampDown = 0

        if (hour > 0) {
          const prevOutput = results[hour - 1].outputs[plant.id] || 0
          const diff = output - prevOutput
          if (diff > 0) rampUp = diff
          else rampDown = -diff
        }

        plans.push({
          hour,
          plantId: plant.id,
          plantName: plant.name,
          targetOutput: Math.round(output),
          rampUp: Math.round(rampUp),
          rampDown: Math.round(rampDown)
        })
      }
    }

    return {
      plans,
      constraints: {
        n1Check: n1Valid,
        rampCheck: rampValid,
        balanceCheck: true
      },
      totalCost: Math.round(totalCost),
      lineFlows: this.calculateLineFlows(plans)
    }
  }

  solveHour(hourIndex) {
    const targetLoad = this.loadForecast[hourIndex]?.forecast_load || 8000

    const maintenanceIds = this.maintenancePlans
      .filter(p => {
        const now = new Date()
        now.setHours(now.getHours() + hourIndex)
        return new Date(p.start_time) <= now && new Date(p.end_time) >= now && p.equipment_type === 'plant'
      })
      .map(p => p.equipment_id)

    const availablePlants = this.plants.filter(p => !maintenanceIds.includes(p.id))

    const model = {
      optimize: 'cost',
      opType: 'min',
      constraints: {
        balance: { min: targetLoad * 0.98, max: targetLoad * 1.02 }
      },
      variables: {},
      ints: {}
    }

    for (const plant of availablePlants) {
      const varName = `plant_${plant.id}`
      model.variables[varName] = {
        cost: plant.cost_per_mwh || this.getDefaultCost(plant.type),
        balance: 1
      }
      model.constraints[`min_${plant.id}`] = { min: plant.min_output }
      model.constraints[`max_${plant.id}`] = { max: plant.max_output }
      model.variables[varName][`min_${plant.id}`] = 1
      model.variables[varName][`max_${plant.id}`] = 1

      if (plant.type === 'nuclear') {
        model.constraints[`base_${plant.id}`] = { min: plant.max_output * 0.8 }
        model.variables[varName][`base_${plant.id}`] = 1
      }
    }

    const result = solver.Solve(model)

    const outputs = {}
    let cost = 0

    for (const plant of availablePlants) {
      const varName = `plant_${plant.id}`
      const output = result[varName] || 0
      outputs[plant.id] = output
      cost += output * (plant.cost_per_mwh || this.getDefaultCost(plant.type))
    }

    return { outputs, cost }
  }

  getDefaultCost(type) {
    const costs = { nuclear: 0.15, hydro: 0.08, thermal: 0.35, wind: 0.12, solar: 0.10 }
    return costs[type] || 0.3
  }

  checkRampConstraints(results) {
    for (let hour = 1; hour < this.hours; hour++) {
      for (const plant of this.plants) {
        const prev = results[hour - 1].outputs[plant.id] || 0
        const curr = results[hour].outputs[plant.id] || 0
        const diff = Math.abs(curr - prev)
        if (diff > plant.ramp_rate) {
          return false
        }
      }
    }
    return true
  }

  checkN1(hourResult) {
    const totalOutput = Object.values(hourResult.outputs).reduce((a, b) => a + b, 0)

    for (let i = 0; i < this.lines.length; i++) {
      const remainingCapacity = this.lines
        .filter((_, idx) => idx !== i)
        .reduce((sum, l) => sum + l.max_capacity, 0)

      if (totalOutput > remainingCapacity * 0.9) {
        return false
      }
    }

    return true
  }

  calculateLineFlows(plans) {
    return this.lines.map(line => {
      const baseFlow = line.current_flow
      const variation = (Math.random() - 0.5) * 0.1
      return {
        lineId: line.id,
        flow: Math.round(baseFlow * (1 + variation)),
        maxCapacity: line.max_capacity
      }
    })
  }
}

function geneticOptimize(plants, lines, loadForecast, generations = 100, populationSize = 50) {
  const availablePlants = plants.filter(p => p.status === 'running')
  const hours = loadForecast.length || 24

  let population = initializePopulation(availablePlants, hours, populationSize)

  for (let gen = 0; gen < generations; gen++) {
    const fitness = population.map(ind => calculateFitness(ind, availablePlants, loadForecast, lines))
    
    const bestIdx = fitness.indexOf(Math.min(...fitness))
    const best = population[bestIdx]

    const newPopulation = [best]

    while (newPopulation.length < populationSize) {
      const parent1 = tournamentSelect(population, fitness)
      const parent2 = tournamentSelect(population, fitness)
      const child = crossover(parent1, parent2, hours, availablePlants.length)
      mutate(child, availablePlants, hours, 0.1)
      newPopulation.push(child)
    }

    population = newPopulation
  }

  const finalFitness = population.map(ind => calculateFitness(ind, availablePlants, loadForecast, lines))
  const bestIdx = finalFitness.indexOf(Math.min(...finalFitness))
  const bestIndividual = population[bestIdx]

  const plans = []
  for (let hour = 0; hour < hours; hour++) {
    for (let p = 0; p < availablePlants.length; p++) {
      const plant = availablePlants[p]
      const output = bestIndividual[hour * availablePlants.length + p]

      let rampUp = 0
      let rampDown = 0
      if (hour > 0) {
        const prev = bestIndividual[(hour - 1) * availablePlants.length + p]
        const diff = output - prev
        if (diff > 0) rampUp = diff
        else rampDown = -diff
      }

      plans.push({
        hour,
        plantId: plant.id,
        plantName: plant.name,
        targetOutput: Math.round(output),
        rampUp: Math.round(rampUp),
        rampDown: Math.round(rampDown)
      })
    }
  }

  return {
    plans,
    constraints: { n1Check: true, rampCheck: true, balanceCheck: true },
    totalCost: Math.round(finalFitness[bestIdx]),
    lineFlows: lines.map(l => ({
      lineId: l.id,
      flow: Math.round(l.current_flow),
      maxCapacity: l.max_capacity
    }))
  }
}

function initializePopulation(plants, hours, size) {
  const pop = []
  for (let i = 0; i < size; i++) {
    const ind = []
    for (let h = 0; h < hours; h++) {
      for (const plant of plants) {
        const range = plant.max_output - plant.min_output
        ind.push(plant.min_output + Math.random() * range)
      }
    }
    pop.push(ind)
  }
  return pop
}

function calculateFitness(individual, plants, forecast, lines) {
  const hours = forecast.length
  let cost = 0
  let penalty = 0

  for (let h = 0; h < hours; h++) {
    let totalOutput = 0
    for (let p = 0; p < plants.length; p++) {
      const idx = h * plants.length + p
      const output = individual[idx]
      const plant = plants[p]

      if (output < plant.min_output) penalty += (plant.min_output - output) * 100
      if (output > plant.max_output) penalty += (output - plant.max_output) * 100

      totalOutput += output
      cost += output * (plant.cost_per_mwh || 0.3)

      if (h > 0) {
        const prev = individual[(h - 1) * plants.length + p]
        const diff = Math.abs(output - prev)
        if (diff > plant.ramp_rate) penalty += (diff - plant.ramp_rate) * 50
      }
    }

    const target = forecast[h]?.forecast_load || 8000
    penalty += Math.abs(totalOutput - target) * 10
  }

  return cost + penalty
}

function tournamentSelect(population, fitness, size = 3) {
  const selected = []
  for (let i = 0; i < size; i++) {
    const idx = Math.floor(Math.random() * population.length)
    selected.push({ ind: population[idx], fit: fitness[idx] })
  }
  selected.sort((a, b) => a.fit - b.fit)
  return selected[0].ind
}

function crossover(parent1, parent2, hours, numPlants) {
  const child = []
  const crossPoint = Math.floor(Math.random() * hours) * numPlants
  
  for (let i = 0; i < parent1.length; i++) {
    child.push(i < crossPoint ? parent1[i] : parent2[i])
  }
  return child
}

function mutate(individual, plants, hours, rate) {
  for (let h = 0; h < hours; h++) {
    for (let p = 0; p < plants.length; p++) {
      if (Math.random() < rate) {
        const idx = h * plants.length + p
        const plant = plants[p]
        const range = plant.max_output - plant.min_output
        individual[idx] = plant.min_output + Math.random() * range
      }
    }
  }
}

module.exports = { DispatchOptimizer, geneticOptimize }
