import { createRouter, createWebHistory } from 'vue-router'
import SeatQuery from './components/SeatQuery.vue'
import AdminPanel from './components/AdminPanel.vue'

const routes = [
  { path: '/', component: SeatQuery },
  { path: '/index.html', redirect: '/' },
  { path: '/admin', component: AdminPanel },
  { path: '/admin.html', redirect: '/admin' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
