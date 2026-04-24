/** 
 * app.js 是 Express 应用的核心文件，
 * 负责定义路由、中间件和全局错误处理。
 * 它就像是汽车的引擎，决定了应用的功能和行为。
 * 核心任务是**“定规矩”和“分发任务”**。
 */


import express from 'express'
import cors from 'cors'
import 'dotenv/config.js'
import authRoutes from './routes/auth.js'     //使用的是 export default（默认导出），在导入时，你可以给它随便起任何名字！
import songRoutes from './routes/song.js'
import userRoutes from './routes/user.js'

const app = express()

// 中间件
// 配置跨域资源共享（CORS）中间件，允许来自指定来源的请求，
// 并支持携带凭证（如 cookies）。
// 有两种请求：GET等简单请求和POST等复杂请求，
// 后者会先发一个预检请求（OPTIONS）来确认服务器是否允许该跨域请求。
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

// 解析 JSON 和 URL-encoded 请求体的中间件
app.use(express.json())
// 负责解析前端传来的 JSON 格式数据。
app.use(express.urlencoded({ extended: true }))
// 负责解析传统的表单提交数据

// 静态文件服务
// 这行代码告诉 Express，当请求以 /uploads 开头时，
// 从 src/uploads 目录中提供静态文件服务。
// 例如，如果有一个文件 src/uploads/song.mp3，
// 那么访问 http://localhost:3000/uploads/song.mp3 就能下载这个文件。
// 这对于存储用户上传的歌曲文件非常有用。
// 将服务器上 src/uploads 文件夹里的文件，直接暴露给网络访问。
app.use('/uploads', express.static('src/uploads'))
// 使用了 express.static 之后，访问这个文件夹里的文件，
// 默认是不需要任何验证的（不需要登录，不需要 JWT 证明）。
// 这就像是把 src/uploads 文件夹放在了服务器的公共区域，
// 任何人都可以访问里面的文件。直接通过URL路径 /uploads/filename 来访问。
// 优点：浏览器缓存与 CDN 友好：
//       公开的静态文件可以被浏览器或 CDN（内容分发网络）完美缓存。
//       第二次访问时连你的服务器都不用找，直接从本地加载，
//       极大地提升了速度。


// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  })
})

// 路由
// 只要前端访问的网址是以 /api/auth 开头的，统统转交给现在这个路由文件处理。
app.use('/api/auth', authRoutes)
app.use('/api/songs', songRoutes)
app.use('/api/user', userRoutes)


/**
 * 为什么放在代码最末尾：顺序极其致命！ 
 * Express 匹配规则是按顺序找的。
 * 如果把 404 放在最前面，那所有正常的请求都会被拦截并返回 404。
 * 只有当上面的健康检查、API 路由全都不匹配时，
 * 才会落入 404 的网兜。
 * */
// 404 错误处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    message: '未找到该路由'
  })
})

// 全局错误处理
/**
 * 全局错误处理的巧妙之处：注意它的参数是 4 个 
 * (err, req, res, next)。
 * Express 规定，只要参数是 4 个，它就是“错误处理中间件”。
 * 
 */
app.use((err, req, res, next) => {
  console.error('❌ 错误:', err)
  res.status(err.status || 500).json({
    success: false,
    code: err.status || 500,
    message: err.message || '服务器内部错误'
  })
})

export default app
// 单例模式：
// 我这个 app.js 文件的工作已经全部做完了，
// 现在我把配置好的 app 对象作为本文件的唯一核心特产，
// 向外暴露出去，谁需要谁就拿去用！”
// 这就是单例模式：全局只有一个 app 实例，
// 任何需要它的文件都可以通过 import app from './app.js' 来获取同一个实例，
// 保证了整个应用中只有一个 Express 应用对象在运行，
// 避免了重复创建多个服务器实例的麻烦。

// 如果 server.js 引入了它（import app from './app.js'），
// 然后我写了另一个文件 test.js 也引入了它，
// 那代码是不是执行了两次，造出了两个不同的 app？
// 答案是：没有，它们拿到的绝对是同一个 app！
// 因为 Node.js 模块系统的“模块缓存”机制，
// 当 app.js（模块） 第一次被别人 import（或 require）的时候，
// Node.js 会把里面的代码从头到尾执行一遍，把引擎造出来，
// 并把导出的 app 存在内存的一个小本本上。
// 之后任何再次 require 或 import 这个模块的操作，
// 都会直接返回缓存中的导出对象，而不会重新执行模块代码。
// 这就是为什么 server.js 和 test.js 中 import app from './app.js'，
// 它们拿到的都是同一个 app 实例，而不是两个不同的实例.





/**
 * 未来优化的方向：后端只负责处理 JSON 数据（API），
 * 用户的音乐和图片会直接上传到云端的 OSS（对象存储，如阿里云 OSS 
 * 或 AWS S3），数据库里只存一个 https://... 的链接。
 * 这叫做计算与存储分离。
 *    后端服务器只负责“动脑子”（计算、鉴权、查数据），
 * 而把占硬盘、占带宽的“体力活”（存文件、发文件）外包给专门的存储服务器。 
 * 这就是现代大型互联网公司全都在使用的**“计算与存储分离”**架构。
 */
