import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 全局音乐播放器 Store
 * 支持在任何页面离开播放器后继续播放音乐
 * 管理音频播放状态、控制和进度
 */
export const useMusicPlayerStore = defineStore('musicPlayer', () => {
  // 当前播放的歌曲
  const currentSong = ref(null)
  
  // 播放状态
  const isPlaying = ref(false)
  const isMuted = ref(false)
  
  // 音频进度
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.7)
  
  // Audio DOM 引用（由App.vue设置）
  const audioElement = ref(null)

  /**
   * 设置Audio DOM元素引用
   * App.vue在挂载时调用此方法
   */
  const setAudioElement = (element) => {
    audioElement.value = element
  }

  /**
   * 加载并播放歌曲
   */
  const loadAndPlay = (song) => {
    if (!audioElement.value) {
      console.error('Audio element not initialized')
      return
    }

    currentSong.value = song
    audioElement.value.src = song.audio_url
    audioElement.value.volume = volume.value  // 设置初始音量
    audioElement.value.load()
    
    // 在音频加载后自动播放
    audioElement.value.addEventListener('canplay', () => {
      audioElement.value.play().catch(err => {
        console.error('Autoplay failed:', err)
      })
    }, { once: true })
    
    isPlaying.value = true
  }

  /**
   * 播放/暂停切换
   */
  const togglePlay = () => {
    if (!audioElement.value) return

    if (isPlaying.value) {
      audioElement.value.pause()
      isPlaying.value = false
    } else {
      audioElement.value.play().catch(err => {
        console.error('Play failed:', err)
      })
      isPlaying.value = true
    }
  }

  /**
   * 直接播放
   */
  const play = () => {
    if (!audioElement.value || isPlaying.value) return
    audioElement.value.play().catch(err => {
      console.error('Play failed:', err)
    })
    isPlaying.value = true
  }

  /**
   * 直接暂停
   */
  const pause = () => {
    if (!audioElement.value || !isPlaying.value) return
    audioElement.value.pause()
    isPlaying.value = false
  }

  /**
   * 跳转到指定时间
   */
  const seek = (time) => {
    if (!audioElement.value) return
    audioElement.value.currentTime = time
    currentTime.value = time
  }

  /**
   * 切换静音
   */
  const toggleMute = () => {
    if (!audioElement.value) return
    audioElement.value.muted = !audioElement.value.muted
    isMuted.value = audioElement.value.muted
  }

  /**
   * 设置音量
   */
  const setVolume = (vol) => {
    if (!audioElement.value) return
    audioElement.value.volume = Math.max(0, Math.min(1, vol))
    volume.value = audioElement.value.volume
  }

  /**
   * 停止播放并清除当前歌曲
   */
  const stop = () => {
    if (!audioElement.value) return
    audioElement.value.pause()
    audioElement.value.src = ''
    currentSong.value = null
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  /**
   * 获取格式化的时间字符串
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 当前播放歌曲是否为空
   */
  const hasCurrentSong = computed(() => currentSong.value !== null)

  return {
    // State
    currentSong,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    volume,
    audioElement,

    // Computed
    hasCurrentSong,
    
    // Methods
    setAudioElement,
    loadAndPlay,
    togglePlay,
    play,
    pause,
    seek,
    toggleMute,
    setVolume,
    stop,
    formatTime
  }
})
