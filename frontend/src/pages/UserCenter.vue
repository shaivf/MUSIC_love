<template>
  <div class="user-center">
    <el-container>
      <el-header class="header">
        <h1>个人中心</h1>
      </el-header>

      <el-main class="main">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="我的信息" name="profile">
            <div class="profile-section">
              <el-card class="profile-card" shadow="hover">
                <template #header>
                  <div class="card-header">
                    <h3>用户信息</h3>
                    <el-button type="primary" link @click="openProfileDialog">编辑资料</el-button>
                  </div>
                </template>
                <div class="profile-info">
                  <p><strong>邮箱:</strong> {{ userStore.user?.email }}</p>
                  <p><strong>用户名:</strong> {{ userStore.user?.username || '-' }}</p>
                  <p><strong>用户 ID:</strong> {{ userStore.user?.id }}</p>
                  <p><strong>头像:</strong> {{ userStore.user?.avatar || '-' }}</p>
                  <p><strong>简介:</strong> {{ userStore.user?.bio || '-' }}</p>
                  <p><strong>注册时间:</strong> {{ formatDate(userStore.user?.created_at) }}</p>
                </div>
              </el-card>
            </div>
          </el-tab-pane>

          <el-tab-pane label="我的音乐" name="songs">
            <div class="songs-section">
              <div class="section-header">
                <h3>我上传的音乐</h3>
                <el-button type="primary" @click="$router.push('/songs')">上传新音乐</el-button>
              </div>

              <div v-if="loading" class="loading">
                <span>加载中...⏳</span>
              </div>
              <div v-else-if="userSongs.length === 0" class="empty">
                <el-empty description="您还没有上传音乐">
                  <el-button type="primary" @click="$router.push('/songs')">上传第一首音乐</el-button>
                </el-empty>
              </div>
              <div v-else class="song-list">
                <el-table :data="userSongs" style="width: 100%">
                  <el-table-column prop="title" label="歌曲标题" min-width="180" />
                  <el-table-column prop="artist" label="艺术家" min-width="140" />
                  <el-table-column prop="album" label="专辑" min-width="140" />
                  <el-table-column prop="play_count" label="播放次数" width="110" />
                  <el-table-column prop="created_at" label="上传时间" width="140">
                    <template #default="scope">
                      {{ formatDate(scope.row.created_at) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="240" fixed="right">
                    <template #default="scope">
                      <el-button size="small" @click="$router.push(`/player/${scope.row.id}`)">播放</el-button>
                      <el-button size="small" type="primary" plain @click="openEditDialog(scope.row)">编辑</el-button>
                      <el-button size="small" type="danger" @click="deleteSong(scope.row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="我的收藏" name="favorites">
            <div class="favorites-section">
              <h3>我的收藏</h3>

              <div v-if="loading" class="loading">
                <span>加载中...⏳</span>
              </div>
              <div v-else-if="favoriteSongs.length === 0" class="empty">
                <el-empty description="暂无收藏歌曲" />
              </div>
              <div v-else class="favorite-list">
                <el-table :data="favoriteSongs" style="width: 100%">
                  <el-table-column label="歌曲标题" min-width="220">
                    <template #default="scope">
                      {{ scope.row.song?.title || scope.row.title }}
                    </template>
                  </el-table-column>
                  <el-table-column label="艺术家" min-width="160">
                    <template #default="scope">
                      {{ scope.row.song?.artist || scope.row.artist }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="favorited_at" label="收藏时间" width="160">
                    <template #default="scope">
                      {{ formatDate(scope.row.favorited_at) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="180" fixed="right">
                    <template #default="scope">
                      <el-button size="small" @click="$router.push(`/player/${scope.row.song_id}`)">播放</el-button>
                      <el-button size="small" type="danger" @click="removeFavoriteSong(scope.row)">取消收藏</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="播放历史" name="history">
            <div class="history-section">
              <h3>播放历史</h3>

              <div v-if="playHistory.length > 0" class="history-statistics">
                <el-row :gutter="20" class="history-stat-row">
                  <el-col :span="12">
                    <el-card shadow="hover">
                      <template #header>
                        <div class="card-header"><strong>按日播放统计</strong></div>
                      </template>
                      <ul>
                        <li v-for="item in dailyPlayStats" :key="item.date">
                          {{ item.date }}：{{ item.count }} 次
                        </li>
                      </ul>
                    </el-card>
                  </el-col>
                  <el-col :span="12">
                    <el-card shadow="hover">
                      <template #header>
                        <div class="card-header"><strong>最常播放歌曲（TOP 5）</strong></div>
                      </template>
                      <ul>
                        <li v-for="item in topPlayedSongs" :key="item.title">
                          {{ item.title }}：{{ item.play_count }} 次
                        </li>
                      </ul>
                    </el-card>
                  </el-col>
                </el-row>
              </div>

              <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else-if="playHistory.length === 0" class="empty">
                <el-empty description="暂无播放记录" />
              </div>
              <div v-else class="history-list">
                <el-table :data="playHistory" style="width: 100%">
                  <el-table-column prop="song.title" label="歌曲标题" min-width="200" />
                  <el-table-column prop="song.artist" label="艺术家" min-width="150" />
                  <el-table-column prop="played_at" label="播放时间" width="150">
                    <template #default="scope">
                      {{ formatDate(scope.row.played_at) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="scope">
                      <el-button size="small" @click="$router.push(`/player/${scope.row.song_id}`)">再次播放</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="播放列表" name="playlists">
            <div class="playlists-section">
              <div class="section-header">
                <h3>我的播放列表</h3>
                <el-button type="primary" @click="openCreatePlaylistDialog">新建播放列表</el-button>
              </div>

              <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else-if="playlists.length === 0" class="empty">
                <el-empty description="还没有播放列表，先创建一个吧" />
              </div>
              <div v-else class="playlist-list">
                <el-table :data="playlists" style="width: 100%">
                  <el-table-column prop="name" label="名称" min-width="180" />
                  <el-table-column prop="description" label="描述" min-width="220" />
                  <el-table-column prop="song_count" label="歌曲数" width="100" />
                  <el-table-column prop="created_at" label="创建时间" width="140">
                    <template #default="scope">
                      {{ formatDate(scope.row.created_at) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="280" fixed="right">
                    <template #default="scope">
                      <el-button size="small" @click="viewPlaylistSongs(scope.row)">查看歌曲</el-button>
                      <el-button size="small" type="primary" plain @click="openEditPlaylistDialog(scope.row)">编辑</el-button>
                      <el-button size="small" type="danger" @click="deletePlaylistRow(scope.row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <el-card v-if="selectedPlaylist" class="playlist-detail" shadow="never">
                <template #header>
                  <div class="playlist-detail-header">
                    <span>播放列表：{{ selectedPlaylist.name }}</span>
                    <span class="playlist-detail-tip">可在播放器页把歌曲加入该列表</span>
                  </div>
                </template>

                <div v-if="playlistSongsLoading" class="loading">
                  <span>加载列表歌曲中...⏳</span>
                </div>
                <div v-else-if="playlistSongs.length === 0" class="empty">
                  <el-empty description="该播放列表还没有歌曲" />
                </div>
                <div v-else>
                  <el-table :data="playlistSongs" style="width: 100%">
                    <el-table-column label="歌曲标题" min-width="200">
                      <template #default="scope">
                        {{ scope.row.song?.title || scope.row.title }}
                      </template>
                    </el-table-column>
                    <el-table-column label="艺术家" min-width="150">
                      <template #default="scope">
                        {{ scope.row.song?.artist || scope.row.artist }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="added_at" label="加入时间" width="150">
                      <template #default="scope">
                        {{ formatDate(scope.row.added_at) }}
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="180" fixed="right">
                      <template #default="scope">
                        <el-button size="small" @click="$router.push(`/player/${scope.row.song_id}`)">播放</el-button>
                        <el-button
                          size="small"
                          type="danger"
                          @click="removeSongFromCurrentPlaylist(scope.row)"
                        >
                          移除
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-card>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>

    <el-dialog v-model="showEditDialog" title="编辑歌曲" width="520px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="歌曲标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入歌曲标题" />
        </el-form-item>
        <el-form-item label="艺术家" prop="artist">
          <el-input v-model="editForm.artist" placeholder="请输入艺术家" />
        </el-form-item>
        <el-form-item label="专辑" prop="album">
          <el-input v-model="editForm.album" placeholder="请输入专辑（可选）" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入歌曲描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingEdit" @click="saveEditSong">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showProfileDialog" title="编辑个人资料" width="560px">
      <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-width="90px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="profileForm.username" maxlength="50" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="头像 URL" prop="avatar">
          <el-input v-model="profileForm.avatar" maxlength="255" placeholder="可选" />
        </el-form-item>
        <el-form-item label="简介" prop="bio">
          <el-input
            v-model="profileForm.bio"
            type="textarea"
            :rows="3"
            maxlength="1000"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProfileDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPlaylistDialog" :title="playlistForm.id ? '编辑播放列表' : '新建播放列表'" width="520px">
      <el-form ref="playlistFormRef" :model="playlistForm" :rules="playlistRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="playlistForm.name" maxlength="100" placeholder="请输入播放列表名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="playlistForm.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            placeholder="请输入描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPlaylistDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingPlaylist" @click="savePlaylist">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getUserSongs,
  deleteSong as apiDeleteSong,
  updateSong as apiUpdateSong,
  getPlayHistory,
  getFavorites,
  removeFavorite as apiRemoveFavorite,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistSongs,
  removeSongFromPlaylist
} from '@/api/songs'

const userStore = useUserStore()
const router = useRouter()

const activeTab = ref('profile')
const loading = ref(false)

const userSongs = ref([])
const playHistory = ref([])
const favoriteSongs = ref([])

const playlists = ref([])
const selectedPlaylist = ref(null)
const playlistSongs = ref([])
const playlistSongsLoading = ref(false)

const showEditDialog = ref(false)
const savingEdit = ref(false)
const editFormRef = ref()
const showProfileDialog = ref(false)
const savingProfile = ref(false)
const profileFormRef = ref()

const showPlaylistDialog = ref(false)
const savingPlaylist = ref(false)
const playlistFormRef = ref()

const editForm = reactive({
  id: null,
  title: '',
  artist: '',
  album: '',
  description: ''
})

const playlistForm = reactive({
  id: null,
  name: '',
  description: ''
})

const profileForm = reactive({
  email: '',
  username: '',
  avatar: '',
  bio: ''
})

const editRules = {
  title: [{ required: true, message: '请输入歌曲标题', trigger: 'blur' }],
  artist: [{ required: true, message: '请输入艺术家', trigger: 'blur' }]
}

const playlistRules = {
  name: [{ required: true, message: '请输入播放列表名称', trigger: 'blur' }]
}

const profileRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

const dailyPlayStats = computed(() => {
  const map = new Map()
  playHistory.value.forEach(item => {
    const date = item.played_at ? new Date(item.played_at).toLocaleDateString('zh-CN') : null
    if (!date) return
    map.set(date, (map.get(date) || 0) + 1)
  })
  return Array.from(map.entries())
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, count]) => ({ date, count }))
})

const topPlayedSongs = computed(() => {
  const map = new Map()
  playHistory.value.forEach(item => {
    const title = item.song?.title || item.title || '未知歌曲'
    map.set(title, (map.get(title) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([title, play_count]) => ({ title, play_count }))
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 5)
})

const loadUserSongs = async () => {
  try {
    loading.value = true
    const response = await getUserSongs()
    if (response.success && response.data) {
      userSongs.value = response.data.songs || response.data.data || []
    } else {
      ElMessage.error(response.message || '加载音乐失败')
      userSongs.value = []
    }
  } catch (error) {
    console.error('加载音乐错误:', error)
    ElMessage.error('加载音乐失败')
    userSongs.value = []
  } finally {
    loading.value = false
  }
}

const loadPlayHistory = async () => {
  try {
    loading.value = true
    const response = await getPlayHistory()
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        playHistory.value = response.data
      } else {
        playHistory.value = response.data.history || response.data.data || []
      }
    } else {
      ElMessage.error(response.message || '加载播放历史失败')
      playHistory.value = []
    }
  } catch (error) {
    console.error('加载播放历史错误:', error)
    ElMessage.error('加载播放历史失败')
    playHistory.value = []
  } finally {
    loading.value = false
  }
}

const loadFavorites = async () => {
  try {
    loading.value = true
    const response = await getFavorites({ page: 1, pageSize: 100 })
    if (response.success && response.data) {
      favoriteSongs.value = response.data.favorites || response.data.data || []
    } else {
      ElMessage.error(response.message || '加载收藏失败')
      favoriteSongs.value = []
    }
  } catch (error) {
    console.error('加载收藏错误:', error)
    ElMessage.error('加载收藏失败')
    favoriteSongs.value = []
  } finally {
    loading.value = false
  }
}

const loadPlaylists = async () => {
  try {
    loading.value = true
    const response = await getPlaylists()
    if (response.success && response.data) {
      playlists.value = response.data.playlists || response.data.data || []
    } else {
      ElMessage.error(response.message || '加载播放列表失败')
      playlists.value = []
    }
  } catch (error) {
    console.error('加载播放列表错误:', error)
    ElMessage.error('加载播放列表失败')
    playlists.value = []
  } finally {
    loading.value = false
  }
}

const viewPlaylistSongs = async (playlist) => {
  selectedPlaylist.value = playlist
  await loadPlaylistSongs(playlist.id)
}

const loadPlaylistSongs = async (playlistId) => {
  try {
    playlistSongsLoading.value = true
    const response = await getPlaylistSongs(playlistId)
    if (response.success && response.data) {
      playlistSongs.value = response.data.songs || response.data.data || []
    } else {
      ElMessage.error(response.message || '加载播放列表歌曲失败')
      playlistSongs.value = []
    }
  } catch (error) {
    console.error('加载播放列表歌曲错误:', error)
    ElMessage.error('加载播放列表歌曲失败')
    playlistSongs.value = []
  } finally {
    playlistSongsLoading.value = false
  }
}

const deleteSong = async (song) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除歌曲「${song.title}」吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await apiDeleteSong(song.id)
    if (response.success) {
      ElMessage.success('删除成功')
      await loadUserSongs()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error?.message?.includes('cancel') || error === 'cancel') return
    console.error('删除错误:', error)
    ElMessage.error('删除失败')
  }
}

const removeFavoriteSong = async (favorite) => {
  try {
    const title = favorite.song?.title || favorite.title || '该歌曲'
    await ElMessageBox.confirm(
      `确定要取消收藏「${title}」吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await apiRemoveFavorite(favorite.song_id)
    if (response.success) {
      ElMessage.success('已取消收藏')
      await loadFavorites()
    } else {
      ElMessage.error(response.message || '取消收藏失败')
    }
  } catch (error) {
    if (error?.message?.includes('cancel') || error === 'cancel') return
    console.error('取消收藏错误:', error)
    ElMessage.error('取消收藏失败')
  }
}

const openEditDialog = (song) => {
  editForm.id = song.id
  editForm.title = song.title || ''
  editForm.artist = song.artist || ''
  editForm.album = song.album || ''
  editForm.description = song.description || ''
  showEditDialog.value = true
}

const saveEditSong = async () => {
  try {
    await editFormRef.value.validate()
    savingEdit.value = true

    const payload = {
      title: editForm.title,
      artist: editForm.artist,
      album: editForm.album,
      description: editForm.description
    }

    const response = await apiUpdateSong(editForm.id, payload)
    if (response.success) {
      ElMessage.success('更新成功')
      showEditDialog.value = false
      await loadUserSongs()
    } else {
      ElMessage.error(response.message || '更新失败')
    }
  } catch (error) {
    console.error('更新歌曲错误:', error)
    ElMessage.error('更新失败')
  } finally {
    savingEdit.value = false
  }
}

const openProfileDialog = () => {
  profileForm.email = userStore.user?.email || ''
  profileForm.username = userStore.user?.username || ''
  profileForm.avatar = userStore.user?.avatar || ''
  profileForm.bio = userStore.user?.bio || ''
  showProfileDialog.value = true
}

const saveProfile = async () => {
  try {
    await profileFormRef.value.validate()
    savingProfile.value = true

    const payload = {
      email: profileForm.email.trim(),
      username: profileForm.username.trim(),
      avatar: profileForm.avatar.trim(),
      bio: profileForm.bio.trim()
    }

    await userStore.updateProfile(payload)
    ElMessage.success('个人资料更新成功')
    showProfileDialog.value = false
  } catch (error) {
    console.error('更新个人资料错误:', error)
    ElMessage.error('更新个人资料失败')
  } finally {
    savingProfile.value = false
  }
}

const openCreatePlaylistDialog = () => {
  playlistForm.id = null
  playlistForm.name = ''
  playlistForm.description = ''
  showPlaylistDialog.value = true
}

const openEditPlaylistDialog = (playlist) => {
  playlistForm.id = playlist.id
  playlistForm.name = playlist.name || ''
  playlistForm.description = playlist.description || ''
  showPlaylistDialog.value = true
}

const savePlaylist = async () => {
  try {
    await playlistFormRef.value.validate()
    savingPlaylist.value = true

    const payload = {
      name: playlistForm.name,
      description: playlistForm.description
    }

    let response
    if (playlistForm.id) {
      response = await updatePlaylist(playlistForm.id, payload)
    } else {
      response = await createPlaylist(payload)
    }

    if (response.success) {
      ElMessage.success(playlistForm.id ? '更新播放列表成功' : '创建播放列表成功')
      showPlaylistDialog.value = false
      await loadPlaylists()

      if (selectedPlaylist.value?.id && playlistForm.id === selectedPlaylist.value.id) {
        selectedPlaylist.value = { ...selectedPlaylist.value, ...response.data }
      }
    } else {
      ElMessage.error(response.message || '保存播放列表失败')
    }
  } catch (error) {
    console.error('保存播放列表错误:', error)
    ElMessage.error('保存播放列表失败')
  } finally {
    savingPlaylist.value = false
  }
}

const deletePlaylistRow = async (playlist) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除播放列表「${playlist.name}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await deletePlaylist(playlist.id)
    if (response.success) {
      ElMessage.success('删除播放列表成功')

      if (selectedPlaylist.value?.id === playlist.id) {
        selectedPlaylist.value = null
        playlistSongs.value = []
      }

      await loadPlaylists()
    } else {
      ElMessage.error(response.message || '删除播放列表失败')
    }
  } catch (error) {
    if (error?.message?.includes('cancel') || error === 'cancel') return
    console.error('删除播放列表错误:', error)
    ElMessage.error('删除播放列表失败')
  }
}

const removeSongFromCurrentPlaylist = async (item) => {
  if (!selectedPlaylist.value?.id) return

  try {
    const title = item.song?.title || item.title || '该歌曲'
    await ElMessageBox.confirm(
      `确定将「${title}」从播放列表中移除吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await removeSongFromPlaylist(selectedPlaylist.value.id, item.song_id)
    if (response.success) {
      ElMessage.success('移除成功')
      await loadPlaylistSongs(selectedPlaylist.value.id)
      await loadPlaylists()
    } else {
      ElMessage.error(response.message || '移除失败')
    }
  } catch (error) {
    if (error?.message?.includes('cancel') || error === 'cancel') return
    console.error('移除播放列表歌曲错误:', error)
    ElMessage.error('移除失败')
  }
}

const handleTabClick = async (tab) => {
  if (tab.props.name === 'songs') {
    await loadUserSongs()
  } else if (tab.props.name === 'favorites') {
    await loadFavorites()
  } else if (tab.props.name === 'history') {
    await loadPlayHistory()
  } else if (tab.props.name === 'playlists') {
    selectedPlaylist.value = null
    playlistSongs.value = []
    await loadPlaylists()
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

onMounted(async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  try {
    await userStore.getProfile()
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('获取用户信息失败，请重新登录')
    userStore.logout()
    router.push('/login')
    return
  }

  await loadUserSongs()
})
</script>

<style scoped>
.user-center {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  color: #333;
}

.main {
  padding: 20px;
}

.profile-section {
  max-width: 600px;
}

.profile-card {
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  color: #333;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-info p {
  margin: 12px 0;
  color: #666;
}

.songs-section,
.favorites-section,
.history-section,
.playlists-section {
  max-width: 1200px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #333;
}

.history-statistics {
  margin-bottom: 20px;
}

.history-stat-row .el-card {
  height: 220px;
  overflow: auto;
}

.history-stat-row ul {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.history-stat-row li {
  margin-bottom: 6px;
}

.loading {
  text-align: center;
  padding: 40px;
}

.empty {
  text-align: center;
  padding: 40px;
}

.song-list,
.favorite-list,
.history-list,
.playlist-list {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.playlist-detail {
  margin-top: 20px;
}

.playlist-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.playlist-detail-tip {
  font-size: 12px;
  color: #909399;
}
</style>
