import http from '@/utils/http'

// 鍗曠嫭 Export锛坰ongs.js 鐨勫啓娉曪級鈥斺€?銆愬崟鐐规ā寮忋€?// 褰?Songs.vue 椤甸潰闇€瑕佺敤鐨勬椂鍊欙紝
//    蹇呴』鐢ㄥぇ鎷彿 {} 鎶婇渶瑕佺殑鍏蜂綋鍚嶅瓧鈥滃す鈥濆嚭鏉ワ紙杩欏彨鎸夐渶寮曞叆锛夈€?
// 鑾峰彇姝屾洸鍒楄〃
export const getSongs = (params = {}) => {
  return http.get('/songs', { params })
}

// 鑾峰彇鍗曢姝屾洸璇︽儏
export const getSong = (id) => {
  return http.get(`/songs/${id}`)
}

// 涓婁紶姝屾洸锛堟敮鎸佷笂浼犺繘搴﹀洖璋冿級
export const uploadSong = (formData, onProgress) => {
  return http.post('/songs', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event) => {
      if (typeof onProgress !== 'function') return
      if (!event?.total) {
        onProgress(0)
        return
      }
      const percentage = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(percentage)
    }
  })
}

// 鍒犻櫎姝屾洸
export const deleteSong = (id) => {
  return http.delete(`/songs/${id}`)
}

// RESTful API 椋庢牸
  /*
  涓轰粈涔堝悓涓€涓湴鍧€鍙互骞蹭袱浠朵笉鍚岀殑浜嬶紵鍥犱负瀹冧滑鐢ㄧ殑**HTTP 鍔ㄨ瘝锛堟柟娉曪級**涓嶅悓锛?  GET锛堣锛夛細 鍛婅瘔鍚庣锛屾垜瑕佲€滆幏鍙栤€濇暟鎹€傦紙鑾峰彇鍒楄〃锛?  POST锛堝啓锛夛細 鍛婅瘔鍚庣锛屾垜瑕佲€滄柊寤?涓婁紶鈥濇暟鎹€?  PUT锛堟敼锛夛細 鍛婅瘔鍚庣锛屾垜瑕佲€滄洿鏂?淇敼鈥濇暟鎹€傦紙姣斿 updateSong锛?  DELETE锛堝垹锛夛細 鍛婅瘔鍚庣锛屾垜瑕佲€滃垹闄も€濇暟鎹€?杩欏氨鏄洰鍓嶄簰鑱旂綉鏈€涓绘祦鐨勬帴鍙ｈ璁¤鑼冿細RESTful 椋庢牸銆傜敤涓嶅悓鐨勫姩璇嶏紝瀵瑰悓涓€涓祫婧愶紙/songs锛夎繘琛屽鍒犳敼鏌ャ€?  */


// 缂栬緫姝屾洸淇℃伅
export const updateSong = (id, data) => {
  return http.put(`/songs/${id}`, data)
}

// Get current user uploaded songs
export const getUserSongs = (params = {}) => {
  return http.get('/songs/user/songs', { params })
}

// 鑾峰彇鎾斁鍘嗗彶
export const getPlayHistory = (params = {}) => {
  return http.get('/user/history', { params })
}

// 璁板綍鎾斁鍘嗗彶
export const recordPlayHistory = (songId) => {
  return http.post('/user/history', { song_id: songId })
}

// 鑾峰彇鏀惰棌鍒楄〃
export const getFavorites = (params = {}) => {
  return http.get('/user/favorites', { params })
}

// 娣诲姞鏀惰棌
export const addFavorite = (songId) => {
  return http.post('/user/favorites', { song_id: songId })
}

// 鍙栨秷鏀惰棌
export const removeFavorite = (songId) => {
  return http.delete(`/user/favorites/${songId}`)
}

// 鑾峰彇鎾斁鍒楄〃
export const getPlaylists = () => {
  return http.get('/user/playlists')
}

// 鍒涘缓鎾斁鍒楄〃
export const createPlaylist = (data) => {
  return http.post('/user/playlists', data)
}

// 鏇存柊鎾斁鍒楄〃
export const updatePlaylist = (playlistId, data) => {
  return http.put(`/user/playlists/${playlistId}`, data)
}

// 鍒犻櫎鎾斁鍒楄〃
export const deletePlaylist = (playlistId) => {
  return http.delete(`/user/playlists/${playlistId}`)
}

// 鑾峰彇鎾斁鍒楄〃涓殑姝屾洸
export const getPlaylistSongs = (playlistId) => {
  return http.get(`/user/playlists/${playlistId}/songs`)
}

// Add song to playlist
export const addSongToPlaylist = (playlistId, songId) => {
  return http.post(`/user/playlists/${playlistId}/songs`, { song_id: songId })
}

// Remove song from playlist
export const removeSongFromPlaylist = (playlistId, songId) => {
  return http.delete(`/user/playlists/${playlistId}/songs/${songId}`)
}




