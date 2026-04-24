import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// 模拟数据库连接和查询方法，避免在测试中实际连接数据库。
// 它把真正的 MySQL 数据库给“截胡”了，换成了一个假的（假连接池）。
vi.mock('../src/config/database.js', () => {
  return {
    pool: {
      getConnection: vi.fn(),
      query: vi.fn()
    }
  }
})

import app from '../src/app.js'
import { pool } from '../src/config/database.js'

function createMockConnection() {
  return {
    query: vi.fn(),
    release: vi.fn()
  }
}

describe('API Automated Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /health should return success payload', async () => {
    const response = await request(app).get('/health')
    // supertest 这个工具直接在内存里启动了你的 Express（大堂），然后模拟浏览器发送了一个 HTTP GET 请求。
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.message).toBe('服务器运行正常')
    expect(typeof response.body.timestamp).toBe('string')
  })

  it('unknown route should return 404 payload', async () => {
    const response = await request(app).get('/api/not-exists')

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
    expect(response.body.code).toBe(404)
  })

  it('GET /api/songs should support partial uploaderEmail filtering', async () => {
    const connection = createMockConnection()
    connection.query
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[
        {
          id: 1,
          title: 'test song',
          artist: 'test artist',
          album: null,
          description: null,
          audio_url: '/uploads/songs/test.mp3',
          cover: '/uploads/covers/test.jpg',
          play_count: 0,
          uploader_id: 7,
          uploader_email: 'user@example.com',
          uploader_name: 'user',
          created_at: '2026-03-27T00:00:00.000Z',
          updated_at: '2026-03-27T00:00:00.000Z'
        }
      ]])

    pool.getConnection.mockResolvedValue(connection)

    const response = await request(app).get('/api/songs').query({ uploaderEmail: 'user@' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.total).toBe(1)
    expect(response.body.data.songs).toHaveLength(1)

    const countQueryCall = connection.query.mock.calls.find(([sql]) =>
      sql.includes('SELECT COUNT(*) as total')
    )
    expect(countQueryCall).toBeTruthy()
    expect(countQueryCall[0]).toContain('LEFT JOIN users u ON u.id = s.uploader_id')
    expect(countQueryCall[1]).toEqual(['%user@%'])
    expect(connection.release).toHaveBeenCalledTimes(1)
  })
})

