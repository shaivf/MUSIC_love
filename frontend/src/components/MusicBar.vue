<template>
  <div v-if="musicStore.hasCurrentSong" class="music-bar">
    <div class="music-bar-content">
      <div class="song-info" @click="goToPlayer">
        <el-image
          v-if="musicStore.currentSong?.cover"
          :src="musicStore.currentSong.cover"
          class="song-cover"
          fit="cover"
        />
        <div v-else class="song-cover-placeholder">🎍</div>
        <div class="song-details">
          <div class="song-title">{{ musicStore.currentSong?.title }}</div>
          <div class="song-artist">{{ musicStore.currentSong?.artist }}</div>
        </div>
      </div>

      <div class="progress-section">
        <el-slider
          v-model="currentTimeLocal"
          :max="musicStore.duration"
          :step="0.1"
          @input="onProgressChange"
          class="progress-slider"
        />
        <div class="time-display">
          {{ formatTime(musicStore.currentTime) }} / {{ formatTime(musicStore.duration) }}
        </div>
      </div>

      <div class="controls">
        <el-button @click="togglePlay" circle size="small">
          {{ musicStore.isPlaying ? '⏸' : '▶️' }}
        </el-button>
        <el-button @click="goToSongs" circle size="small" title="返回歌曲列表">📵</el-button>
      </div>

      <el-button
        @click="goToPlayer"
        type="text"
        class="open-player-btn"
        title="打开完整播放器"
      >
        ↗️
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicPlayerStore } from '@/stores/musicPlayer'

const router = useRouter()
const musicStore = useMusicPlayerStore()

const currentTimeLocal = ref(0)

watch(
  () => musicStore.currentTime,
  (newVal) => {
    currentTimeLocal.value = newVal
  }
)

const togglePlay = () => {
  musicStore.togglePlay()
}

const onProgressChange = (value) => {
  musicStore.seek(value)
  currentTimeLocal.value = value
}

const goToPlayer = () => {
  if (musicStore.currentSong?.id) {
    router.push(`/player/${musicStore.currentSong.id}`)
  }
}

const goToSongs = () => {
  router.push('/songs')
}

const formatTime = (seconds) => {
  return musicStore.formatTime(seconds)
}
</script>

<style scoped>
.music-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 10px 20px;
  gap: 15px;
}

.music-bar-content {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 15px;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 250px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.song-info:hover {
  opacity: 0.8;
}

.song-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.song-cover-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  flex-shrink: 0;
}

.song-details {
  flex: 1;
  overflow: hidden;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-slider {
  flex: 1;
  min-width: 200px;
}

:deep(.progress-slider .el-slider__bar) {
  background-color: rgba(255, 255, 255, 0.8) !important;
}

:deep(.progress-slider .el-slider__button) {
  border: 2px solid white !important;
  background-color: white !important;
}

:deep(.progress-slider .el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.3) !important;
}

.time-display {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 60px;
  text-align: right;
}

.controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.controls :deep(.el-button) {
  --el-button-bg-color: rgba(255, 255, 255, 0.2) !important;
  --el-button-border-color: rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.controls :deep(.el-button:hover) {
  --el-button-bg-color: rgba(255, 255, 255, 0.35) !important;
  --el-button-border-color: rgba(255, 255, 255, 0.5) !important;
}

.open-player-btn {
  color: white !important;
  font-size: 18px !important;
  flex-shrink: 0;
}

.open-player-btn:hover {
  color: rgba(255, 255, 255, 0.8) !important;
}

@media (max-width: 768px) {
  .music-bar {
    height: 70px;
    padding: 8px 12px;
    gap: 10px;
  }

  .song-cover {
    width: 50px;
    height: 50px;
  }

  .song-cover-placeholder {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }

  .song-info {
    min-width: 180px;
    gap: 10px;
  }

  .song-title {
    font-size: 13px;
  }

  .song-artist {
    font-size: 11px;
  }

  .progress-slider {
    min-width: 150px;
  }

  .time-display {
    font-size: 11px;
    min-width: 50px;
  }
}

@media (max-width: 480px) {
  .music-bar-content {
    gap: 8px;
  }

  .song-info {
    min-width: 120px;
  }

  .progress-section {
    display: none;
  }

  .controls {
    gap: 4px;
  }
}
</style>
