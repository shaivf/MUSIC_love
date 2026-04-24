<template>
  <!--一旦钩子捕获到了错误，currentError 就有了值，Vue 瞬间切换视图，展示 v-if 里的错误报警界面。-->
  <!--它不能捕获所有错误！-->
  <!--异步错误抓不到： 如果你在组件里写了一个 setTimeout，或者发了一个 Axios 请求，
      在 .then() 或 .catch() 里写错了逻辑报错，onErrorCaptured 是拦截不到的！-->
      <!--原因： Vue 的这个钩子只能捕获“Vue 渲染流程”和“生命周期同步执行”中的错误。
          异步任务脱离了 Vue 的渲染流。-->
          <!--异步请求的错误，通常交给 Axios 的拦截器（你在目录结构里的 utils/http.js）去统一处理。-->
  <div v-if="currentError" class="global-error-wrap">
    <el-result icon="error" title="页面出现异常" sub-title="应用已进入保护模式，防止白屏。">
      <template #extra>
        <div class="actions">
          <!--提供了 resetError (清除错误状态，重置渲染)、
          goHome (跳回首页)、
          reloadPage (暴力刷新网页) 的功能。-->
          <el-button type="primary" @click="resetError">尝试恢复</el-button>
          <el-button @click="goHome">返回首页</el-button>
          <el-button type="danger" plain @click="reloadPage">刷新页面</el-button>
        </div>
      </template>
    </el-result>

    <el-card class="error-detail" shadow="never">
      <!--提取错误的主信息-->
      <p class="error-message">{{ currentError.message }}</p>
      <!--提取错误来源-->
      <p v-if="currentError.info" class="error-info">发生位置：{{ currentError.info }}</p>
      <!--提取错误发生时间-->
      <p v-if="currentError.timestamp" class="error-time">发生时间：{{ formatTime(currentError.timestamp) }}</p>
      <!--只在开发环境显示完整的错误堆栈-->
      <pre v-if="currentError.stack && isDev" class="error-stack">{{ currentError.stack }}</pre>
      <p v-if="!isDev && currentError.stack" class="error-tip">💡 提示：生产环境已隐藏技术细节，请联系管理员</p>
    </el-card>
  </div>
  <!--默认情况下，没有错误，走 v-else 的 <slot />（插槽）。-->
  <div v-else :key="renderKey">
    <slot />
  </div>
</template>

<script setup>
import { computed, onErrorCaptured, ref } from 'vue'
import { useRouter } from 'vue-router'
// // 引入自定义的全局错误状态管理工具
import { clearGlobalRuntimeError, globalRuntimeError, setGlobalRuntimeError } from '@/utils/errorBoundary'

const router = useRouter()   // 获取路由实例，用于页面跳转
const localError = ref(null)    // 组件内部维护的错误状态
const renderKey = ref(0)     // 用于强制重新渲染子组件的标识
const isDev = ref(import.meta.env.MODE === 'development')  // 是否为开发环境
// 组件级错误恢复专家
// 计算属性：当前显示的错误。
// 无论是局部捕获的错误，还是外部通过工具传入的全局错误，只要有一个存在，就判定为出错。
const currentError = computed(() => localError.value || globalRuntimeError.value)
// 合并本地错误( localError )和全局错误( globalRuntimeError )
// 捕获子组件错误，仅当是系统错误时更新全局和本地错误状态，业务错误由 useAsyncError 处理，
// onErrorCaptured 的返回值决定了是否继续冒泡错误，返回 false 阻止冒泡，true 继续冒泡
// 这里我们选择阻止冒泡，因为我们已经在这个组件内处理了错误显示，不需要让父组件也捕获到这个错误
// 这个组件内部包裹的任何子组件、孙组件在渲染或执行时发生错误，
//    这个钩子就会像雷达一样报警，把错误对象（error）拦截下来。所以组件出错,先执行 onErrorCaptured,
//    再执行全局的 window.onerror。onErrorCaptured 里我们把错误同步到
//        全局状态工具中（setGlobalRuntimeError），
//    同时把错误赋值给本地变量 localError（localError.value = globalRuntimeError.value），
//    触发视图切换到报错界面。也就是更新了currentError,然后视图就错误界面
onErrorCaptured((error, _instance, info) => {
  // ⭐ 仅记录系统错误的组件崩溃，业务错误应由 useAsyncError 独立处理
  // 业务错误（如登录失败）不应触发整个应用的错误界面
  // 普通 TypeError 没有：error.type；
  if (error.type === 'BUSINESS_ERROR') {
    // 业务错误只在控制台记录，不显示错误界面
    console.warn('[业务错误 - 在组件中]', error.message)
    return false
  }
  
  setGlobalRuntimeError(error, info || 'onErrorCaptured')  // 将错误同步到全局状态工具中
  localError.value = globalRuntimeError.value     // 将错误赋值给本地变量，触发视图切换到报错界面
  return false  // 阻止冒泡
})

// 恢复按钮逻辑：清除所有错误状态，并强制子组件重新挂载
const resetError = () => {
  localError.value = null
  clearGlobalRuntimeError()
  renderKey.value += 1
  /*
  当用户点击“尝试恢复”时，组件会将 renderKey 加 1。
  在 Vue 中，当一个元素的 key 发生变化时，Vue 会认为这是一个全新的元素，
  从而强制销毁并重新挂载（渲染）该元素内部的所有子组件。这实现了真正的“重置渲染”。
  */
}
// 返回首页逻辑：先清除错误状态，然后跳转到 '/' 路由
const goHome = async () => {
  resetError()
  await router.push('/')
}
// 刷新页面逻辑：最暴力的解决方式，直接调用浏览器的原生刷新
const reloadPage = () => {
  window.location.reload()
}

// 格式化时间戳
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  } catch {
    return timestamp
  }
}
</script>

<style scoped>
.global-error-wrap {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-detail {
  max-width: 980px;
  margin: 16px auto 0;
}

.error-message {
  margin: 0 0 8px;
  color: #d32f2f;
  font-weight: 600;
}

.error-info {
  margin: 0 0 8px;
  color: #666;
  font-size: 13px;
}

.error-time {
  margin: 0 0 8px;
  color: #999;
  font-size: 12px;
}

.error-tip {
  margin: 12px 0 0;
  padding: 8px 12px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  color: #856404;
  font-size: 13px;
}

.error-stack {
  margin: 0;
  padding: 12px;
  background: #111827;
  color: #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
}
</style>

