import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/songs',
    name: 'Songs',
    component: () => import('@/pages/Songs.vue')
  },
  {
    path: '/player/:id',
    name: 'Player',
    component: () => import('@/pages/Player.vue')
  },
  {
    path: '/user-center',
    name: 'UserCenter',
    component: () => import('@/pages/UserCenter.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 如果 token 在本地但 user 为空，尝试自动补齐
  if (userStore.token && !userStore.user) {
    try {
      await userStore.getProfile()
    } catch (error) {
      userStore.logout()
    }
  }

  // 否则，如果访问需要登录的页面但用户未认证，重定向到登录页
  // 需要登录的页面
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    next('/login')
    return
  }

  // 仅游客可访问的页面（登录/注册）
  if (to.meta.requiresGuest && userStore.isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router
