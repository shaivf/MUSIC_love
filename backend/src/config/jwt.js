// 核心安保中心
/*
在 Express 的流水线中，这个文件扮演了两个角色，
分别在不同的环节起作用：
    制卡机（生成环节）： 当用户在“登录档口”输入账号密码且正确时，
        调用这里的 generateToken，发给用户一个手环。
    包厢保安（拦截环节）：作为一个“中间件（Middleware）”
    （就是你代码里的 authMiddleware），
    它通常会被安插在那些需要登录才能访问的私密路由前面
    （比如修改密码、收藏音乐）。
    如果保安这关过不去，请求直接被打回，根本见不到后厨大厨。
*/

import jwt from 'jsonwebtoken'
import { sendError } from '../utils/response.js'

// 这些配置项可以通过环境变量来设置，生产环境中建议使用更安全的值

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'

// 生成JWT Token
// 把用户的信息（payload，通常包含用户ID和邮箱），
// 用最高机密印章盖上防伪戳，打包成一串乱码（Token）。
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  })
}

// 验证JWT Token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// JWT中间件
export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    // 1. 先检查请求头里有没有 Authorization 字段
    if (!token) {
      return sendError(res, '缺少认证令牌', 401)
    }
    // 2.验证令牌的有效性
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // ✅ 重点！将用户信息保存到 req.user
    // 把你手环上的个人信息抄下来，
    // 做成一个临时胸牌，挂在这次请求的 req 对象上（req.user）。
    // 业务代码不需要再去解析一遍 Token，
    // 只要直接读取 req.user.id，
    // 就知道现在是谁在操作了！这叫**“上下文传递”**。
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    }
    
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, '令牌已过期', 401)
    } else if (error.name === 'JsonWebTokenError') {
      return sendError(res, '令牌无效或已过期', 401)
    }
    return sendError(res, '认证失败', 401)
  }
}
