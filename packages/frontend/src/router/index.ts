import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: () => import('@/pages/LoginPage.vue'), meta: { guestOnly: true } },
    { path: '/register', component: () => import('@/pages/RegisterPage.vue'), meta: { guestOnly: true } },
    { path: '/forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue'), meta: { guestOnly: true } },
    { path: '/dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initializeSession()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return '/dashboard'
  }
})

export default router
