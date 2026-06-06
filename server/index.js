const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { initDatabase, query, run, getOne } = require('./db')
const { DispatchOptimizer, geneticOptimize } = require('./optimizer')

const app = express()
const PORT = process.env.PORT || 3001

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/plants', (req, res) => {
  const plants = query('SELECT * FROM power_plants ORDER BY create_time DESC')
  res.json(plants.map(rowToCamel))
})

app.get('/api/plants/:id', (req, res) => {
  const plant = getOne('SELECT * FROM power_plants WHERE id = ?', [req.params.id])
  if (!plant) return res.status(404).json({ error: 'Not found' })
  res.json(rowToCamel(plant))
})

app.post('/api/plants', (req, res) => {
  const body = camelToSnake(req.body)
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO power_plants (
    id, name, type, capacity, rated_voltage, rated_current,
    max_output, min_output, ramp_rate, status, current_output,
    run_hours, start_count, location, region, cost_per_mwh,
    create_time, update_time
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, body.name, body.type, body.capacity, body.rated_voltage, body.rated_current,
    body.max_output, body.min_output, body.ramp_rate, body.status, body.current_output || 0,
    body.run_hours || 0, body.start_count || 0, body.location, body.region, body.cost_per_mwh || 0.3,
    now, now
  ])
  const plant = getOne('SELECT * FROM power_plants WHERE id = ?', [id])
  res.status(201).json(rowToCamel(plant))
})

app.put('/api/plants/:id', (req, res) => {
  const body = camelToSnake(req.body)
  const now = new Date().toISOString()
  const existing = getOne('SELECT * FROM power_plants WHERE id = ?', [req.params.id])
  if (!existing) return res.status(404).json({ error: 'Not found' })
  
  run(`UPDATE power_plants SET 
    name = ?, type = ?, capacity = ?, rated_voltage = ?, rated_current = ?,
    max_output = ?, min_output = ?, ramp_rate = ?, status = ?, current_output = ?,
    run_hours = ?, start_count = ?, location = ?, region = ?, cost_per_mwh = ?,
    update_time = ?
    WHERE id = ?`, [
    body.name !== undefined ? body.name : existing.name,
    body.type !== undefined ? body.type : existing.type,
    body.capacity !== undefined ? body.capacity : existing.capacity,
    body.rated_voltage !== undefined ? body.rated_voltage : existing.rated_voltage,
    body.rated_current !== undefined ? body.rated_current : existing.rated_current,
    body.max_output !== undefined ? body.max_output : existing.max_output,
    body.min_output !== undefined ? body.min_output : existing.min_output,
    body.ramp_rate !== undefined ? body.ramp_rate : existing.ramp_rate,
    body.status !== undefined ? body.status : existing.status,
    body.current_output !== undefined ? body.current_output : existing.current_output,
    body.run_hours !== undefined ? body.run_hours : existing.run_hours,
    body.start_count !== undefined ? body.start_count : existing.start_count,
    body.location !== undefined ? body.location : existing.location,
    body.region !== undefined ? body.region : existing.region,
    body.cost_per_mwh !== undefined ? body.cost_per_mwh : existing.cost_per_mwh,
    now,
    req.params.id
  ])
  const plant = getOne('SELECT * FROM power_plants WHERE id = ?', [req.params.id])
  res.json(rowToCamel(plant))
})

