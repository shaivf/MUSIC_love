import { ref } from 'vue'    // 允许创建一个响应式变量。组件模板中可以自动响应状态变化
import { ElMessage } from 'element-plus'    // 全局消息提示组件。允许在 JS 逻辑中直接弹出提示
import { setGlobalRuntimeError } from './errorBoundary'

/**
 * 统一的异步错误处理 Composable(组合式函数，复用逻辑函数)
 * 
 * 作用：
 * 1. 自动管理加载状态（loading）
 * 2. 统一显示错误提示（ElMessage）
 * 3. 将错误上报到全局错误系统
 * 4. 减少业务代码中的 try-catch 重复
 * 
 * 使用示例：
 * const { loading, execute } = useAsyncError()
 * 
 * const loadSong = async () => {
 *   await execute(
 *     () => getSong(id),
 *     '加载歌曲失败'
 *   )
 * }
 * useAsyncError() 是一个给页面组件复用的异步操作管理器，
 * 用来统一处理 loading、错误提示、错误上报，以及异步调用的包装。
 */
export function useAsyncError() {
  const loading = ref(false)

  /**
   * 执行异步操作并统一处理错误
   * @param {Function} asyncFn - 异步函数
   * @param {string} errorMsg - 错误消息
   * @param {Object} options - 配置项
   * @param {boolean} options.showError - 是否显示错误提示（默认 true）
   * @param {boolean} options.reportError - 是否上报到全局系统（默认 false，仅系统错误上报）
   * @returns {Promise} 操作结果，如果失败则返回 rejected promise
   * 
   * @example
   * // 基础用法 - 业务错误（只显示提示，不上报）
   * await execute(
   *   () => getSong(id),
   *   '加载歌曲失败'
   * )
   * 
   * // 系统错误 - 显示提示并上报到错误系统
   * await execute(
   *   () => api.systemCall(),
   *   '系统错误，请稍后重试',
   *   { reportError: true }
   * )
   */
  /*
    * 1. 通过 asyncFn 执行异步操作，asyncFn 是一个要执行的异步函数
  */
  const execute = async (asyncFn, errorMsg = '操作失败', options = {}) => {
    const { showError = true, reportError = false } = options

    try {
      loading.value = true
      // 表面上没有传参数，但真正的参数通常已经被包在传进来的函数里面了。
      // 这样设计的原因是：因为 execute 不关心具体业务参数是什么。
      const result = await asyncFn()   // const result = await userStore.login(loginForm)
      return result
    } catch (error) {
      // 🔍 区分业务错误和系统错误
      const isBusinessError = error.type === 'BUSINESS_ERROR'
      const isSystemError = error.type === 'SYSTEM_ERROR'
      
      // 1️⃣ 上报到全局错误系统
      // ⭐ 规则：只上报系统错误，或显式指定 reportError: true
      if ((isSystemError || reportError) && !isBusinessError) {
        setGlobalRuntimeError(error, 'useAsyncError')
      }
      
      // 2️⃣ 控制台记录
      // ⭐ 业务错误用 console.warn，系统错误用 console.error
      // 存疑？？？？？在GlobalErrorBoundary.vue中也有错误信息的输出？会不会出现重复
      if (isBusinessError) {
        console.warn('[业务错误]', errorMsg, '原因:', error.message)
      } else {
        console.error('[系统错误]', errorMsg, error)
      }

      // 3️⃣ 显示错误提示
      if (showError) {
        ElMessage.error(errorMsg)
      }

      // 4️⃣ 返回 rejected promise，让调用方可以继续 catch
      // 错误透传（error propagation，错误继续向上传播），让调用方也能感知到这个错误，决定要不要继续处理。
      return Promise.reject(error)    // 统一做了提示和上报，但我不吞掉这个错误，仍然把失败状态交还给调用方。
    } finally {
      loading.value = false
    }
  }

  /**
   * 副方法：仅管理加载状态，不处理错误
   * 用于希望自己处理错误的场景
   * 是给“需要自定义错误策略”的场景准备的
   * 例如：
   * try {
  await withLoading(() => api.save(data))
  ElMessage.success('保存成功')
} catch (error) {
  // 我想自己判断错误类型
  if (error.code === 401) {
    ElMessage.warning('请先登录')
  } else {
    ElMessage.error(error.message)
  }
}
   */
  const withLoading = async (asyncFn) => {
    try {
      loading.value = true
      return await asyncFn()
    } finally {
      loading.value = false
    }
  }
// 把这三个东西暴露给外部使用
// 这叫解构赋值（destructuring assignment，从对象里取字段）。
  return {
    loading,
    execute,
    withLoading
  }
}
