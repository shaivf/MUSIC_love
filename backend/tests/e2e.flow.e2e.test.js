import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'

const backendRoot = process.cwd()
const projectRoot = path.resolve(backendRoot, '..')

let serverProcess = null
let baseUrl = ''

function createJsonHeaders(token = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((closeErr) => {
        if (closeErr) return reject(closeErr)
        resolve(port)
      })
    })
  })
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null
  return { response, body }
}

async function waitForHealth(maxWaitMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      const { response, body } = await requestJson(`${baseUrl}/health`)
      if (response.ok && body?.success === true) return
    } catch (error) {
      // ignore until timeout
    }
    await delay(500)
  }
  throw new Error(`E2E backend did not become healthy within ${maxWaitMs}ms`)
}

async function safeDeleteFavorite(songId, token) {
  if (!songId || !token) return
  try {
    await requestJson(`${baseUrl}/api/user/favorites/${songId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    // best-effort cleanup
  }
}

async function safeDeleteSong(songId, token) {
  if (!songId || !token) return
  try {
    await requestJson(`${baseUrl}/api/songs/${songId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    // best-effort cleanup
  }
}

describe('E2E flow: login -> upload -> play -> favorite', () => {
  beforeAll(async () => {
    const port = await findFreePort()
    baseUrl = `http://127.0.0.1:${port}`

    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: backendRoot,
      env: {
        ...process.env,
        PORT: String(port)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    await waitForHealth()
  }, 45000)

  afterAll(async () => {
    if (!serverProcess) return
    serverProcess.kill('SIGINT')
    try {
      await once(serverProcess, 'exit')
    } catch (error) {
      // ignore
    }
  }, 15000)

  it('should complete the full user music interaction flow', async () => {
    const seed = `${Date.now()}_${Math.floor(Math.random() * 100000)}`
    const email = `e2e_${seed}@example.com`
    const username = `e2e_user_${seed}`
    const password = 'password123'
    let token = ''
    let songId = null

    try {
      const registerResp = await requestJson(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: createJsonHeaders(),
        body: JSON.stringify({ email, username, password })
      })
      expect(registerResp.response.status).toBe(201)
      expect(registerResp.body?.success).toBe(true)

      const loginResp = await requestJson(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: createJsonHeaders(),
        body: JSON.stringify({ email, password })
      })
      expect(loginResp.response.status).toBe(200)
      expect(loginResp.body?.success).toBe(true)
      token = loginResp.body?.data?.token || ''
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(10)

      const audioBuffer = await readFile(path.resolve(projectRoot, 'test.mp3'))
      const coverBuffer = await readFile(path.resolve(projectRoot, 'cover.jpg'))

      const uploadForm = new FormData()
      uploadForm.append('audio', new Blob([audioBuffer], { type: 'audio/mpeg' }), `e2e_${seed}.mp3`)
      uploadForm.append('cover', new Blob([coverBuffer], { type: 'image/jpeg' }), `e2e_${seed}.jpg`)
      uploadForm.append('title', `E2E Song ${seed}`)
      uploadForm.append('artist', 'E2E Artist')
      uploadForm.append('album', 'E2E Album')
      uploadForm.append('description', 'E2E upload flow test')

      const uploadResp = await requestJson(`${baseUrl}/api/songs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm
      })
      expect(uploadResp.response.status).toBe(201)
      expect(uploadResp.body?.success).toBe(true)
      songId = uploadResp.body?.data?.id
      expect(Number.isInteger(songId)).toBe(true)

      const playResp = await requestJson(`${baseUrl}/api/songs/${songId}`)
      expect(playResp.response.status).toBe(200)
      expect(playResp.body?.success).toBe(true)
      expect(playResp.body?.data?.id).toBe(songId)
      expect(playResp.body?.data?.play_count).toBeGreaterThanOrEqual(1)

      const favoriteResp = await requestJson(`${baseUrl}/api/user/favorites`, {
        method: 'POST',
        headers: createJsonHeaders(token),
        body: JSON.stringify({ song_id: songId })
      })
      expect(favoriteResp.response.status).toBe(201)
      expect(favoriteResp.body?.success).toBe(true)

      const listFavoriteResp = await requestJson(`${baseUrl}/api/user/favorites?page=1&pageSize=100`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      })
      expect(listFavoriteResp.response.status).toBe(200)
      expect(listFavoriteResp.body?.success).toBe(true)
      const favorites = listFavoriteResp.body?.data?.favorites || []
      expect(favorites.some((item) => item.song_id === songId)).toBe(true)
    } finally {
      await safeDeleteFavorite(songId, token)
      await safeDeleteSong(songId, token)
    }
  }, 90000)
})
