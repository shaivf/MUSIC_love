<template>
  <div class="songs">
    <el-container>
      <el-header class="header">
        <h1>音乐库</h1>
        <div class="actions">
          <el-input
            v-model="uploaderEmailFilter"
            placeholder="按上传者邮箱筛选"
            clearable
            style="width: 280px; margin-right: 12px"
            @input="handleUploaderEmailInput"
          />
          <el-input
            v-model="searchQuery"
            placeholder="搜索歌曲..."
            style="width: 300px; margin-right: 12px"
            clearable
            @input="handleSearch"
          />
          <el-button v-if="userStore.isAuthenticated" type="primary" @click="showUploadDialog = true">
            上传音乐
          </el-button>
        </div>
      </el-header>
      <el-main class="main">
        <div v-if="loading" class="loading">
          <span>加载中...⏳</span>
        </div>
        <div v-else-if="songs.length === 0" class="empty">
          <el-empty description="暂无音乐作品">
            <el-button v-if="userStore.isAuthenticated" type="primary" @click="showUploadDialog = true">
              上传第一首音乐
            </el-button>
          </el-empty>
        </div>
        <div v-else class="song-grid">
          <el-row :gutter="20">
            <el-col
              v-for="song in songs"
              :key="song.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <el-card class="song-card" shadow="hover" @click="playSong(song)">
                <div class="song-cover">
                  <el-button
                    class="favorite-btn"
                    size="small"
                    circle
                    :type="isFavorite(song.id) ? 'danger' : 'info'"
                    :loading="favoriteLoadingIds.includes(song.id)"
                    @click.stop="toggleFavorite(song)"
                  >
                    {{ isFavorite(song.id) ? '♥' : '♡' }}
                  </el-button>
                  <el-image
                    :src="song.cover || song.cover_url || '/default-cover.jpg'"
                    :alt="song.title"
                    fit="cover"
                    style="width: 100%; height: 150px"
                  />
                  <div class="play-overlay">
                    <el-icon size="32" color="white"><VideoPlay /></el-icon>
                  </div>
                </div>
                <div class="song-info">
                  <h3>{{ song.title }}</h3>
                  <p class="artist">{{ song.artist }}</p>
                  <p v-if="song.uploader_email || song.uploader_name" class="uploader">
                    上传者：{{ song.uploader_email || song.uploader_name }}
                  </p>
                  <p v-if="song.album" class="album">{{ song.album }}</p>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
        <div v-if="!loading && pagination.total > 0" class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[12, 20, 40]"
            layout="total, sizes, prev, pager, next"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </el-main>
    </el-container>

    <!-- 上传音乐对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传音乐"
      width="500px"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="80px"
      >
        <el-form-item label="歌曲文件" prop="audioFile">
          <el-upload
            ref="uploadRef"
            :on-change="handleFileChange"
            :auto-upload="false"
            :limit="1"
            accept="audio/*"
            action=""
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">只能上传音频文件，且不超过50MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="封面图片" prop="coverFile">
          <el-upload
            :on-change="handleCoverChange"
            :auto-upload="false"
            :limit="1"
            accept="image/*"
            action=""
          >
            <el-button>选择封面</el-button>
            <template #tip>
              <div class="el-upload__tip">可选，建议尺寸 300x300</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="歌曲标题" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入歌曲标题" />
        </el-form-item>
        <el-form-item label="艺术家" prop="artist">
          <el-input v-model="uploadForm.artist" placeholder="请输入艺术家姓名" />
        </el-form-item>
        <el-form-item label="专辑">
          <el-input v-model="uploadForm.album" placeholder="请输入专辑名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选的歌曲描述"
          />
        </el-form-item>
      </el-form>
      <div v-if="uploading || uploadProgress > 0" class="upload-progress">
        <div class="upload-progress-text">上传进度：{{ uploadProgress }}%</div>
        <el-progress :percentage="uploadProgress" :status="uploadProgress >= 100 ? 'success' : undefined" />
      </div>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getSongs,
  uploadSong,
  getFavorites,
  addFavorite,
  removeFavorite
} from '@/api/songs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const showUploadDialog = ref(false)
const searchQuery = ref('')
const uploaderEmailFilter = ref('')
const songs = ref([])
const favoriteSongIds = ref([])
const favoriteLoadingIds = ref([])
const searchDebounceTimer = ref(null)
const latestSongsRequestId = ref(0)
const SEARCH_DEBOUNCE_MS = 350

