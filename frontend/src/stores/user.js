import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api'
/*
这个defineStore函数是 Pinia 提供的一个函数，
    用于定义一个新的状态管理模块（store）。它接受两个参数：
1. store 的唯一标识符（这里是 'user'），
2. 一个函数，这个函数返回一个对象，
      在里面定义状态
      定义计算属性
      定义方法
      最后 return 暴露出去
*/
// 外部调用：const userStore = useUserStore()
// 是创建一个实例
// 'user' 是 Pinia Store 的唯一 ID（标识符）
// 它用于全局注册和查找这个 Store 实例
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')  
  // 保存当前登录 token。 
  // 初始化时先从浏览器本地存储读取 token，如果没有就默认为空字符串。
  // 这样即使用户刷新页面，token 也不会丢失，可以保持登录状态。
  // 这样从浏览器的本地存储读取，实现了登录状态持久化。
  const user = ref(null)     // 保存当前登录用户信息（id、email、username 等）。初始值为 null，表示未登录。
  
  // 判断用户是否已登录。
  const isAuthenticated = computed(() => !!token.value)

  // 注册
  const register = async (email, password, username = '') => {
    const response = await userApi.register({ email, password, username })  // 手动封装；多个函数参数封装成一个对象，传给 API 层。 
    return response.data
  }

  // 登录
  const login = async (email, password) => {
    const response = await userApi.login({ email, password })   // 手动封装
    token.value = response.data.token     // 保存token到状态中
    user.value = response.data.user
    localStorage.setItem('token', token.value)    // 保存token到浏览器本地存储，实现登录状态持久化
    return response.data
  }

  // 获取个人信息
  const getProfile = async () => {
    const response = await userApi.getProfile()   // 请求发出时，http.js 的请求拦截器通常会自动加：token.value 作为 Authorization 头的一部分，发送给后端。后端验证 token 后返回用户信息。
    user.value = response.data   // 将获取到的用户信息保存到状态中，供全局使用
    return response.data
  }

  // 更新个人信息
  const updateProfile = async (payload) => {
    const response = await userApi.updateProfile(payload)
    user.value = response.data
    return response.data
  }

  // 注销
  const logout = () => {
    token.value = ''    // 清空 Pinia token
    user.value = null   // 清空用户信息
    localStorage.removeItem('token')     // 删除本地 token;防止刷新页面后再次恢复登录状态。
    userApi.logout().catch(() => {})     // 通知后端退出
  }

  // 初始化：刷新后补全用户信息
  const init = async () => {
    if (token.value && !user.value) {   // 页面刷新后，如果本地有 token，但内存里没有 user，就尝试重新获取用户资料。
      try {
        // 如果 token 无效（过期、被篡改等），getProfile 会抛出异常，
        // 我们在 catch 里处理这个异常，清除 token 和用户信息，确保应用状态正确。
        await getProfile()
      } catch (error) {
        console.warn('自动刷新用户失败，清除 token', error)
        logout()
      }
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    register,
    login,
    getProfile,
    updateProfile,
    logout,
    init
  }
})
