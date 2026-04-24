import express from 'express'
import { authMiddleware } from '../config/jwt.js'
import { upload } from '../middleware/upload.js'
import * as songController from '../controllers/songController.js'

const router = express.Router()

// 上传歌曲 (需要认证)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  songController.upload
)

// 获取歌曲列表 (无需认证)
router.get('/', songController.list)

// 获取用户上传的歌曲 (需要认证)
router.get('/user/songs', authMiddleware, songController.getUserSongs)

// 获取单首歌曲 (无需认证)
router.get('/:id', songController.get)

// 编辑歌曲 (需要认证)
router.put('/:id', authMiddleware, songController.update)

// 删除歌曲 (需要认证)
router.delete('/:id', authMiddleware, songController.remove)

export default router