const uploadFormRef = ref()
const uploadRef = ref()
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const uploadForm = reactive({
  title: '',
  artist: '',
  album: '',
  description: '',
  audioFile: null,
  coverFile: null
})

const uploadRules = {
  audioFile: [
    { required: true, message: '请选择音频文件', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入歌曲标题', trigger: 'blur' }
  ],
  artist: [
    { required: true, message: '请输入艺术家姓名', trigger: 'blur' }
  ]
}

const getSongQueryParams = () => {
  const params = {
    search: searchQuery.value.trim(),
    page: pagination.page,
    pageSize: pagination.pageSize
  }

  if (uploaderEmailFilter.value) {
    params.uploaderEmail = uploaderEmailFilter.value.trim()
  }

  return params
}

const loadSongs = async ({ resetPage = false, allowAdjustPage = true } = {}) => {
  const requestId = ++latestSongsRequestId.value
  try {
    if (resetPage) pagination.page = 1
    loading.value = true
    const response = await getSongs(getSongQueryParams())

    // 仅处理最新请求，避免慢请求覆盖新结果
    if (requestId !== latestSongsRequestId.value) return

    // 响应格式: { success: true, code: 200, data: { total, page, limit, songs }, message }
    if (response.success) {
      const payload = response.data || {}
      songs.value = payload.songs || []
      pagination.total = Number(payload.total || 0)
      pagination.page = Number(payload.page || pagination.page)
      pagination.pageSize = Number(payload.pageSize || payload.limit || pagination.pageSize)

      if (allowAdjustPage && pagination.total > 0 && songs.value.length === 0 && pagination.page > 1) {
        const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
        if (lastPage !== pagination.page) {
          pagination.page = lastPage
          await loadSongs({ allowAdjustPage: false })
        }
      }
    } else {
      ElMessage.error('加载歌曲失败')
      songs.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('加载歌曲错误:', error)
    ElMessage.error('加载歌曲失败')
    songs.value = []
    pagination.total = 0
  } finally {
    if (requestId === latestSongsRequestId.value) {
      loading.value = false
    }
  }
}

const scheduleReloadWithFilter = () => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
  searchDebounceTimer.value = setTimeout(() => {
    loadSongs({ resetPage: true })
  }, SEARCH_DEBOUNCE_MS)
}

const handleSearch = () => {
  scheduleReloadWithFilter()
}

const handleUploaderEmailInput = () => {
  scheduleReloadWithFilter()
}

const handlePageChange = async () => {
  await loadSongs()
}

const handlePageSizeChange = async () => {
  pagination.page = 1
  await loadSongs()
}

const loadFavoriteIds = async () => {
  if (!userStore.isAuthenticated) {
    favoriteSongIds.value = []
    return
  }

  try {
    const response = await getFavorites({ page: 1, pageSize: 1000 })
    if (response.success && response.data) {
      const favorites = response.data.favorites || response.data.data || []
      favoriteSongIds.value = favorites.map(item => item.song_id)
    } else {
      favoriteSongIds.value = []
    }
  } catch (error) {
    console.error('加载收藏列表错误:', error)
    favoriteSongIds.value = []
  }
}

const isFavorite = (songId) => {
  return favoriteSongIds.value.includes(songId)
}

const toggleFavorite = async (song) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再收藏')
    router.push('/login')
    return
  }

  if (favoriteLoadingIds.value.includes(song.id)) return
  favoriteLoadingIds.value.push(song.id)

  try {
    if (isFavorite(song.id)) {
      const response = await removeFavorite(song.id)
      if (response.success) {
        favoriteSongIds.value = favoriteSongIds.value.filter(id => id !== song.id)
        ElMessage.success('已取消收藏')
      }
    } else {
      const response = await addFavorite(song.id)
      if (response.success) {
        favoriteSongIds.value = [...favoriteSongIds.value, song.id]
        ElMessage.success('收藏成功')
      }
    }
  } catch (error) {
    console.error('收藏操作错误:', error)
  } finally {
    favoriteLoadingIds.value = favoriteLoadingIds.value.filter(id => id !== song.id)
  }
}

