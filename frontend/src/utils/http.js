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
  (config) => {    // config 是本次请求的配置对象。内部包含有关请求的所有信息，比如 URL、方法、headers 等。
    const token = localStorage.getItem('token')     // 读取token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`    
      // 如果 token 存在，就在请求头中添加 Authorization 字段，值为 Bearer + token。这是后端常用的认证方式，后端会从这个字段中提取 token 进行验证。
    }
    return config
  },
  (error) => Promise.reject(error)
)
/*
响应拦截器（Response Interceptor，响应返回后的处理函数）有两个分支：

      分支	          什么时候执行
    第一个函数	  HTTP 状态码通常是 2xx
    第二个函数	  HTTP 状态码是 4xx / 5xx，或网络错误
*/
// 响应拦截器：统一处理响应数据和错误
http.interceptors.response.use( 
  (response) => {   // 响应成功分支;但是请注意HTTP 状态码成功，不代表业务成功。
    const data = response.data

    if (typeof data !== 'object' || data === null) {  //非对象响应直接返回
      return data
    }

    const { success, message, code } = data    // 如果是对象响应，解构出 success、message、code 等字段
    if (success === false) {
      const businessError = new Error(message || '请求失败')
      businessError.type = 'BUSINESS_ERROR'   // 成为业务错误
      businessError.code = code               // 
      return Promise.reject(businessError)
    }

    return data
  },
  /*
  Axios 在后端有响应但状态码不是 2xx 时，会把响应放在：error.response
  */
  (error) => {
    const status = error.response?.status     // 获取 HTTP 状态码
    const requestUrl = String(error.config?.url || '')    // 获取请求 URL
    const isAuthLogin = requestUrl.includes('/auth/login')   // 判断是否是登录请求，区分登录失败和 token 过期

    // 登录失败属于业务错误，不应该触发页面跳转/刷新
    if (status === 401 && isAuthLogin) {    // 登陆失败，用户还没登录，应该提示邮箱或密码错误，而不是登录过期
      const loginError = new Error(error.response?.data?.message || '邮箱或密码错误')
      loginError.type = 'BUSINESS_ERROR'
      loginError.statusCode = 401
      return Promise.reject(loginError)
    }

    // 其他 401 一般表示 token 过期（用户已经登录，却token失效，需要重新登录）
    if (status === 401) {
      localStorage.removeItem('token')
      ElMessage.error('登录已过期，请重新登录')
      if (window.location.pathname !== '/login') {  // 避免重复跳转
        window.location.href = '/login'     // 强制跳转到登录页，刷新页面后会重新加载应用，用户需要重新登录才能继续使用。
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
    // 处理没有服务器响应的错误。此时一般没有：error.response；所以使用：!error.response
    if (error.code === 'ERR_NETWORK' || !error.response) {
      const networkError = new Error('网络连接失败，请检查网络')
      networkError.type = 'SYSTEM_ERROR'
      return Promise.reject(networkError)
    }

    return Promise.reject(error)
  }
)

export default http
