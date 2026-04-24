/**
 * 通用辅助函数库
 * 集中管理所有工具函数，避免重复定义
 */

/**
 * 安全地提取一个正整数
 * 如果提取失败，则返回一个默认的"兜底"值
 */
export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback
  }
  return parsed
}

/**
 * 将前端传来的分页参数，转换为数据库能直接使用的标准分页对象
 * 包含跳过多少条、取多少条
 * 将客户端传入的 ?page=2&pageSize=30 
 * 这种字符串类型、可能缺失或无效的查询参数，转换为可靠的整数格式，并计算出数据库查询所需的偏移量（OFFSET）
 */
export function parsePagination(query, defaultPage = 1, defaultPageSize = 20) {
  const page = parsePositiveInt(query.page, defaultPage)
  const pageSize = parsePositiveInt(query.pageSize ?? query.limit, defaultPageSize)
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }    // offset是偏移量
}

/**
 * 清洗并标准化一个"非必填"的文本字段
 */
export function parseOptionalText(value, maxLength = 255) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.slice(0, maxLength)
}

/**
 * 清洗并标准化一个"非必填"的邮箱地址字段
 */
export function parseOptionalEmail(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return undefined

  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined

  return normalized.slice(0, 100)
}

/**
 * 邮箱格式验证正则表达式
 */
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 验证邮箱格式是否有效
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return emailRegex.test(email.trim())
}
