/**
 * 用户控制器
 * 处理所有用户相关的业务逻辑
 */

import { pool } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
// 导入统一格式的响应处理函数
import {
  parsePagination,
  parseOptionalText,
  isValidEmail,
  emailRegex
} from '../utils/helpers.js'

/**
 * 获取个人信息
 */
export async function getProfile(req, res, next) {
  try {
    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.query(
        `SELECT id, email, username, avatar, bio, created_at, updated_at
         FROM users
         WHERE id = ?`,
        [req.user.id]
      )

      if (rows.length === 0) {
        return sendError(res, '用户不存在', 404)
      }

      sendSuccess(res, rows[0])
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取个人信息错误:', error)
    sendError(res, '获取个人信息失败', 500)
  }
}

/**
 * 更新个人信息
 */
export async function updateProfile(req, res, next) {
  try {
    const hasEmail = Object.prototype.hasOwnProperty.call(req.body || {}, 'email')
    const hasUsername = Object.prototype.hasOwnProperty.call(req.body || {}, 'username')
    const hasAvatar = Object.prototype.hasOwnProperty.call(req.body || {}, 'avatar')
    const hasBio = Object.prototype.hasOwnProperty.call(req.body || {}, 'bio')

    if (!hasEmail && !hasUsername && !hasAvatar && !hasBio) {
      return sendError(res, '至少提供一个可更新字段', 400)
    }

    const updates = {}

    if (hasEmail) {
      if (typeof req.body.email !== 'string') {
        return sendError(res, 'email 参数格式无效', 400)
      }
      const normalizedEmail = req.body.email.trim().toLowerCase()
      if (!isValidEmail(normalizedEmail)) {
        return sendError(res, '邮箱格式不正确', 400)
      }
      updates.email = normalizedEmail
    }

    if (hasUsername) {
      if (typeof req.body.username !== 'string') {
        return sendError(res, 'username 参数格式无效', 400)
      }
      const normalizedUsername = req.body.username.trim()
      if (!normalizedUsername) {
        return sendError(res, '用户名不能为空', 400)
      }
      updates.username = normalizedUsername.slice(0, 50)
    }

    if (hasAvatar) {
      if (req.body.avatar === null) {
        updates.avatar = null
      } else if (typeof req.body.avatar !== 'string') {
        return sendError(res, 'avatar 参数格式无效', 400)
      } else {
        const normalizedAvatar = req.body.avatar.trim()
        updates.avatar = normalizedAvatar ? normalizedAvatar.slice(0, 255) : null
      }
    }

    if (hasBio) {
      if (req.body.bio === null) {
        updates.bio = null
      } else if (typeof req.body.bio !== 'string') {
        return sendError(res, 'bio 参数格式无效', 400)
      } else {
        const normalizedBio = req.body.bio.trim()
        updates.bio = normalizedBio ? normalizedBio.slice(0, 1000) : null
      }
    }

    const connection = await pool.getConnection()
    try {
      const [currentRows] = await connection.query(
        `SELECT id, email, username
         FROM users
         WHERE id = ?`,
        [req.user.id]
      )

      if (currentRows.length === 0) {
        return sendError(res, '用户不存在', 404)
      }

      const currentUser = currentRows[0]

      if (updates.email && updates.email !== currentUser.email) {
        const [emailRows] = await connection.query(
          'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
          [updates.email, req.user.id]
        )
        if (emailRows.length > 0) {
          return sendError(res, '邮箱已被使用', 409)
        }
      }

      if (updates.username && updates.username !== currentUser.username) {
        const [usernameRows] = await connection.query(
          'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
          [updates.username, req.user.id]
        )
        if (usernameRows.length > 0) {
          return sendError(res, '用户名已被占用', 409)
        }
      }

      const setFields = ['updated_at = NOW()']
      const params = []

      Object.entries(updates).forEach(([key, value]) => {
        setFields.unshift(`${key} = ?`)
        params.unshift(value)
      })

      params.push(req.user.id)

      await connection.query(
        `UPDATE users SET ${setFields.join(', ')} WHERE id = ?`,
        params
      )

      const [updatedRows] = await connection.query(
        `SELECT id, email, username, avatar, bio, created_at, updated_at
         FROM users
         WHERE id = ?`,
        [req.user.id]
      )

      sendSuccess(res, updatedRows[0], '更新成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('更新个人信息错误:', error)
    sendError(res, '更新个人信息失败', 500)
  }
}

/**
 * 获取播放历史
 */
export async function getHistory(req, res, next) {
  try {
    const { page, pageSize, offset } = parsePagination(req.query)
    const connection = await pool.getConnection()
    try {
      const [countResult] = await connection.query(
        'SELECT COUNT(*) as total FROM play_history WHERE user_id = ?',
        [req.user.id]
      )
      const total = countResult[0].total

      const [rows] = await connection.query(
        `SELECT h.id, h.song_id, h.played_at, 
                s.title, s.artist, s.album, s.cover
         FROM play_history h
         LEFT JOIN songs s ON h.song_id = s.id
         WHERE h.user_id = ?
         ORDER BY h.played_at DESC
         LIMIT ? OFFSET ?`,
        [req.user.id, pageSize, offset]
      )

      const history = rows.map(item => ({
        id: item.id,
        song_id: item.song_id,
        played_at: item.played_at,
        song: {
          id: item.song_id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          cover: item.cover
        }
      }))

      sendSuccess(res, {
        total,
        page,
        pageSize,
        limit: pageSize,
        history
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取播放历史错误:', error)
    sendError(res, '获取播放历史失败', 500)
  }
}

/**
 * 记录播放历史
 */
export async function recordHistory(req, res, next) {
  try {
    // 解构赋值
    // 去 req.body 这个对象里面，找到一个名字叫 song_id 的属性，
    // 然后把它的值提取出来，赋值给一个叫做 song_id 的新常量。
    const { song_id } = req.body  // 从请求体中获取 song_id 参数，表示用户正在播放的歌曲 ID。
    // const song_id = req.body.song_id;
    if (!song_id) {
      return sendError(res, '缺少 song_id', 400)
    }


    const connection = await pool.getConnection()
    try {
      await connection.query(
        'INSERT INTO play_history (user_id, song_id, played_at) VALUES (?, ?, NOW())',
        [req.user.id, song_id]
      )
      sendSuccess(res, null, '记录成功', 201)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('记录播放历史错误:', error)
    sendError(res, '记录失败', 500)
  }
}

/**
 * 添加收藏
 */
export async function addFavorite(req, res, next) {
  try {
    // 代码并没有盲目相信前端传来的 song_id，而是先判空，再判断数据库里有没有这首歌。
    // 这保证了数据库里不会被写入“用户收藏了一个不存在的幽灵歌曲”这种脏数据。
    const { song_id } = req.body
    if (!song_id) {
      return sendError(res, '缺少 song_id', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [songs] = await connection.query('SELECT id FROM songs WHERE id = ?', [song_id])
      if (songs.length === 0) {
        return sendError(res, '歌曲不存在', 404)
      }

      await connection.query(
        'INSERT INTO favorites (user_id, song_id, created_at) VALUES (?, ?, NOW())',
        [req.user.id, song_id]
      )

      sendSuccess(res, { song_id: Number(song_id) }, '收藏成功', 201)
    } catch (error) {    // 从数据库底层抛出的错误对象，通常会包含一个 code 属性，表示错误类型
        // 没有先查询是否已收藏，而是利用数据库的唯一索引（Unique Key），在插入冲突时直接通过错误码判断，效率更高。
      if (error?.code === 'ER_DUP_ENTRY') {
        return sendError(res, '该歌曲已收藏', 409)
      }
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('添加收藏错误:', error)
    sendError(res, '收藏失败', 500)
  }
}

/**
 * 取消收藏
 */
export async function removeFavorite(req, res, next) {
  try {
    const songId = Number.parseInt(req.params.songId, 10)
    // 从请求的路由参数中获取 songId，并将其转换为十进制整数，以确保它是一个有效的数字。
    if (Number.isNaN(songId) || songId < 1) {
      return sendError(res, 'songId 无效', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [result] = await connection.query(    // 数据库驱动（这里使用的是 MySQL 的 mysql2 或类似库）会返回一个结果数组，
        // 通过解构赋值取到第一个元素 result，这个 result 对象通常包含一个 affectedRows 属性，表示受影响的行数。
        'DELETE FROM favorites WHERE user_id = ? AND song_id = ?',
        [req.user.id, songId]
      )

      if (result.affectedRows === 0) {
        return sendError(res, '收藏记录不存在', 404)
      }

      sendSuccess(res, null, '取消收藏成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('取消收藏错误:', error)
    sendError(res, '取消收藏失败', 500)
  }
}

/**
 * 获取收藏列表
 */
export async function getFavorites(req, res, next) {
  try {
    const { page, pageSize, offset } = parsePagination(req.query)
    const connection = await pool.getConnection()
    try {
      const [countResult] = await connection.query(
        'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
        [req.user.id]
      )
      const total = countResult[0].total

      const [rows] = await connection.query(
        `SELECT f.id, f.song_id, f.created_at AS favorited_at,
                s.id AS song_id, s.title, s.artist, s.album, s.cover, s.audio_url, s.play_count, s.created_at
         FROM favorites f
         LEFT JOIN songs s ON f.song_id = s.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`,
        [req.user.id, pageSize, offset]
      )

      const favorites = rows.map(item => ({
        id: item.id,
        song_id: item.song_id,
        favorited_at: item.favorited_at,
        song: {
          id: item.song_id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          cover: item.cover,
          audio_url: item.audio_url,
          play_count: item.play_count,
          created_at: item.created_at
        }
      }))
      
      // 向客户端发送成功的 JSON 响应。响应数据包含分页信息（总数、当前页、每页大小）和收藏列表（favorites）。
      sendSuccess(res, {
        total,
        page,
        pageSize,
        limit: pageSize,
        favorites
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取收藏列表错误:', error)
    sendError(res, '获取收藏列表失败', 500)
  }
}

/**
 * 获取播放列表
 *  获取当前登录用户创建的所有歌单（播放列表） 
 * 从数据库查询该用户下的全部歌单，并统计每个歌单里包含的歌曲数量，最后以列表形式返回。
 */
export async function getPlaylists(req, res, next) {
  try {
    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.query(
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at, COUNT(ps.id) AS song_count
         FROM playlists p
         LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
         WHERE p.user_id = ?
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [req.user.id]
      )

      sendSuccess(res, {
        total: rows.length,
        playlists: rows
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取播放列表错误:', error)
    sendError(res, '获取播放列表失败', 500)
  }
}

/**
 * 创建播放列表
 */
export async function createPlaylist(req, res, next) {
  try {
    const name = parseOptionalText(req.body?.name, 100)
    const description = parseOptionalText(req.body?.description, 500)

    if (!name) {
      return sendError(res, '播放列表名称不能为空', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [result] = await connection.query(
        'INSERT INTO playlists (user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [req.user.id, name, description || null]
      )
    
      // 插入歌单成功后，立即从数据库查询出这条新记录的完整信息，以便作为响应数据返回给客户端。
      const [rows] = await connection.query(
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at, 0 AS song_count
         FROM playlists p
         WHERE p.id = ? AND p.user_id = ?`,
        [result.insertId, req.user.id]
      )

      sendSuccess(res, rows[0] || null, '创建播放列表成功', 201)
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return sendError(res, '该名称的播放列表已存在', 409)
      }
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('创建播放列表错误:', error)
    sendError(res, '创建播放列表失败', 500)
  }
}

/**
 * 更新播放列表
 */
export async function updatePlaylist(req, res, next) {
  try {
    const playlistId = Number.parseInt(req.params.playlistId, 10)
    if (Number.isNaN(playlistId) || playlistId < 1) {
      return sendError(res, 'playlistId 无效', 400)
    }

    const name = parseOptionalText(req.body?.name, 100)
    const description = parseOptionalText(req.body?.description, 500)
    const hasName = Object.prototype.hasOwnProperty.call(req.body || {}, 'name')
    const hasDescription = Object.prototype.hasOwnProperty.call(req.body || {}, 'description')

    if (!hasName && !hasDescription) {
      return sendError(res, '至少提供一个可更新字段', 400)
    }

    if (hasName && !name) {
      return sendError(res, '播放列表名称不能为空', 400)
    }

    const connection = await pool.getConnection()
    try {
        // 使用 SQL 语句动态更新数据库中的一条播放列表（playlists）记录
      const fields = ['updated_at = NOW()']
      const params = []

      if (hasName) {
        fields.unshift('name = ?') // 将 "name = ?" 插入到 fields 数组的开头，确保在 SQL 语句中 name 字段的更新优先于 description 字段。
        params.unshift(name)
      }
      if (hasDescription) {
        fields.unshift('description = ?')
        params.unshift(description || null)
      }

      params.push(playlistId, req.user.id)

      const [result] = await connection.query(
        `UPDATE playlists SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      )

      if (result.affectedRows === 0) {
        return sendError(res, '播放列表不存在', 404)
      }
      /*
      从 playlists 表中查询一条属于当前登录用户的播放列表记录，
      同时关联 playlist_songs 表统计其中有多少首歌曲，返回结果包含播放列表的基本信息及歌曲计数。
      */
      const [rows] = await connection.query(
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at, COUNT(ps.id) AS song_count
         FROM playlists p
         LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
         WHERE p.id = ? AND p.user_id = ?
         GROUP BY p.id`,
        [playlistId, req.user.id]
      )

      sendSuccess(res, rows[0] || null, '更新播放列表成功')
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return sendError(res, '该名称的播放列表已存在', 409)
      }
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('更新播放列表错误:', error)
    sendError(res, '更新播放列表失败', 500)
  }
}

/**
 * 删除播放列表
 */
export async function deletePlaylist(req, res, next) {
  try {
    const playlistId = Number.parseInt(req.params.playlistId, 10)
    if (Number.isNaN(playlistId) || playlistId < 1) {
      return sendError(res, 'playlistId 无效', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [result] = await connection.query(
        'DELETE FROM playlists WHERE id = ? AND user_id = ?',
        [playlistId, req.user.id]
      )

      if (result.affectedRows === 0) {
        return sendError(res, '播放列表不存在', 404)
      }

      sendSuccess(res, null, '删除播放列表成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('删除播放列表错误:', error)
    sendError(res, '删除播放列表失败', 500)
  }
}

/**
 * 获取播放列表中的歌曲
 */
export async function getPlaylistSongs(req, res, next) {
  try {
    const playlistId = Number.parseInt(req.params.playlistId, 10)
    if (Number.isNaN(playlistId) || playlistId < 1) {
      return sendError(res, 'playlistId 无效', 400)
    }

    const connection = await pool.getConnection()
    try {
        // 首先验证该播放列表是否存在且属于当前用户，如果不存在则返回 404 错误。
      const [playlists] = await connection.query(
        'SELECT id, name, description FROM playlists WHERE id = ? AND user_id = ?',
        [playlistId, req.user.id]
      )

      if (playlists.length === 0) {
        return sendError(res, '播放列表不存在', 404)
      }
      // 从 playlist_songs 表中查询属于该播放列表的所有歌曲记录，同时关联 songs 表获取每首歌曲的详细信息，最后将结果以列表形式返回给客户端。
      const [rows] = await connection.query(
        `SELECT ps.id AS playlist_song_id, ps.song_id, ps.added_at,
                s.title, s.artist, s.album, s.description, s.cover, s.audio_url, s.play_count, s.created_at
         FROM playlist_songs ps
         LEFT JOIN songs s ON s.id = ps.song_id
         WHERE ps.playlist_id = ?
         ORDER BY ps.added_at DESC`,
        [playlistId]
      )

      const songs = rows.map(item => ({
        playlist_song_id: item.playlist_song_id,
        song_id: item.song_id,
        added_at: item.added_at,
        song: {
          id: item.song_id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          description: item.description,
          cover: item.cover,
          audio_url: item.audio_url,
          play_count: item.play_count,
          created_at: item.created_at
        }
      }))

      sendSuccess(res, {
        playlist: playlists[0],
        total: songs.length,
        songs
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取播放列表歌曲错误:', error)
    sendError(res, '获取播放列表歌曲失败', 500)
  }
}

/**
 * 向播放列表中添加歌曲
 */
export async function addSongToPlaylist(req, res, next) {
  try {
    const playlistId = Number.parseInt(req.params.playlistId, 10)
    const songId = Number.parseInt(req.body?.song_id, 10)

    if (Number.isNaN(playlistId) || playlistId < 1) {
      return sendError(res, 'playlistId 无效', 400)
    }

    if (Number.isNaN(songId) || songId < 1) {
      return sendError(res, 'song_id 无效', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [playlists] = await connection.query(
        'SELECT id FROM playlists WHERE id = ? AND user_id = ?',
        [playlistId, req.user.id]
      )
      if (playlists.length === 0) {
        return sendError(res, '播放列表不存在', 404)
      }

      const [songs] = await connection.query('SELECT id FROM songs WHERE id = ?', [songId])
      if (songs.length === 0) {
        return sendError(res, '歌曲不存在', 404)
      }

      await connection.query(
        'INSERT INTO playlist_songs (playlist_id, song_id, added_at) VALUES (?, ?, NOW())',
        [playlistId, songId]
      )

      sendSuccess(res, {
        playlist_id: playlistId,
        song_id: songId
      }, '添加歌曲成功', 201)
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return sendError(res, '该歌曲已在播放列表中', 409)
      }
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('添加歌曲到播放列表错误:', error)
    sendError(res, '添加歌曲到播放列表失败', 500)
  }
}

/**
 * 从播放列表中移除歌曲
 */
export async function removeSongFromPlaylist(req, res, next) {
  try {
    const playlistId = Number.parseInt(req.params.playlistId, 10)
    const songId = Number.parseInt(req.params.songId, 10)

    if (Number.isNaN(playlistId) || playlistId < 1) {
      return sendError(res, 'playlistId 无效', 400)
    }

    if (Number.isNaN(songId) || songId < 1) {
      return sendError(res, 'songId 无效', 400)
    }

    const connection = await pool.getConnection()
    try {
      const [result] = await connection.query(
        `DELETE ps
         FROM playlist_songs ps
         INNER JOIN playlists p ON p.id = ps.playlist_id
         WHERE ps.playlist_id = ? AND ps.song_id = ? AND p.user_id = ?`,
        [playlistId, songId, req.user.id]
      )

      if (result.affectedRows === 0) {
        return sendError(res, '播放列表歌曲记录不存在', 404)
      }

      sendSuccess(res, null, '移除歌曲成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('从播放列表移除歌曲错误:', error)
    sendError(res, '移除歌曲失败', 500)
  }
}
