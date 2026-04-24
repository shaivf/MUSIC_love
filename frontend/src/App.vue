<template>
  <GlobalErrorBoundary>
    <!--这是一个自定义的全局错误边界组件。
    它的作用是捕获其内部子组件渲染时可能出现的报错，
    防止整个页面因为一个小组件的崩溃而白屏。-->
    <div class="app-container">
      <!-- 全局音频元素（隐藏）- 支持后台播放 -->
      <audio
        ref="audioRef"
        
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @play="onPlay"
        @pause="onPause"
      />
      <!--上面的就是将底层audio元素绑定到Vue实例上,实现了与pinia 同步的功能,通过事件监听,然后执行相应的功能代码,实现了同步-->
      <!--@ 符号是一个“缩写（语法糖）”，它的全称是 v-on:
       它的核心作用叫做**“事件监听”。简单来说，就是给 HTML 元素安装一个“监听器”或者“报警器”**。
       timeupdate：这是浏览器原生的一个事件名字。对于 <audio> 标签来说，只要音乐在播放，
        播放进度发生改变（大概一秒钟触发 4 到 10 次），浏览器就会悄悄发出一个叫 timeupdate 的广播信号。
            请立刻去执行 JavaScript 里那个名字叫 onTimeUpdate 的函数-->
      <!--音乐标签-->
      <Header />
      <main class="main-content">
        <RouterView />
      </main>
      <Footer />
      
      <!-- 底部音乐条 -->
      <MusicBar />
    </div>
  </GlobalErrorBoundary>
</template>

<script setup>
// 逻辑层 (餐厅的中央控制室)
// 这部分在组件加载时执行，负责幕后的数据流转。
// 数据流转就变得极其清晰：
//  用户点击界面的按钮 -> 修改 Pinia 的状态 -> Pinia 去指挥 <audio> 播放。
// Vue 3 的语法糖，在这里声明的变量和函数都可以直接在上面的 <template> 中使用，无需额外 return。
import { ref, onMounted } from 'vue'
// 用于定义响应式变量）和 onMounted（组件挂载完成后的生命周期钩子）。
import { RouterView } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import MusicBar from './components/MusicBar.vue'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.vue'
import { useUserStore } from '@/stores/user'
// 引入用于管理用户状态（如登录信息）的 Pinia Store。
import { useMusicPlayerStore } from '@/stores/musicPlayer'
// 引入用于管理音乐播放状态的 Pinia Store。

// 1.通过ref创建一个对 <audio> DOM 元素的引用，初始值为 null。
// 2.在组件挂载完成后（onMounted），将这个引用绑定到全局的 musicPlayer Store 中，
//    这样全局任何组件都可以通过 musicStore.audio 来访问和控制这个 <audio> 元素，实现真正的全局音乐控制。
// 只要保证名字一模一样，Vue 就会在后台默默帮你把它们连接起来。
const audioRef = ref(null)
// 作用：让 JavaScript 代码能够拿到上面那个 HTML 的 <audio> 标签，从而可以调用它的 .play() 或 .pause() 方法。
// 创建一个初始值为 null 的引用。当页面渲染完成后，
// 它会自动绑定到模板里写了 ref="audioRef" 的那个 <audio> DOM 元素上。

// 应用启动时，初始化用户状态和音乐播放器状态
// 这里的逻辑非常重要，因为它确保了当用户打开应用时，系统能够正确地加载用户信息（如果已经登录）和
// 音乐播放器的状态（比如当前播放的歌曲、播放位置等）。
// vue结束渲染后触发了组件的生命周期钩子 onMounted,当浏览器刚刚把整个网页渲染出来的“第一瞬间”执行。
onMounted(async () => {
  // // 此时页面已经渲染完毕，Vue 已经帮你把 DOM 塞进盒子了！
  // 获取用户 Store 和音乐播放器 Store 的实例
  // 
  const userStore = useUserStore()
  const musicStore = useMusicPlayerStore()
  
  // 初始化 musicPlayer Store 中的 audio 引用
  if (audioRef.value) {
    musicStore.setAudioElement(audioRef.value)
    // 为什么要这么做？因为我们的音乐控制条（MusicBar.vue）和其他页面都需要控制音乐。
    // 我们把这个原生的 <audio> 标签交给了 Pinia（大堂经理）。以后谁想切歌，只需告诉 Pinia 即可，Pinia 会去操作这个 audio。
    // 它把原生的 <audio> DOM 节点交给了全局的 musicStore 保管。
    // 这样一来，任何组件只要拿到 musicStore，就能控制音乐的播放、暂停和切换，彻底解耦。
  }
  // 防止刷新丢失记忆的自动初始化逻辑 (userStore.init())，确保用户状态在应用启动时被正确加载。
  await userStore.init()
  /*
  分析 stores/user.js 时注意事项：
    init() 是否内部 try/catch
    token 失效时怎么处理
    是否会因为请求失败导致应用启动直接报全局错误
  */
})

/**
 * 音频事件监听
 * 当音频加载出总时长时触发。
 *    它拿到当前音频的总时长（audioRef.value.duration），
 *    并存入全局 Store 中，供 <MusicBar> 里的总时间显示使用。
 */

const onLoadedMetadata = () => {
  const musicStore = useMusicPlayerStore()
  musicStore.duration = audioRef.value.duration
  // 当音乐加载完毕，知道这首歌有多长了（比如 3分20秒），
  // 马上把这个长度存进 Pinia。这样所有的进度条组件都能实时更新总时长。
}
/*
音频播放时不断触发。
它将当前的播放进度（audioRef.value.currentTime）实时同步给 Store，
用来推动 <MusicBar> 里的进度条移动。
*/
const onTimeUpdate = () => {
  const musicStore = useMusicPlayerStore()
  musicStore.currentTime = audioRef.value.currentTime
}
/*
歌曲播放完毕时触发，
将 Store 中的播放状态 isPlaying 设为 false。
（实际开发中，这里可能还会加上“自动播放下一首”的逻辑）。
*/
const onEnded = () => {
  const musicStore = useMusicPlayerStore()
  musicStore.isPlaying = false
}
/*
无论是因为代码调用，
    还是因为耳机线拔出等系统级原因导致原生播放器暂停/播放，
    这两个函数都会捕捉到，并同步更新 Store 里的状态，
    确保页面的“播放/暂停”图标状态永远正确。
*/
const onPlay = () => {
  const musicStore = useMusicPlayerStore()
  musicStore.isPlaying = true
}

const onPause = () => {
  const musicStore = useMusicPlayerStore()
  musicStore.isPlaying = false
}

</script>
<!--这里定义了该组件特有的 CSS 样式。-->
<!--scoped表示这些样式只在 App.vue 内部生效，不会污染全局其他组件的代码。-->
<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  padding: 20px;
  padding-bottom: 100px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
