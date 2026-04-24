import { pool } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import {
  parsePositiveInt,
  parsePagination,
  parseOptionalEmail
} from '../utils/helpers.js'

/**
 * 上传歌曲
 * 配合了我们第一节课在 package.json 里看到的 multer。req.files.audio[0] 
 * 就是 multer帮你存好文件后，把文件路径塞进来的。
 * 逻辑：拿到文件路径 + 拿到前端传的歌名 -> 
 * 合并当前登录用户的 ID（req.user.id） -> 一起写入数据库。
 */

export async function upload(req, res, next) {
  try {
    // 验证文件
    // 检查用户到底有没有上传那个名为 audio 的音乐文件
    if (!req.files?.audio?.[0]) {
      return sendError(res, '请上传音乐文件', 400)
    }

    const { title, artist, genre, album, description, duration } = req.body

    // 验证必填字段
    if (!title || !artist) {
      return sendError(res, '请填写标题、艺术家', 400)
    }

    const connection = await pool.getConnection()

    try {
      // 获取当前用户ID（从JWT token中解析）
      const uploaderId = req.user?.id

      if (!uploaderId) {
        return sendError(res, '需要登录后才能上传', 401)
      }

      // 获取文件路径
      /*
      这是中间件 multer 的神奇之处：它已经帮你把文件存到服务器硬盘上了，
      你只需要通过 req.files.audio[0] 拿到这个文件的相关信息，
       就可以获取到它在服务器上的存储路径（比如 /uploads/songs/song_123456789.mp3）。
      接下来，你要做的就是把这个路径和前端传来的其他歌曲信息（歌名、歌手等）一起，
       存进 MySQL 数据库里，这样前端才能通过接口拿到这些信息，展示给用户看。
       也就是说，multer 是帮你把文件放好，转身提供URL路径就可以，而你负责把文件的“地址”写进数据库。
       这就是它们之间的分工合作关系。
       你就好比是一个快递员，multer 是帮你把包裹放到指定的仓库里，
       而你要做的就是把这个包裹的存放位置记录在你的系统里，
       这样当客户来查询这个包裹的时候，你就能告诉他们“你的包裹在仓库的哪个位置”。
       这里的“包裹”就是用户上传的音乐文件，而“存放位置”就是数据库里记录的文件路径。
       只有这样，前端才能通过接口拿到这个路径，进而通过 URL 来访问这个音乐文件。
       这就是整个上传流程中，multer 和数据库之间的协作方式。
       multer 负责物理存储，数据库负责信息管理，两者缺一不可。
      */
      /*
       把刚刚存入服务器硬盘的音乐文件和封面图片，
       转换成可以通过网络访问的 URL 路径，
       然后把这些路径和歌曲的其他信息（歌名、歌手等）一起存进 MySQL 数据库。
       这就是它们之间的分工合作关系：multer 负责把文件放好，而你负责把文件的“地址”写进数据库。
       这样前端才能通过接口拿到这个路径，展示给用户看。
       也就是说，multer 是帮你把文件放好，而你要做的就是把这个文件的“地址”写进数据库。
       这就是它们之间的分工合作关系：multer 负责物理存储，数据库负责信息管理
      */
      const audioFile = req.files.audio[0]
      const coverFile = req.files.cover?.[0]

      const audioUrl = `/uploads/songs/${audioFile.filename}`
      const coverUrl = coverFile ? `/uploads/covers/${coverFile.filename}` : '/uploads/default-cover.jpg'

      // 保存到数据库
      const [result] = await connection.query(
        `INSERT INTO songs 
         (title, artist, album, description, duration, cover, audio_url, uploader_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, artist, album || null, description || null, parseInt(duration) || 0, coverUrl, audioUrl, uploaderId]
      )

      sendSuccess(res, {
        id: result.insertId,
        title,
        artist,
        album,
        description,
        audio_url: audioUrl,
        cover_url: coverUrl,
        created_at: new Date().toISOString()
      }, '上传成功', 201)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('上传错误详情:', error.message, error.stack)
    sendError(res, `上传失败: ${error.message}`, 500)
  }
}

/**
 * 获取歌曲列表
 */
export async function list(req, res, next) {
  try {
    const { search = '' } = req.query
    // 解析分页参数和可选的 uploaderEmail 参数
    const { page, pageSize, offset } = parsePagination(req.query)
    // 解析 uploaderEmail 参数，允许前端通过 ?uploaderEmail=example 来模糊搜索上传者的邮箱。parseOptionalEmail 是我们在 utils/helpers.js 里写的一个函数，它会帮你清洗和标准化这个邮箱地址，确保它是一个干净的字符串，或者如果前端没传这个参数，就返回 undefined。
    const uploaderEmail = parseOptionalEmail(req.query.uploaderEmail)

    const connection = await pool.getConnection()

    try {
      // 构建查询条件
      const conditions = []
      const params = []

      if (search) {
        // 用来存放 SQL 语句的“半成品”
        conditions.push('(s.title LIKE ? OR s.artist LIKE ?)')
        // 用来存放对应需要替换进去的真实数据。这就是为了防范 SQL 注入而做的预编译准备。
        params.push(`%${search}%`, `%${search}%`)
      }
      //如果前端还要求按“上传者的邮箱”来过滤，就再加一条规则。LOWER() 是为了忽略大小写匹配。模糊匹配
      if (uploaderEmail !== undefined) {
        conditions.push('LOWER(u.email) LIKE ?')
        params.push(`%${uploaderEmail}%`)
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      // 获取总数
      // 这一步是为了告诉前端“总共有多少页”。
      // 为什么要有这一步？因为下面的查询只会返回当前页的比如 20 条数据，
      // 如果不单独查一次总数，前端就不可能画出“共 100 页”的翻页按钮。
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total
         FROM songs s
         LEFT JOIN users u ON u.id = s.uploader_id
         ${whereClause}`,
        params
      )
      const total = countResult[0].total

      // 获取分页数据
      // 获取当前页的真实数据 (连表与分页)
      const [songs] = await connection.query(
        `SELECT 
          s.id, s.title, s.artist, s.album, s.description,
          s.audio_url, s.cover, s.play_count,
          s.uploader_id, s.created_at, s.updated_at,
          u.email AS uploader_email,
          u.username AS uploader_name
         FROM songs s
         LEFT JOIN users u ON u.id = s.uploader_id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      )

      sendSuccess(res, {
        total,
        page,
        pageSize,
        limit: pageSize,
        songs
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取列表错误:', error.message)
    sendError(res, `获取列表失败: ${error.message}`, 500)
  }
}

/**
 * 获取单首歌曲
 */
export async function get(req, res, next) {
  try {
    const { id } = req.params

    const connection = await pool.getConnection()

    try {
      const [songs] = await connection.query(
        `SELECT * FROM songs WHERE id = ?`,
        [id]
      )

      if (songs.length === 0) {
        return sendError(res, '歌曲不存在', 404)
      }

      // 更新播放次数
      await connection.query(
        `UPDATE songs SET play_count = play_count + 1 WHERE id = ?`,
        [id]
      )

      const song = {
        ...songs[0],
        play_count: (songs[0].play_count || 0) + 1
      }

      sendSuccess(res, song)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取歌曲错误:', error)
    sendError(res, '获取歌曲失败', 500)
  }
}

/**
 * 编辑歌曲信息
 */
export async function update(req, res, next) {
  try {
    const { id } = req.params
    const uploaderId = req.user?.id
    const { title, artist, album, description, duration } = req.body

    const updates = {}

    if (title !== undefined) {
      const normalizedTitle = String(title).trim()
      if (!normalizedTitle) {
        return sendError(res, '歌曲标题不能为空', 400)
      }
      updates.title = normalizedTitle
    }

    if (artist !== undefined) {
      const normalizedArtist = String(artist).trim()
      if (!normalizedArtist) {
        return sendError(res, '艺术家不能为空', 400)
      }
      updates.artist = normalizedArtist
    }

    if (album !== undefined) {
      updates.album = album ? String(album).trim() : null
    }

    if (description !== undefined) {
      updates.description = description ? String(description).trim() : null
    }

    if (duration !== undefined) {
      const parsedDuration = Number.parseInt(duration, 10)
      if (Number.isNaN(parsedDuration) || parsedDuration < 0) {
        return sendError(res, 'duration 必须是大于等于0的整数', 400)
      }
      updates.duration = parsedDuration
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, '至少提供一个可更新字段', 400)
    }

    const connection = await pool.getConnection()

    try {
      const [songs] = await connection.query(
        'SELECT id, uploader_id FROM songs WHERE id = ?',
        [id]
      )

      if (songs.length === 0) {
        return sendError(res, '歌曲不存在', 404)
      }

      if (songs[0].uploader_id !== uploaderId) {
        return sendError(res, '只能编辑自己上传的歌曲', 403)
      }

      const setClauses = []
      const params = []

      for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = ?`)
        params.push(value)
      }
      params.push(id)

      await connection.query(
        `UPDATE songs SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      )

      const [updatedRows] = await connection.query(
        `SELECT id, title, artist, album, description, duration, cover, audio_url, play_count, uploader_id, created_at, updated_at
         FROM songs WHERE id = ?`,
        [id]
      )

      sendSuccess(res, updatedRows[0], '更新成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('编辑歌曲错误:', error.message)
    sendError(res, `更新失败: ${error.message}`, 500)
  }
}

/**
 * 删除歌曲
 */
export async function remove(req, res, next) {
  try {
    const { id } = req.params
    const uploaderId = req.user?.id

    const connection = await pool.getConnection()

    try {
      // 检查所有权
      const [songs] = await connection.query(
        `SELECT uploader_id FROM songs WHERE id = ?`,
        [id]
      )

      if (songs.length === 0) {
        return sendError(res, '歌曲不存在', 404)
      }

      if (songs[0].uploader_id !== uploaderId) {
        return sendError(res, '只能删除自己上传的歌曲', 403)
      }

      // 删除
      await connection.query(`DELETE FROM songs WHERE id = ?`, [id])

      sendSuccess(res, null, '删除成功')
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('删除歌曲错误:', error.message)
    sendError(res, `删除失败: ${error.message}`, 500)
  }
}

/**
 * 获取用户上传的歌曲
 */
export async function getUserSongs(req, res, next) {
  try {
    const uploaderId = req.user?.id
    const { page, pageSize, offset } = parsePagination(req.query)

    const connection = await pool.getConnection()

    try {
      const [songs] = await connection.query(
        `SELECT * FROM songs 
         WHERE uploader_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [uploaderId, pageSize, offset]
      )

      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM songs WHERE uploader_id = ?`,
        [uploaderId]
      )

      sendSuccess(res, {
        total: countResult[0].total,
        page,
        pageSize,
        limit: pageSize,
        songs,
        data: songs
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('获取用户歌曲错误:', error.message)
    sendError(res, `获取失败: ${error.message}`, 500)
  }
}