app.delete('/api/plants/:id', (req, res) => {
  run('DELETE FROM power_plants WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

app.get('/api/substations', (req, res) => {
  const subs = query('SELECT * FROM substations ORDER BY create_time DESC')
  res.json(subs.map(rowToCamel))
})

app.get('/api/substations/:id', (req, res) => {
  const sub = getOne('SELECT * FROM substations WHERE id = ?', [req.params.id])
  if (!sub) return res.status(404).json({ error: 'Not found' })
  res.json(rowToCamel(sub))
})

app.post('/api/substations', (req, res) => {
  const body = camelToSnake(req.body)
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO substations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, body.name, body.voltage_level, body.capacity, body.transformer_count,
    body.status, body.location, body.region, body.bus_voltage, body.x || 0, body.y || 0,
    now, now
  ])
  const sub = getOne('SELECT * FROM substations WHERE id = ?', [id])
  res.status(201).json(rowToCamel(sub))
})

app.put('/api/substations/:id', (req, res) => {
  const body = camelToSnake(req.body)
  const now = new Date().toISOString()
  const existing = getOne('SELECT * FROM substations WHERE id = ?', [req.params.id])
  if (!existing) return res.status(404).json({ error: 'Not found' })
  
  run(`UPDATE substations SET 
    name = ?, voltage_level = ?, capacity = ?, transformer_count = ?,
    status = ?, location = ?, region = ?, bus_voltage = ?, x = ?, y = ?,
    update_time = ?
    WHERE id = ?`, [
    body.name !== undefined ? body.name : existing.name,
    body.voltage_level !== undefined ? body.voltage_level : existing.voltage_level,
    body.capacity !== undefined ? body.capacity : existing.capacity,
    body.transformer_count !== undefined ? body.transformer_count : existing.transformer_count,
    body.status !== undefined ? body.status : existing.status,
    body.location !== undefined ? body.location : existing.location,
    body.region !== undefined ? body.region : existing.region,
    body.bus_voltage !== undefined ? body.bus_voltage : existing.bus_voltage,
    body.x !== undefined ? body.x : existing.x,
    body.y !== undefined ? body.y : existing.y,
    now,
    req.params.id
  ])
  const sub = getOne('SELECT * FROM substations WHERE id = ?', [req.params.id])
  res.json(rowToCamel(sub))
})

app.delete('/api/substations/:id', (req, res) => {
  run('DELETE FROM substations WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

app.get('/api/lines', (req, res) => {
  const lines = query('SELECT * FROM transmission_lines ORDER BY create_time DESC')
  res.json(lines.map(rowToCamel))
})

app.get('/api/lines/:id', (req, res) => {
  const line = getOne('SELECT * FROM transmission_lines WHERE id = ?', [req.params.id])
  if (!line) return res.status(404).json({ error: 'Not found' })
  res.json(rowToCamel(line))
})

app.post('/api/lines', (req, res) => {
  const body = camelToSnake(req.body)
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO transmission_lines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, body.name, body.from_substation, body.to_substation, body.voltage_level,
    body.rated_capacity, body.max_capacity, body.length, body.status, body.current_flow || 0,
    body.reactance || 0.1, now, now
  ])
  const line = getOne('SELECT * FROM transmission_lines WHERE id = ?', [id])
  res.status(201).json(rowToCamel(line))
})

app.put('/api/lines/:id', (req, res) => {
  const body = camelToSnake(req.body)
  const now = new Date().toISOString()
  const existing = getOne('SELECT * FROM transmission_lines WHERE id = ?', [req.params.id])
  if (!existing) return res.status(404).json({ error: 'Not found' })
  
  run(`UPDATE transmission_lines SET 
    name = ?, status = ?, current_flow = ?, update_time = ?
    WHERE id = ?`, [
    body.name !== undefined ? body.name : existing.name,
    body.status !== undefined ? body.status : existing.status,
    body.current_flow !== undefined ? body.current_flow : existing.current_flow,
    now,
    req.params.id
  ])
  const line = getOne('SELECT * FROM transmission_lines WHERE id = ?', [req.params.id])
  res.json(rowToCamel(line))
})

app.delete('/api/lines/:id', (req, res) => {
  run('DELETE FROM transmission_lines WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

app.get('/api/topology', (req, res) => {
  const plants = query('SELECT * FROM power_plants').map(rowToCamel)
  const subs = query('SELECT * FROM substations').map(rowToCamel)
  const lines = query('SELECT * FROM transmission_lines').map(rowToCamel)

  const nodes = [
    ...plants.map((p, i) => ({
      id: p.id,
      name: p.name,
      type: 'plant',
      x: 80 + (i % 3) * 250,
      y: 60 + Math.floor(i / 3) * 180,
      voltage: p.ratedVoltage,
      load: p.maxOutput > 0 ? (p.currentOutput / p.maxOutput * 100) : 0,
      status: p.status
    })),
    ...subs.map(s => ({
      id: s.id,
      name: s.name,
      type: 'substation',
      x: s.x || 150,
      y: s.y || 200,
      voltage: s.busVoltage || 220,
      load: 50,
      status: s.status
    }))
  ]

  const links = lines.map(l => ({
    id: l.id,
    source: l.fromSubstation,
    target: l.toSubstation,
    name: l.name,
    flow: l.currentFlow,
    maxCapacity: l.maxCapacity,
    loadRate: l.maxCapacity > 0 ? (l.currentFlow / l.maxCapacity * 100) : 0,
    status: l.status
  }))

  res.json({ nodes, links })
})

app.post('/api/dispatch/generate', (req, res) => {
  const { hours = 24, useGenetic = false, weatherData } = req.body

  const plants = query('SELECT * FROM power_plants').map(rowToCamel)
  const lines = query('SELECT * FROM transmission_lines').map(rowToCamel)
  const forecast = query('SELECT * FROM load_forecasts ORDER BY timestamp LIMIT ?', [hours])
  
  const maintenancePlans = query('SELECT * FROM maintenance_plans WHERE status != ?', ['completed'])
    .map(rowToCamel)

  let result
  if (useGenetic) {
    result = geneticOptimize(plants, lines, forecast, 50, 30)
  } else {
    const optimizer = new DispatchOptimizer(plants, lines, forecast, maintenancePlans)
    result = optimizer.optimize()
  }

  res.json(result)
})

app.get('/api/dispatch/schemes', (req, res) => {
  const schemes = query('SELECT * FROM dispatch_schemes ORDER BY created_at DESC')
  res.json(schemes.map(s => ({
    ...rowToCamel(s),
    plans: s.plans_json ? JSON.parse(s.plans_json) : []
  })))
})

app.post('/api/dispatch/schemes', (req, res) => {
  const { name, startTime, endTime, status = 'draft', createdBy, plans, n1CheckPassed, rampCheckPassed, totalCost } = req.body
  const id = uuidv4()
  const now = new Date().toISOString()

  run(`INSERT INTO dispatch_schemes (
    id, name, start_time, end_time, status, created_at, created_by,
    n1_check_passed, ramp_check_passed, total_cost, plans_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, name, startTime, endTime, status, now, createdBy,
    n1CheckPassed ? 1 : 0, rampCheckPassed ? 1 : 0, totalCost,
    JSON.stringify(plans)
  ])

  res.status(201).json({ id, ...req.body, createdAt: now })
})

app.put('/api/dispatch/schemes/:id', (req, res) => {
  const { status, approvedBy } = req.body
  const now = new Date().toISOString()
  run(`UPDATE dispatch_schemes SET 
    status = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
    [status, approvedBy || null, status === 'approved' ? now : null, req.params.id]
  )
  res.json({ success: true })
})

app.get('/api/dispatch/instructions', (req, res) => {
  const instructions = query('SELECT * FROM dispatch_instructions ORDER BY sent_at DESC')
  res.json(instructions.map(rowToCamel))
})

app.post('/api/dispatch/instructions', (req, res) => {
  const { schemeId, targetStation, content } = req.body
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO dispatch_instructions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, schemeId || null, targetStation, content, 'sent', now, null, null, null
  ])
  res.status(201).json({ id, ...req.body, sentAt: now, status: 'sent' })
})

app.put('/api/dispatch/instructions/:id', (req, res) => {
  const { status, operatorName, adjustReason } = req.body
  const now = new Date().toISOString()
  run(`UPDATE dispatch_instructions SET 
    status = ?, confirmed_at = ?, operator_name = ?, adjust_reason = ?
    WHERE id = ?`, [
    status, status === 'confirmed' ? now : null, operatorName || null, adjustReason || null, req.params.id
  ])
  res.json({ success: true })
})

app.get('/api/realtime/data', (req, res) => {
  const plants = query('SELECT id, name, current_output, max_output FROM power_plants')
  const lines = query('SELECT id, name, current_flow, max_capacity FROM transmission_lines')
  const subs = query('SELECT id, name, bus_voltage FROM substations')

  const plantData = plants.map(p => {
    const variation = (Math.random() - 0.5) * 0.05
    return {
      plantId: p.id,
      plantName: p.name,
      currentOutput: Math.round(p.current_output * (1 + variation)),
      maxOutput: p.max_output
    }
  })

  const lineData = lines.map(l => {
    const variation = (Math.random() - 0.5) * 0.1
    const flow = Math.round(l.current_flow * (1 + variation))
    return {
      lineId: l.id,
      lineName: l.name,
      flow: Math.min(flow, l.max_capacity),
      maxCapacity: l.max_capacity,
      loadRate: l.max_capacity > 0 ? (Math.min(flow, l.max_capacity) / l.max_capacity * 100) : 0,
      fromVoltage: 220 + (Math.random() - 0.5) * 10,
      toVoltage: 220 + (Math.random() - 0.5) * 10
    }
  })

  const substationData = subs.map(s => ({
    substationId: s.id,
    substationName: s.name,
    busVoltage: (s.bus_voltage || 220) + (Math.random() - 0.5) * 5
  }))

  const totalOutput = plantData.reduce((sum, p) => sum + p.currentOutput, 0)
  const totalLoad = lineData.reduce((sum, l) => sum + l.flow, 0) / 2

  const data = {
    timestamp: new Date().toISOString(),
    frequency: 50 + (Math.random() - 0.5) * 0.2,
    avgVoltage: substationData.reduce((sum, s) => sum + s.busVoltage, 0) / substationData.length,
    totalLoad: Math.round(totalLoad),
    totalOutput: Math.round(totalOutput),
    lines: lineData,
    plants: plantData,
    substations: substationData
  }

  run(`INSERT INTO real_time_data (
    timestamp, frequency, avg_voltage, total_load, total_output,
    lines_data, plants_data, substations_data
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    data.timestamp, data.frequency, data.avgVoltage, data.totalLoad, data.totalOutput,
    JSON.stringify(lineData), JSON.stringify(plantData), JSON.stringify(substationData)
  ])

  res.json(data)
})

app.get('/api/alarms', (req, res) => {
  const alarms = query('SELECT * FROM alarms ORDER BY timestamp DESC LIMIT 100')
  res.json(alarms.map(rowToCamel))
})

app.post('/api/alarms', (req, res) => {
  const { type, level, equipmentId, equipmentName, message, value, threshold } = req.body
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO alarms VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, type, level, equipmentId || null, equipmentName || null, message, value, threshold,
    now, 0, 0, null, null
  ])
  res.status(201).json({ id, ...req.body, timestamp: now, acknowledged: false, handled: false })
})

app.put('/api/alarms/:id', (req, res) => {
  const { acknowledged, handled, handledBy } = req.body
  const now = new Date().toISOString()
  run(`UPDATE alarms SET 
    acknowledged = ?, handled = ?, handled_by = ?, handled_at = ?
    WHERE id = ?`, [
    acknowledged ? 1 : 0, handled ? 1 : 0,
    handledBy || null, handled ? now : null, req.params.id
  ])
  res.json({ success: true })
})

app.get('/api/workorders', (req, res) => {
  const orders = query('SELECT * FROM work_orders ORDER BY created_at DESC')
  res.json(orders.map(o => ({
    ...rowToCamel(o),
    sparePartsNeeded: o.spare_parts ? JSON.parse(o.spare_parts) : [],
    assignedMembers: o.assigned_members ? JSON.parse(o.assigned_members) : []
  })))
})

app.post('/api/workorders', (req, res) => {
  const { equipmentId, equipmentType, equipmentName, type, priority, description, sparePartsNeeded = [], estimatedHours } = req.body
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO work_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, equipmentId, equipmentType, equipmentName, type, priority, description, 'pending',
    null, null, JSON.stringify(sparePartsNeeded), estimatedHours || null, null, now
  ])
  res.status(201).json({ id, ...req.body, status: 'pending', createdAt: now })
})

app.put('/api/workorders/:id', (req, res) => {
  const { status, assignedTeam, assignedMembers = [], actualHours } = req.body
  const now = new Date().toISOString()
  run(`UPDATE work_orders SET 
    status = ?, assigned_team = ?, assigned_members = ?, actual_hours = ?, completed_at = ?
    WHERE id = ?`, [
    status, assignedTeam || null, JSON.stringify(assignedMembers), actualHours || null,
    status === 'completed' ? now : null, req.params.id
  ])
  res.json({ success: true })
})

app.get('/api/spareparts', (req, res) => {
  const parts = query('SELECT * FROM spare_parts')
  res.json(parts.map(rowToCamel))
})

app.put('/api/spareparts/:id', (req, res) => {
  const { quantity } = req.body
  const now = new Date().toISOString()
  run('UPDATE spare_parts SET quantity = ?, last_updated = ? WHERE id = ?', [quantity, now, req.params.id])
  res.json({ success: true })
})

app.get('/api/staff', (req, res) => {
  const staff = query('SELECT * FROM staff')
  res.json(staff.map(s => ({
    ...rowToCamel(s),
    skills: s.skills ? JSON.parse(s.skills) : []
  })))
})

app.get('/api/teams', (req, res) => {
  const teams = query('SELECT * FROM teams')
  res.json(teams.map(t => ({
    ...rowToCamel(t),
    members: t.members ? JSON.parse(t.members) : [],
    skills: t.skills ? JSON.parse(t.skills) : []
  })))
})

app.get('/api/schedules', (req, res) => {
  const schedules = query('SELECT * FROM schedules ORDER BY date, shift')
  res.json(schedules.map(rowToCamel))
})

app.post('/api/schedules', (req, res) => {
  const { date, shift, staffId, staffName, position } = req.body
  const id = uuidv4()
  run(`INSERT INTO schedules VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, date, shift, staffId, staffName, position, 0, null
  ])
  res.status(201).json({ id, ...req.body, isSwapped: false })
})

app.put('/api/schedules/:id', (req, res) => {
  const { staffId, staffName, isSwapped, originalStaffId } = req.body
  run(`UPDATE schedules SET 
    staff_id = ?, staff_name = ?, is_swapped = ?, original_staff_id = ?
    WHERE id = ?`, [
    staffId, staffName, isSwapped ? 1 : 0, originalStaffId || null, req.params.id
  ])
  res.json({ success: true })
})

app.get('/api/swaprequests', (req, res) => {
  const requests = query('SELECT * FROM swap_requests ORDER BY created_at DESC')
  res.json(requests.map(rowToCamel))
})

app.post('/api/swaprequests', (req, res) => {
  const { fromStaffId, fromStaffName, toStaffId, toStaffName, date, shift, reason } = req.body
  const id = uuidv4()
  const now = new Date().toISOString()
  run(`INSERT INTO swap_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, fromStaffId, fromStaffName, toStaffId, toStaffName, date, shift, reason, 'pending', now
  ])
  res.status(201).json({ id, ...req.body, status: 'pending', createdAt: now })
})

app.put('/api/swaprequests/:id', (req, res) => {
  const { status, approvedBy } = req.body
  run('UPDATE swap_requests SET status = ?, approved_by = ? WHERE id = ?', [
    status, approvedBy || null, req.params.id
  ])
  res.json({ success: true })
})

app.get('/api/statistics', (req, res) => {
  const { region = '全网', startTime, endTime } = req.query
  
  const plants = region === '全网' 
    ? query('SELECT * FROM power_plants')
    : query('SELECT * FROM power_plants WHERE region = ?', [region])

  const totalCapacity = plants.reduce((sum, p) => sum + p.capacity, 0)
  const start = new Date(startTime || Date.now() - 30 * 86400000)
  const end = new Date(endTime || Date.now())
  const days = Math.max(1, Math.ceil((end - start) / 86400000))

  const totalGeneration = totalCapacity * 24 * days * 0.65
  const lineLossRate = 4.5 + Math.random() * 2

  const runningCount = plants.filter(p => p.status === 'running').length
  const equipmentAvailability = plants.length > 0 ? (runningCount / plants.length * 100) : 0

  res.json({
    region,
    startTime: startTime || start.toISOString(),
    endTime: endTime || end.toISOString(),
    totalGeneration: Math.round(totalGeneration),
    totalConsumption: Math.round(totalGeneration * (1 - lineLossRate / 100)),
    lineLossRate: Math.round(lineLossRate * 10) / 10,
    equipmentAvailability: Math.round(equipmentAvailability * 10) / 10,
    faultCount: Math.floor(Math.random() * 5),
    accidentCount: Math.floor(Math.random() * 2),
    peakLoad: Math.round(totalCapacity * 0.85),
    valleyLoad: Math.round(totalCapacity * 0.4)
  })
})

app.get('/api/loadforecast', (req, res) => {
  const hours = parseInt(req.query.hours) || 24
  const forecasts = []
  const baseLoad = 8000
  
  for (let i = 0; i < hours; i++) {
    const hourFactor = 0.6 + 0.4 * Math.sin((i - 6) * Math.PI / 12)
    forecasts.push({
      id: uuidv4(),
      timestamp: new Date(Date.now() + i * 3600000).toISOString(),
      region: '全网',
      forecastLoad: Math.round(baseLoad * hourFactor),
      source: 'mixed'
    })
  }
  res.json(forecasts)
})

app.get('/api/maintenanceplans', (req, res) => {
  const plans = query('SELECT * FROM maintenance_plans')
  res.json(plans.map(rowToCamel))
})

function rowToCamel(row) {
  if (!row) return row
  const result = {}
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
    result[camelKey] = row[key]
  }
  return result
}

function camelToSnake(obj) {
  if (!obj) return obj
  const result = {}
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    result[snakeKey] = obj[key]
  }
  return result
}

async function startServer() {
  await initDatabase()
  app.listen(PORT, () => {
    console.log(`🚀 Power Grid API server running on http://localhost:${PORT}`)
  })
}

startServer()
