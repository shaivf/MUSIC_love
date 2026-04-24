import bcryptjs from 'bcryptjs'
import { pool } from '../config/database.js'
import { generateToken } from '../config/jwt.js'
import { sendSuccess, sendError } from '../utils/response.js'

// 邮箱验证正则表达式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 用户注册
 */
// 异步函数，处理用户注册请求
export async function register(req, res, next) {
  try {
    const { email, password, username } = req.body
    const normalizedUsername = (username || email?.split('@')?.[0] || '').trim()
    
    // 验证邮箱格式
    if (!email || !emailRegex.test(email)) {
      return sendError(res, '邮箱格式不正确', 400)
    }
    
    // 验证密码
    if (!password || password.length < 6) {
      return sendError(res, '密码长度至少为6个字符', 400)
    }
    
    const connection = await pool.getConnection()
    
    try {
      // 检查邮箱是否已存在
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )
      
      if (existingUsers.length > 0) {
        return sendError(res, '邮箱已被注册', 409)
      }

      // 检查用户名是否已存在
      const [existingUsernames] = await connection.query(
        'SELECT id FROM users WHERE username = ?',
        [normalizedUsername]
      )

      if (existingUsernames.length > 0) {
        return sendError(res, '用户名已被占用', 409)
      }
      
      // 加密密码
      const hashedPassword = await bcryptjs.hash(password, 10)
      
      // 为了防止重复注册，使用了try-catch块来捕获数据库操作中的唯一约束错误
      // （如邮箱或用户名已存在），那么上面的检查就不是绝对安全的，
      // 因为在高并发情况下可能会有竞态条件。
      // 但是通过捕获数据库的唯一约束错误，
      // 我们可以确保即使发生了竞态条件，用户也不会被重复注册，
      // 插入新用户
      const [result] = await connection.query(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, normalizedUsername, hashedPassword]
      )
      
      sendSuccess(res, {
        id: result.insertId,
        email,
        username: normalizedUsername
      }, '注册成功', 200, 201)
      
    } finally {
      connection.release()
    }
  // 业务代码防君子（防常规手抖），数据库约束防小人（防并发与脏数据）   
  } catch (error) {
    console.error('❌ 注册错误:', error)
    if (error?.code === 'ER_DUP_ENTRY') {   // 这些是底层的数据库错误，直接暴露给用户是不友好的，所以我们要进行一些翻译和处理
      if (error?.message?.includes('users.email')) {
        return sendError(res, '邮箱已被注册', 409)
      }
      if (error?.message?.includes('users.username')) {
        return sendError(res, '用户名已被占用', 409)
      }
      return sendError(res, '注册信息冲突', 409)
    }
    sendError(res, error.message || '注册失败', 500, 500)
  }
}

/**
 * 用户登录
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    
    // 验证邮箱和密码
    if (!email || !password) {
      return sendError(res, '邮箱和密码不能为空', 400)
    }
    
    const connection = await pool.getConnection()
    
    try {
      // 查询用户
      const [users] = await connection.query(
        'SELECT id, email, username, password FROM users WHERE email = ?',
        [email]
      )
      
      if (users.length === 0) {
        return sendError(res, '邮箱未注册', 404)
      }
      
      const user = users[0]
      
      // 验证密码
      const isPasswordValid = await bcryptjs.compare(password, user.password)
      if (!isPasswordValid) {
        return sendError(res, '密码错误', 401)
      }
      
      // 生成JWT Token
      const token = generateToken({
        id: user.id,
        email: user.email,
        username: user.username
      })
      
      sendSuccess(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }, '登录成功')
      
    } finally {
      connection.release()  // 重要！无论成功还是失败，都要释放数据库连接回连接池，避免连接泄漏。
    }
    
  } catch (error) {
    console.error('❌ 登录错误:', error)
    sendError(res, error.message || '登录失败', 500, 500)
  }
}
