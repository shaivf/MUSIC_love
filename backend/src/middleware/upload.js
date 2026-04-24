// 它是基于 multer 这个第三方库配置的一个**“专门的收发室与安检站”**。
// 负责接收前端传来的大件“包裹”（文件），拆开看一看合不合规，
//    然后打上新的标签，分门别类地放进后厨指定的冷库（文件夹）里。
// 收发室自己不存数据库！它只负责存物理文件，然后把这几份文件的最终存放路径，
//    写在一张便签上（附加在 req.files 对象上）。

// 大厨（songController.js）：真正负责业务的模块。
//      它不再需要苦哈哈地去处理二进制文件了，
//      它只要从“便签”上拿到文件的路径（比如 /uploads/songs/song_123.mp3），
//      然后把这个路径和歌名一起，存进 MySQL 数据库


import multer from 'multer'
import path from 'path'
import fs from 'fs'

// 创建上传目录
const songsDir = 'src/uploads/songs'
const coversDir = 'src/uploads/covers'

// 如果上传目录不存在，则创建它们。recursive: true 选项允许创建多级目录。
// 建仓库（初始化目录）
if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true })
}
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true })
}

// 音频文件上传配置
// 定义了一个 Multer 存储引擎，指定了上传的音频文件应该被存储在服务器上的哪个目录（songsDir），
// 以及上传的文件应该如何命名（使用 song_ 前缀加上一个唯一的后缀和原始文件扩展名）。
// 决定文件存到哪里（destination），以及叫什么名字（filename）
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {  
    cb(null, songsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, 'song_' + uniqueSuffix + ext)
  }
})

// 图片文件上传配置
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, 'cover_' + uniqueSuffix + ext)
  }
})

// 创建组合的Multer实例（用于同时处理音频和图片）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, songsDir)
    } else if (file.fieldname === 'cover') {
      cb(null, coversDir)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    const prefix = file.fieldname === 'audio' ? 'song_' : 'cover_'
    cb(null, prefix + uniqueSuffix + ext)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    // 基于扩展名验证，更能容错
    // 检查文件的后缀名。如果是 audio 字段，只允许音频格式；如果是 cover 字段，只允许图片格式。
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.m4a']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持MP3、WAV、FLAC、M4A格式'))
    }
  } else if (file.fieldname === 'cover') {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持JPG、PNG、GIF格式'))
    }
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { 
    // 规定单次上传不能超过 50MB，最多只能传 2 个文件（一个音频一个封面）。
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 2 // 最多2个文件
  }
})