import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    ElMessage.error(error.message || '请求失败')
    return Promise.reject(error)
  }
)

export const plantAPI = {
  list: () => api.get('/plants'),
  get: (id: string) => api.get(`/plants/${id}`),
  create: (data: any) => api.post('/plants', data),
  update: (id: string, data: any) => api.put(`/plants/${id}`, data),
  delete: (id: string) => api.delete(`/plants/${id}`)
}

export const substationAPI = {
  list: () => api.get('/substations'),
  get: (id: string) => api.get(`/substations/${id}`),
  create: (data: any) => api.post('/substations', data),
  update: (id: string, data: any) => api.put(`/substations/${id}`, data),
  delete: (id: string) => api.delete(`/substations/${id}`)
}

export const lineAPI = {
  list: () => api.get('/lines'),
  get: (id: string) => api.get(`/lines/${id}`),
  create: (data: any) => api.post('/lines', data),
  update: (id: string, data: any) => api.put(`/lines/${id}`, data),
  delete: (id: string) => api.delete(`/lines/${id}`)
}

export const topologyAPI = {
  get: () => api.get('/topology')
}

export const dispatchAPI = {
  generate: (params: { hours?: number; useGenetic?: boolean; weatherData?: any }) =>
    api.post('/dispatch/generate', params),
  listSchemes: () => api.get('/dispatch/schemes'),
  createScheme: (data: any) => api.post('/dispatch/schemes', data),
  updateScheme: (id: string, data: any) => api.put(`/dispatch/schemes/${id}`, data),
  listInstructions: () => api.get('/dispatch/instructions'),
  createInstruction: (data: any) => api.post('/dispatch/instructions', data),
  updateInstruction: (id: string, data: any) => api.put(`/dispatch/instructions/${id}`, data)
}

export const realtimeAPI = {
  getData: () => api.get('/realtime/data')
}

export const alarmAPI = {
  list: () => api.get('/alarms'),
  create: (data: any) => api.post('/alarms', data),
  update: (id: string, data: any) => api.put(`/alarms/${id}`, data)
}

export const workOrderAPI = {
  list: () => api.get('/workorders'),
  create: (data: any) => api.post('/workorders', data),
  update: (id: string, data: any) => api.put(`/workorders/${id}`, data)
}

export const sparePartAPI = {
  list: () => api.get('/spareparts'),
  update: (id: string, data: any) => api.put(`/spareparts/${id}`, data)
}

export const staffAPI = {
  list: () => api.get('/staff'),
  listTeams: () => api.get('/teams')
}

export const scheduleAPI = {
  list: () => api.get('/schedules'),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  listSwapRequests: () => api.get('/swaprequests'),
  createSwapRequest: (data: any) => api.post('/swaprequests', data),
  updateSwapRequest: (id: string, data: any) => api.put(`/swaprequests/${id}`, data)
}

export const statisticsAPI = {
  get: (params: { region?: string; startTime?: string; endTime?: string }) =>
    api.get('/statistics', { params })
}

export const loadForecastAPI = {
  list: (hours?: number) => api.get('/loadforecast', { params: { hours } })
}

export const maintenancePlanAPI = {
  list: () => api.get('/maintenanceplans')
}

export default api