const playSong = (song) => {
  router.push(`/player/${song.id}`)
}

const handleFileChange = (file) => {
  uploadForm.audioFile = file.raw
  uploadForm.title = uploadForm.title || file.name.replace(/\.[^/.]+$/, '')
}

const handleCoverChange = (file) => {
  uploadForm.coverFile = file.raw
}

const handleUpload = async () => {
  try {
    await uploadFormRef.value.validate()
    uploading.value = true
    uploadProgress.value = 0

    const formData = new FormData()
    formData.append('audio', uploadForm.audioFile)
    if (uploadForm.coverFile) {
      formData.append('cover', uploadForm.coverFile)
    }
    formData.append('title', uploadForm.title)
    formData.append('artist', uploadForm.artist)
    if (uploadForm.album) {
      formData.append('album', uploadForm.album)
    }
    if (uploadForm.description) {
      formData.append('description', uploadForm.description)
    }

    const response = await uploadSong(formData, (percentage) => {
      uploadProgress.value = percentage
    })
    if (response.success) {
      uploadProgress.value = 100
      ElMessage.success('上传成功')
      showUploadDialog.value = false
      resetUploadForm()
      await loadSongs({ resetPage: true })
    } else {
      ElMessage.error(response.message || '上传失败')
      uploadProgress.value = 0
    }
  } catch (error) {
    console.error('上传错误:', error)
    ElMessage.error('上传失败')
    uploadProgress.value = 0
  } finally {
    uploading.value = false
  }
}

const resetUploadForm = () => {
  uploadForm.title = ''
  uploadForm.artist = ''
  uploadForm.album = ''
  uploadForm.description = ''
  uploadForm.audioFile = null
  uploadForm.coverFile = null
  uploadProgress.value = 0
  uploadRef.value?.clearFiles()
}

onMounted(() => {
  const bootstrap = async () => {
    await loadSongs()
    await loadFavoriteIds()
  }
  bootstrap()
})

onBeforeUnmount(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
})
</script>

<style scoped>
.songs {
  min-height: 100vh;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  color: #333;
}

.actions {
  display: flex;
  align-items: center;
}

.main {
  padding: 20px;
  background: #f5f5f5;
}

.loading {
  text-align: center;
  padding: 40px;
}

.empty {
  text-align: center;
  padding: 40px;
}

.song-grid {
  max-width: 1200px;
  margin: 0 auto;
}

.song-card {
  cursor: pointer;
  transition: transform 0.3s;
  margin-bottom: 20px;
}

.song-card:hover {
  transform: translateY(-5px);
}

.song-cover {
  position: relative;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.favorite-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  opacity: 0.95;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.song-card:hover .play-overlay {
  opacity: 1;
}

.song-info {
  padding: 16px;
}

.song-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-info .artist {
  margin: 0 0 4px 0;
  color: #666;
  font-size: 14px;
}

.song-info .uploader {
  margin: 0 0 4px 0;
  color: #8a8a8a;
  font-size: 12px;
}

.song-info .genre {
  margin: 0;
  color: #999;
  font-size: 12px;
}

.pagination-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.upload-progress {
  margin-top: 10px;
}

.upload-progress-text {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}
</style>
