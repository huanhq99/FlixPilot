import { createRouter, createWebHistory } from 'vue-router'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/settings'
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    }
  ]
})

export default router
