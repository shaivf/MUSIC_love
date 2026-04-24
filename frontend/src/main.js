// 全局入口文件（Entry Point）
// 任务非常明确：把我们在前面讲过的所有独立组件（大堂框架、迎宾员、记事板、UI组件库）全部组装、通电**，
//    然后一把塞进 index.html 的那个毛坯房（<div id="app">）里。

// ========== 【关键优化】全局错误处理最优先注册 ==========
// 为什么？在任何其他代码执行前就建立保护，包括：
//   1. 其他模块的导入和执行
//   2. Vue 应用的创建
//   3. App.vue 的加载和编译
// 这确保没有代码会在"无防护"的状态下执行
import { setGlobalRuntimeError } from './utils/errorBoundary'

// ========== 第1层：浏览器原生错误处理（最早注册）==========
if (!window.__MUSIC_ERROR_BOUNDARY_LISTENERS__) {
  // 【改进】使用 capture: true 捕获事件捕获阶段的错误
  // 这样可以捕获资源加载错误（如图片、脚本加载失败）
  // 不使用 capture 的话，只能捕获事件冒泡阶段的错误，会漏掉资源加载错误
  
  // 判断是否为资源加载错误（404等）
  // 利用了浏览器对不同错误生成的事件对象结构不同这个机制。
  const isResourceError = (event) => {
    // 资源加载错误的特征：event.error 为 null，但 event.target 存在
    // 而且event.target指向具体资源元素，比如 <img>、<link>、<script>
    return !event.error && event.target && event.target !== window
  }
  // isResourceError(event)：区分资源错误和脚本运行错误
  /*
  真正的运行时错误：
      undefined.xxx
      组件逻辑异常
      脚本执行报错
  这类错误一般：
      有 event.error
      更接近 JS 执行错误   
  */
  
  // 判断是否为应忽略的资源错误
  const shouldIgnoreResourceError = (event) => {
    const target = event.target
    if (!target) return false  // 没有目标元素，无法判断，默认不忽略
    
    // 获取资源的 URL 或名称
    const src = target.src || target.href || ''
    
    // 过滤规则：图片、CSS、JS 加载失败都忽略（静默失败）
    const ignoredPatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg)$/i,  // 图片文件
      /\.(css)$/i,                         // CSS文件
      /\.(js)$/i                           // JS文件
    ]
    
    return ignoredPatterns.some(pattern => pattern.test(src))     
    // 如果资源 URL 匹配任何一个忽略模式，就返回 true，表示应该忽略这个错误
  }
  
  window.addEventListener(
    'error',
    (event) => {
      // 🔍 检查是否为资源错误
      if (isResourceError(event)) {
        // 📦 如果是应忽略的资源错误，只在控制台警告，不上报到全局错误系统
        if (shouldIgnoreResourceError(event)) {
          console.warn('[Resource Error - Ignored]', event.target?.src || event.target?.href)
          return  // ✅ 不调用 setGlobalRuntimeError，静默失败
        }
      }
      
      // ❌ 这是真正的系统错误，需要上报
      console.error('[Window Error]', event.error || event.message)
      setGlobalRuntimeError(
        event.error || new Error(event.message || 'window error'),    
        'window.error'
      )
    },
    true  // ✅ 使用捕获模式
  )
/*
window 是监听目标
'error' 是事件类型
event 是浏览器传给你的错误事件对象
*/
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason)
    setGlobalRuntimeError(
      event.reason || new Error('unhandled rejection'),
      'unhandledrejection'
    )
  })

  window.__MUSIC_ERROR_BOUNDARY_LISTENERS__ = true
  console.log('[系统] ✅ 全局错误监听器已注册（在应用启动前）')
}

// ========== 【现在安全地导入其他模块】==========
// 所有这些导入都受到上面已注册的全局错误处理保护
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// ========== 第2层：Vue 框架级错误处理 ==========
// 作用：捕获 Vue 组件生命周期和渲染中的同步错误
// 说明：
//   1. 仅记录错误，不显示提示（避免与页面 useAsyncError 和 GlobalErrorBoundary 冲突）
//   2. 错误会流向 GlobalErrorBoundary.vue 在 currentError 显示
//   3. 业务组件中的异步错误应使用 useAsyncError 处理
// 数据流向：错误信息通过 setGlobalRuntimeError() 流向全局错误系统
// instance：触发错误的 Vue 组件实例
// info：Vue 特定的错误信息（如生命周期钩子名称）
app.config.errorHandler = (error, instance, info) => {
  if (error.type === 'BUSINESS_ERROR') {
    console.warn('[业务错误 - 全局忽略]', error.message)
    return
  }
  console.error('[Vue Error]', error, info)
  setGlobalRuntimeError(error, info || 'app.config.errorHandler')
  // 注意：不在这里显示 ElMessage，避免重复提示
  // Vue 应用级错误处理器 ( app.config.errorHandler ) 只会捕获 Vue 组件生命周期和渲染中的同步错误，
  //    不会捕获组件内的异步错误（比如 setTimeout、Promise 内的错误）。
  //    因此，我们在 useAsyncError 里专门处理了异步错误，
  //        包括显示 ElMessage 和上报全局错误状态。这样就避免了同步和异步错误处理的冲突和重复提示。
}

app.use(createPinia())   // 状态管理：负责全局状态的存储和管理，比如用户信息、播放状态等。
app.use(router)    // 路由系统：负责根据用户访问的网址（比如 /login、/profile）来切换不同的页面组件。
app.use(ElementPlus)   // UI组件库：提供了一套现成的、风格统一的界面组件（按钮、输入框、弹窗等），让你不需要从零开始设计界面。

app.mount('#app')
// #app 是一个 CSS 选择器，它指向了
//      public/index.html 文件里那个空荡荡的 <div id="app"></div>。
//      替换或填充 <div id="app"></div> 的内容
//  此时，内存中的虚拟组件全部变成了真实的 DOM 节点，塞进了这个 div 里。
//    大门正式敞开，用户看到了华丽的界面。
// 一切准备就绪，装修总监下达最后指令。
// 这一行代码，就像一把巨大的拔河钳，把刚刚在内存里组装好的、
//    极其华丽的餐厅（大堂、路由、状态、家具库），瞬间强行塞进了那个空荡荡的 id="app" 标签里！

// 为什么要把 Pinia、Router 和 ElementPlus 拆出去，然后在 main.js 里用 app.use() 挂载，而不是直接写在 App.vue 里？
//     高内聚、低耦合
// 解耦： main.js 只负责"组装"。它就像一块主板，Pinia 是内存条，Router 是显卡。
// 如果你以后想换掉 Router，你只需要在主板上拔下旧的（删掉这行 import 和 use），
// 插上新的，而不需要去每个页面里改代码。

// 全局上下文： 一旦使用了 app.use()，这些插件就会被注入到 Vue 的底层系统中。
// 这就意味着，在 Songs.vue 这个深层房间里，你不需要再 import router，
// 你可以直接使用 this.$router.push()，因为它已经被全局广播了。
