const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const dataDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'powergrid.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db = null

async function initDatabase() {
  const SQL = await initSqlJs()
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`PRAGMA journal_mode = WAL`)
  db.run(`PRAGMA foreign_keys = ON`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS power_plants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity REAL NOT NULL,
      rated_voltage REAL NOT NULL,
      rated_current REAL NOT NULL,
      max_output REAL NOT NULL,
      min_output REAL NOT NULL,
      ramp_rate REAL NOT NULL,
      status TEXT NOT NULL,
      current_output REAL DEFAULT 0,
      run_hours REAL DEFAULT 0,
      start_count INTEGER DEFAULT 0,
      location TEXT,
      region TEXT,
      cost_per_mwh REAL NOT NULL DEFAULT 0.3,
      create_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS substations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      voltage_level REAL NOT NULL,
      capacity REAL NOT NULL,
      transformer_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      location TEXT,
      region TEXT,
      bus_voltage REAL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      create_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS transmission_lines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      from_substation TEXT NOT NULL,
      to_substation TEXT NOT NULL,
      voltage_level REAL NOT NULL,
      rated_capacity REAL NOT NULL,
      max_capacity REAL NOT NULL,
      length REAL NOT NULL,
      status TEXT NOT NULL,
      current_flow REAL DEFAULT 0,
      reactance REAL DEFAULT 0.1,
      create_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS dispatch_schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT,
      created_by TEXT,
      approved_by TEXT,
      approved_at TEXT,
      n1_check_passed INTEGER DEFAULT 0,
      ramp_check_passed INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      plans_json TEXT
    );

    CREATE TABLE IF NOT EXISTS dispatch_instructions (
      id TEXT PRIMARY KEY,
      scheme_id TEXT,
      target_station TEXT,
      content TEXT,
      status TEXT,
      sent_at TEXT,
      confirmed_at TEXT,
      operator_name TEXT,
      adjust_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      equipment_id TEXT,
      equipment_name TEXT,
      message TEXT,
      value REAL,
      threshold REAL,
      timestamp TEXT,
      acknowledged INTEGER DEFAULT 0,
      handled INTEGER DEFAULT 0,
      handled_by TEXT,
      handled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      equipment_name TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      assigned_team TEXT,
      assigned_members TEXT,
      spare_parts TEXT,
      estimated_hours REAL,
      actual_hours REAL,
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS spare_parts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT,
      quantity REAL NOT NULL,
      unit TEXT,
      safe_stock REAL NOT NULL,
      location TEXT,
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT,
      skills TEXT,
      max_work_hours REAL NOT NULL,
      current_work_hours REAL DEFAULT 0,
      phone TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      members TEXT,
      leader TEXT,
      skills TEXT
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      shift TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      position TEXT,
      is_swapped INTEGER DEFAULT 0,
      original_staff_id TEXT
    );

    CREATE TABLE IF NOT EXISTS swap_requests (
      id TEXT PRIMARY KEY,
      from_staff_id TEXT,
      from_staff_name TEXT,
      to_staff_id TEXT,
      to_staff_name TEXT,
      date TEXT,
      shift TEXT,
      reason TEXT,
      status TEXT,
      created_at TEXT,
      approved_by TEXT
    );

    CREATE TABLE IF NOT EXISTS load_forecasts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      region TEXT,
      forecast_load REAL NOT NULL,
      actual_load REAL,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id TEXT PRIMARY KEY,
      equipment_id TEXT,
      equipment_type TEXT,
      start_time TEXT,
      end_time TEXT,
      description TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS real_time_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      frequency REAL,
      avg_voltage REAL,
      total_load REAL,
      total_output REAL,
      lines_data TEXT,
      plants_data TEXT,
      substations_data TEXT
    );
  `)

  const result = db.exec('SELECT COUNT(*) as cnt FROM power_plants')
  if (result.length === 0 || result[0].values[0][0] === 0) {
    seedData()
  }

  saveDatabase()
}

function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function seedData() {
  const now = new Date().toISOString()

  const plants = [
    { id: uuidv4(), name: '华能火电厂', type: 'thermal', capacity: 2000, rated_voltage: 220, rated_current: 5000, max_output: 2000, min_output: 500, ramp_rate: 100, status: 'running', current_output: 1800, run_hours: 8760, start_count: 52, location: '东部工业区', region: '东区', cost_per_mwh: 0.35, create_time: now, update_time: now },
    { id: uuidv4(), name: '三峡水力发电站', type: 'hydro', capacity: 3000, rated_voltage: 500, rated_current: 8000, max_output: 3000, min_output: 300, ramp_rate: 200, status: 'running', current_output: 2500, run_hours: 7200, start_count: 120, location: '长江流域', region: '南区', cost_per_mwh: 0.08, create_time: now, update_time: now },
    { id: uuidv4(), name: '阳江核电站', type: 'nuclear', capacity: 4000, rated_voltage: 500, rated_current: 10000, max_output: 4000, min_output: 2000, ramp_rate: 50, status: 'running', current_output: 3800, run_hours: 12000, start_count: 10, location: '沿海工业区', region: '南区', cost_per_mwh: 0.15, create_time: now, update_time: now },
    { id: uuidv4(), name: '内蒙风电场', type: 'wind', capacity: 800, rated_voltage: 110, rated_current: 3000, max_output: 800, min_output: 0, ramp_rate: 300, status: 'running', current_output: 450, run_hours: 4380, start_count: 300, location: '西北草原', region: '西区', cost_per_mwh: 0.12, create_time: now, update_time: now },
    { id: uuidv4(), name: '敦煌光伏电站', type: 'solar', capacity: 500, rated_voltage: 110, rated_current: 2000, max_output: 500, min_output: 0, ramp_rate: 500, status: 'running', current_output: 320, run_hours: 3650, start_count: 200, location: '西北戈壁', region: '西区', cost_per_mwh: 0.10, create_time: now, update_time: now },
    { id: uuidv4(), name: '大唐火电厂', type: 'thermal', capacity: 1800, rated_voltage: 220, rated_current: 4500, max_output: 1800, min_output: 400, ramp_rate: 90, status: 'maintenance', current_output: 0, run_hours: 9500, start_count: 60, location: '北部工业区', region: '北区', cost_per_mwh: 0.32, create_time: now, update_time: now }
  ]

  plants.forEach(p => {
    db.run(
      `INSERT INTO power_plants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.type, p.capacity, p.rated_voltage, p.rated_current, p.max_output, p.min_output, p.ramp_rate, p.status, p.current_output, p.run_hours, p.start_count, p.location, p.region, p.cost_per_mwh, p.create_time, p.update_time]
    )
  })

  const sub1 = uuidv4(), sub2 = uuidv4(), sub3 = uuidv4(), sub4 = uuidv4(), sub5 = uuidv4()
  const substations = [
    { id: sub1, name: '东城500kV变电站', voltage_level: 500, capacity: 3000, transformer_count: 4, status: 'normal', location: '东城区', region: '东区', bus_voltage: 512, x: 150, y: 100, create_time: now, update_time: now },
    { id: sub2, name: '西城220kV变电站', voltage_level: 220, capacity: 1500, transformer_count: 3, status: 'normal', location: '西城区', region: '西区', bus_voltage: 225, x: 400, y: 150, create_time: now, update_time: now },
    { id: sub3, name: '南城500kV变电站', voltage_level: 500, capacity: 2500, transformer_count: 3, status: 'normal', location: '南城区', region: '南区', bus_voltage: 508, x: 250, y: 300, create_time: now, update_time: now },
    { id: sub4, name: '北城220kV变电站', voltage_level: 220, capacity: 1200, transformer_count: 2, status: 'warning', location: '北城区', region: '北区', bus_voltage: 218, x: 200, y: 400, create_time: now, update_time: now },
    { id: sub5, name: '中心110kV变电站', voltage_level: 110, capacity: 600, transformer_count: 2, status: 'normal', location: '中心区', region: '东区', bus_voltage: 112, x: 350, y: 250, create_time: now, update_time: now }
  ]

  substations.forEach(s => {
    db.run(
      `INSERT INTO substations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.voltage_level, s.capacity, s.transformer_count, s.status, s.location, s.region, s.bus_voltage, s.x, s.y, s.create_time, s.update_time]
    )
  })

  const lines = [
    { id: uuidv4(), name: '东三线', from_substation: sub1, to_substation: sub3, voltage_level: 500, rated_capacity: 2000, max_capacity: 2000, length: 85, status: 'normal', current_flow: 1200, reactance: 0.08, create_time: now, update_time: now },
    { id: uuidv4(), name: '东西线', from_substation: sub1, to_substation: sub2, voltage_level: 220, rated_capacity: 1000, max_capacity: 1000, length: 45, status: 'normal', current_flow: 650, reactance: 0.12, create_time: now, update_time: now },
    { id: uuidv4(), name: '南北线', from_substation: sub3, to_substation: sub4, voltage_level: 220, rated_capacity: 1200, max_capacity: 1200, length: 60, status: 'warning', current_flow: 1100, reactance: 0.10, create_time: now, update_time: now },
    { id: uuidv4(), name: '中西线', from_substation: sub5, to_substation: sub2, voltage_level: 110, rated_capacity: 500, max_capacity: 500, length: 25, status: 'normal', current_flow: 280, reactance: 0.15, create_time: now, update_time: now },
    { id: uuidv4(), name: '东北线', from_substation: sub1, to_substation: sub4, voltage_level: 220, rated_capacity: 800, max_capacity: 800, length: 55, status: 'normal', current_flow: 420, reactance: 0.11, create_time: now, update_time: now }
  ]

  lines.forEach(l => {
    db.run(
      `INSERT INTO transmission_lines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.name, l.from_substation, l.to_substation, l.voltage_level, l.rated_capacity, l.max_capacity, l.length, l.status, l.current_flow, l.reactance, l.create_time, l.update_time]
    )
  })

  const staff = [
    { id: uuidv4(), name: '张调度', position: '总调度长', skills: JSON.stringify(['调度', '运维', '应急']), max_work_hours: 160, current_work_hours: 120, phone: '13800138001', status: 'on_duty' },
    { id: uuidv4(), name: '李值班', position: '值班员', skills: JSON.stringify(['监控', '操作']), max_work_hours: 180, current_work_hours: 150, phone: '13800138002', status: 'on_duty' },
    { id: uuidv4(), name: '王运维', position: '运维工程师', skills: JSON.stringify(['检修', '维护', '变压器']), max_work_hours: 170, current_work_hours: 140, phone: '13800138003', status: 'on_duty' },
    { id: uuidv4(), name: '赵维修', position: '维修技师', skills: JSON.stringify(['检修', '线路', '开关']), max_work_hours: 180, current_work_hours: 160, phone: '13800138004', status: 'on_duty' },
    { id: uuidv4(), name: '陈分析', position: '数据分析员', skills: JSON.stringify(['分析', '统计', '建模']), max_work_hours: 160, current_work_hours: 130, phone: '13800138005', status: 'on_duty' },
    { id: uuidv4(), name: '刘安全', position: '安全员', skills: JSON.stringify(['安全', '培训', '应急']), max_work_hours: 160, current_work_hours: 110, phone: '13800138006', status: 'off_duty' }
  ]

  staff.forEach(s => {
    db.run(
      `INSERT INTO staff VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.position, s.skills, s.max_work_hours, s.current_work_hours, s.phone, s.status]
    )
  })

  const teams = [
    { id: uuidv4(), name: '检修一班', members: JSON.stringify([staff[2].id, staff[3].id]), leader: staff[2].id, skills: JSON.stringify(['检修', '维护', '变压器', '线路']) },
    { id: uuidv4(), name: '运维二班', members: JSON.stringify([staff[0].id, staff[1].id]), leader: staff[0].id, skills: JSON.stringify(['调度', '运维', '监控', '操作']) }
  ]

  teams.forEach(t => {
    db.run(
      `INSERT INTO teams VALUES (?, ?, ?, ?, ?)`,
      [t.id, t.name, t.members, t.leader, t.skills]
    )
  })

  const parts = [
    { id: uuidv4(), name: '变压器绝缘油', model: '25#', quantity: 50, unit: '桶', safe_stock: 20, location: 'A区仓库', last_updated: now },
    { id: uuidv4(), name: '高压断路器', model: 'ZW32-12', quantity: 8, unit: '台', safe_stock: 5, location: 'B区仓库', last_updated: now },
    { id: uuidv4(), name: '隔离开关', model: 'GW4-110', quantity: 6, unit: '组', safe_stock: 3, location: 'B区仓库', last_updated: now },
    { id: uuidv4(), name: '电压互感器', model: 'JDZ-10', quantity: 12, unit: '台', safe_stock: 5, location: 'C区仓库', last_updated: now },
    { id: uuidv4(), name: '电流互感器', model: 'LMZ-10', quantity: 15, unit: '台', safe_stock: 5, location: 'C区仓库', last_updated: now },
    { id: uuidv4(), name: '电缆终端头', model: '110kV', quantity: 3, unit: '套', safe_stock: 4, location: 'D区仓库', last_updated: now }
  ]

  parts.forEach(p => {
    db.run(
      `INSERT INTO spare_parts VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.model, p.quantity, p.unit, p.safe_stock, p.location, p.last_updated]
    )
  })
}

function rowsToObjects(columns, values) {
  return values.map(row => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const result = []
  while (stmt.step()) {
    result.push(stmt.getAsObject())
  }
  stmt.free()
  return result
}

function run(sql, params = []) {
  db.run(sql, params)
  saveDatabase()
}

function getOne(sql, params = []) {
  const result = query(sql, params)
  return result[0] || null
}

module.exports = {
  initDatabase,
  query,
  run,
  getOne,
  saveDatabase
}
