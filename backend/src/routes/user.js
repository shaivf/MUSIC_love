import express from 'express'
import { authMiddleware } from '../config/jwt.js'
import * as userController from '../controllers/userController.js'

const router = express.Router()

// 用户资料相关
router.get('/profile', authMiddleware, userController.getProfile)
router.put('/profile', authMiddleware, userController.updateProfile)

// 播放历史相关
router.get('/history', authMiddleware, userController.getHistory)
router.post('/history', authMiddleware, userController.recordHistory)

// 收藏相关
router.post('/favorites', authMiddleware, userController.addFavorite)
router.delete('/favorites/:songId', authMiddleware, userController.removeFavorite)
router.get('/favorites', authMiddleware, userController.getFavorites)

// 播放列表相关
router.get('/playlists', authMiddleware, userController.getPlaylists)
router.post('/playlists', authMiddleware, userController.createPlaylist)
router.put('/playlists/:playlistId', authMiddleware, userController.updatePlaylist)
router.delete('/playlists/:playlistId', authMiddleware, userController.deletePlaylist)

// 播放列表中的歌曲相关
router.get('/playlists/:playlistId/songs', authMiddleware, userController.getPlaylistSongs)
router.post('/playlists/:playlistId/songs', authMiddleware, userController.addSongToPlaylist)
router.delete('/playlists/:playlistId/songs/:songId', authMiddleware, userController.removeSongFromPlaylist)

export default router