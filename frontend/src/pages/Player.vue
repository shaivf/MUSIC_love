<template>
  <div class="player">
    <el-container>
      <el-header class="header">
        <el-button @click="$router.go(-1)" circle>← 返回</el-button>
        <h1>{{ song?.title || '播放器' }}</h1>
      </el-header>
      <el-main class="main">
        <div v-if="loading" class="loading">
          <span>加载中...⏳</span>
        </div>

        <div v-else-if="song" class="player-content">
          <div class="song-info">
            <div class="cover">
              <el-image
                :src="song.cover || '/default-cover.jpg'"
                :alt="song.title"
                fit="cover"
                style="width: 300px; height: 300px; border-radius: 12px"
              />
            </div>

            <div class="details">
              <h2>{{ song.title }}</h2>
              <p class="artist">{{ song.artist }}</p>
              <p class="album">专辑：{{ song.album || '未知专辑' }}</p>
              <p class="description" v-if="song.description">{{ song.description }}</p>

              <div class="favorite-action">
                <el-button
                  :type="isFavoriteSong ? 'danger' : 'primary'"
                  plain
                  :loading="favoriteLoading"
                  @click="toggleFavorite"
                >
                  {{ isFavoriteSong ? '取消收藏' : '收藏歌曲' }}
                </el-button>
              </div>

              <div class="playlist-action">
                <el-button type="success" plain @click="openPlaylistDialog">
                  加入播放列表
                </el-button>
              </div>

              <div class="stats">
                <span>播放次数: {{ song.play_count || 0 }}</span>
                <span>上传时间: {{ formatDate(song.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="audio-player">
            <div class="controls">
              <el-button @click="togglePlay" type="primary" circle size="large">
                {{ isPlaying ? '⏸' : '▶️' }}
              </el-button>
              <el-slider
                v-model="currentTime"
                :max="duration"
                :step="0.1"
                @input="seekTo"
                style="flex: 1; margin: 0 20px"
              />
              <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
              <el-button @click="toggleMute" circle>{{ isMuted ? '🔇' : '🔊' }}</el-button>
              <el-slider
                v-model="volume"
                :max="1"
                :step="0.01"
                @input="setVolume"
                style="width: 100px; margin-left: 10px"
              />
            </div>
          </div>
        </div>

        <div v-else class="error">
          <el-empty description="歌曲不存在或已被删除" />
        </div>
      </el-main>
    </el-container>

    <el-dialog v-model="showPlaylistDialog" title="加入播放列表" width="520px">
      <div class="playlist-dialog">
        <el-form label-width="100px">
          <el-form-item label="选择列表">
            <el-select
              v-model="selectedPlaylistId"
              placeholder="请选择播放列表"
              style="width: 100%"
              :loading="playlistLoading"
            >
              <el-option
                v-for="item in playlists"
                :key="item.id"
                :label="`${item.name} (${item.song_count || 0} 首)`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="addingToPlaylist" @click="confirmAddToPlaylist">
              添加到所选播放列表
            </el-button>
          </el-form-item>
        </el-form>

        <el-divider>没有合适的播放列表？</el-divider>

        <el-form label-width="100px">
          <el-form-item label="新列表名称">
            <el-input v-model="newPlaylistName" maxlength="100" placeholder="例如：通勤歌单" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="newPlaylistDescription"
              type="textarea"
              :rows="2"
              maxlength="500"
              placeholder="可选"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="success" plain :loading="creatingPlaylist" @click="createAndAddPlaylist">
              新建并加入当前歌曲
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { useAsyncError } from '@/utils/useAsyncError'
import {
  getSong,
  recordPlayHistory,
  getFavorites,
  addFavorite,
  removeFavorite,
  getPlaylists,
  addSongToPlaylist,
  createPlaylist
} from '@/api/songs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const musicStore = useMusicPlayerStore()
const { loading: asyncLoading, execute } = useAsyncError()

// 合并两个 loading 状态（初始加载和异步操作）
const loading_internal = ref(true)
const loading = computed(() => {
  return loading_internal.value || asyncLoading.value
})
const song = ref(null)
const isFavoriteSong = ref(false)

const showPlaylistDialog = ref(false)
const playlists = ref([])
const selectedPlaylistId = ref(null)
const newPlaylistName = ref('')
const newPlaylistDescription = ref('')

// 从 musicStore 中获取状态（使用computed以实时同步）
const isPlaying = computed(() => musicStore.isPlaying)
const isMuted = computed(() => musicStore.isMuted)
const currentTime = computed({
  get: () => musicStore.currentTime,
  set: (val) => { musicStore.currentTime = val }
})
const duration = computed({
  get: () => musicStore.duration,
  set: (val) => { musicStore.duration = val }
})
const volume = computed({
  get: () => musicStore.volume,
  set: (val) => { musicStore.volume = val }
})


const loadFavoriteStatus = async () => {
  if (!userStore.isAuthenticated || !song.value?.id) {
    isFavoriteSong.value = false
    return
  }

  try {
    const response = await execute(
      () => getFavorites({ page: 1, pageSize: 1000 }),
      '加载收藏状态失败',
      { showError: false }
    )
    if (response.success && response.data) {
      const favorites = response.data.favorites || response.data.data || []
      isFavoriteSong.value = favorites.some(item => item.song_id === song.value.id)
    } else {
      isFavoriteSong.value = false
    }
  } catch (error) {
    isFavoriteSong.value = false
  }
}

const loadSong = async () => {
  try {
    loading_internal.value = true
    const response = await execute(
      () => getSong(route.params.id),
      '加载歌曲失败'
    )
    if (response.success && response.data) {
      song.value = response.data
      await loadFavoriteStatus()

      // 使用全局musicStore加载并播放歌曲
      musicStore.loadAndPlay(response.data)

      if (userStore.isAuthenticated) {
        // 记录播放历史，不需要显示错误
        try {
          await recordPlayHistory(route.params.id)
        } catch (err) {
          // 记录历史失败不影响用户体验
          console.error('记录播放历史失败:', err)
        }
      }
    }
  } catch (error) {
    // execute 已经处理了错误显示
  } finally {
    loading_internal.value = false
  }
}

const toggleFavorite = async () => {
  if (!song.value?.id) return

  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再收藏')
    router.push('/login')
    return
  }

  try {
    if (isFavoriteSong.value) {
      const response = await execute(
        () => removeFavorite(song.value.id),
        '取消收藏失败'
      )
      if (response.success) {
        isFavoriteSong.value = false
        ElMessage.success('已取消收藏')
      }
    } else {
      const response = await execute(
        () => addFavorite(song.value.id),
        '收藏失败'
      )
      if (response.success) {
        isFavoriteSong.value = true
        ElMessage.success('收藏成功')
      }
    }
  } catch (error) {
    // execute 已经处理了错误显示
  }
}

const loadPlaylistsForDialog = async () => {
  if (!userStore.isAuthenticated) return

  try {
    const response = await execute(
      () => getPlaylists(),
      '加载播放列表失败',
      { showError: false }
    )
    if (response.success && response.data) {
      playlists.value = response.data.playlists || response.data.data || []
    } else {
      playlists.value = []
    }
  } catch (error) {
    playlists.value = []
  }
}

const openPlaylistDialog = async () => {
  if (!song.value?.id) return

  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再操作')
    router.push('/login')
    return
  }

  showPlaylistDialog.value = true
  selectedPlaylistId.value = null
  await loadPlaylistsForDialog()
}

const confirmAddToPlaylist = async () => {
  if (!song.value?.id) return
  if (!selectedPlaylistId.value) {
    ElMessage.warning('请先选择播放列表')
    return
  }

  try {
    const response = await execute(
      () => addSongToPlaylist(selectedPlaylistId.value, song.value.id),
      '添加到播放列表失败'
    )
    if (response.success) {
      ElMessage.success('已添加到播放列表')
      showPlaylistDialog.value = false
    }
  } catch (error) {
    // execute 已经处理了错误显示
  }
}

const createAndAddPlaylist = async () => {
  if (!song.value?.id) return

  const name = (newPlaylistName.value || '').trim()
  if (!name) {
    ElMessage.warning('请输入播放列表名称')
    return
  }

  try {
    const createResp = await execute(
      () => createPlaylist({
        name,
        description: (newPlaylistDescription.value || '').trim()
      }),
      '创建播放列表失败'
    )

    if (!createResp.success || !createResp.data?.id) {
      return
    }

    const addResp = await execute(
      () => addSongToPlaylist(createResp.data.id, song.value.id),
      '添加歌曲失败'
    )
    if (addResp.success) {
      ElMessage.success('新建播放列表并添加成功')
      showPlaylistDialog.value = false
      newPlaylistName.value = ''
      newPlaylistDescription.value = ''
      await loadPlaylistsForDialog()
    }
  } catch (error) {
    // execute 已经处理了错误显示
  }
}

/**
 * 播放/暂停切换
 */
const togglePlay = () => {
  musicStore.togglePlay()
}

/**
 * 跳转到指定时间
 */
const seekTo = (time) => {
  musicStore.seek(time)
}

/**
 * 切换静音
 */
const toggleMute = () => {
  musicStore.toggleMute()
}

/**
 * 设置音量
 */
const setVolume = (vol) => {
  musicStore.setVolume(vol)
}

const formatTime = (seconds) => {
  return musicStore.formatTime(seconds)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadSong()
})
</script>

<style scoped>
.player {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0 0 0 20px;
  color: #333;
}

.main {
  padding: 40px 20px;
}

.loading {
  text-align: center;
  padding: 40px;
}

.player-content {
  max-width: 800px;
  margin: 0 auto;
}

.song-info {
  display: flex;
  gap: 40px;
  margin-bottom: 40px;
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.cover {
  flex-shrink: 0;
}

.details {
  flex: 1;
}

.details h2 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 28px;
}

.details .artist {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 18px;
}

.details .album {
  margin: 0 0 12px 0;
  color: #999;
  font-size: 14px;
}

.details .description {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.6;
}

.favorite-action {
  margin-bottom: 12px;
}

.playlist-action {
  margin-bottom: 16px;
}

.stats {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
}

.audio-player {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.controls {
  display: flex;
  align-items: center;
  margin-top: 20px;
}

.time {
  font-size: 14px;
  color: #666;
  min-width: 80px;
  text-align: center;
}

.error {
  text-align: center;
  padding: 40px;
}

.playlist-dialog {
  padding-top: 4px;
}
</style>
