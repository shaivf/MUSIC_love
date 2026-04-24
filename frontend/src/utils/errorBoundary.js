import { ref } from 'vue'
/*
文件中的三个导出：
globalRuntimeError	      响应式状态	  存放当前全局错误
setGlobalRuntimeError	    写入函数	    设置错误状态
clearGlobalRuntimeError	  清理函数	    清空错误状态
*/


export const globalRuntimeError = ref(null)

// 将任意错误对象规范化为 Error 实例，确保全局错误系统接收到一致的错误格式
function normalizeError(error) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : JSON.stringify(error))
}
// 全局错误设置函数，供全局错误监听器和 Vue 错误处理器调用
// 全局错误响应式状态
export function setGlobalRuntimeError(error, info = '') {
  const normalized = normalizeError(error)
  globalRuntimeError.value = {
    message: normalized.message || '未知错误',
    stack: normalized.stack || '',
    info,
    timestamp: new Date().toISOString()
  }
}
// 全局错误清除函数，供用户手动清除错误状态
export function clearGlobalRuntimeError() {
  globalRuntimeError.value = null
}

