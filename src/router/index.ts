import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/equipment',
    name: 'equipment',
    component: () => import('@/views/Equipment.vue')
  },
  {
    path: '/dispatch',
    name: 'dispatch',
    component: () => import('@/views/Dispatch.vue')
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/views/Monitor.vue')
  },
  {
    path: '/maintenance',
    name: 'maintenance',
    component: () => import('@/views/Maintenance.vue')
  },
  {
    path: '/scheduling',
    name: 'scheduling',
    component: () => import('@/views/Scheduling.vue')
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/Statistics.vue')
  },
  {
    path: '/topology',
    name: 'topology',
    component: () => import('@/views/Topology.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
