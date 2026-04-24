/*
主要做四件事：

    创建统一的 Axios 请求实例
    自动添加 token
    统一解析后端响应
    统一分类错误：BUSINESS_ERROR / SYSTEM_ERROR


该文件整体分成四块：

      模块	              功能
    导入依赖	    引入 Axios 和消息提示
    创建实例	    设置 baseURL 和超时时间
    请求拦截器	  请求发出前自动加 token
    响应拦截器	  响应返回后统一处理数据和错误
*/

import axios from 'axios'
import { ElMessage } from 'element-plus'     // 消息提示组件

const http = axios.create({     // 创建了一个独立的 Axios 实例。
  /*
      基础路径
      超时时间
  */
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

// 请求拦截器：在请求发出前自动添加 Authorization 头
http.interceptors.request.use(
  (config) => {    // config 是本次请求的配置对象。
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => {
    const data = response.data

    if (typeof data !== 'object' || data === null) {
      return data
    }

    const { success, message, code } = data
    if (success === false) {
      const businessError = new Error(message || '请求失败')
      businessError.type = 'BUSINESS_ERROR'
      businessError.code = code
      return Promise.reject(businessError)
    }

    return data
  },
  (error) => {
    const status = error.response?.status
    const requestUrl = String(error.config?.url || '')
    const isAuthLogin = requestUrl.includes('/auth/login')

    // 登录失败属于业务错误，不应该触发页面跳转/刷新
    if (status === 401 && isAuthLogin) {
      const loginError = new Error(error.response?.data?.message || '邮箱或密码错误')
      loginError.type = 'BUSINESS_ERROR'
      loginError.statusCode = 401
      return Promise.reject(loginError)
    }

    // 其他 401 一般表示 token 过期
    if (status === 401) {
      localStorage.removeItem('token')
      ElMessage.error('登录已过期，请重新登录')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (status >= 500) {
      const systemError = new Error(error.response?.data?.message || `服务器错误 (${status})`)
      systemError.type = 'SYSTEM_ERROR'
      systemError.statusCode = status
      return Promise.reject(systemError)
    }

    if (status >= 400 && status < 500) {
      const clientError = new Error(error.response?.data?.message || `请求错误 (${status})`)
      clientError.type = 'BUSINESS_ERROR'
      clientError.statusCode = status
      return Promise.reject(clientError)
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      const networkError = new Error('网络连接失败，请检查网络')
      networkError.type = 'SYSTEM_ERROR'
      return Promise.reject(networkError)
    }

    return Promise.reject(error)
  }
)

export default http
