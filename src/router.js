import { createRouter, createWebHashHistory } from 'vue-router'
import SeatQuery from './components/SeatQuery.vue'
import AdminPanel from './components/AdminPanel.vue'
import LotteryPage from './components/LotteryPage.vue'

const routes = [
  { path: '/', component: SeatQuery },
  { path: '/index.html', redirect: '/' },
  { path: '/admin', component: AdminPanel },
  { path: '/admin.html', redirect: '/admin' },
  { path: '/lottery', component: LotteryPage }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
