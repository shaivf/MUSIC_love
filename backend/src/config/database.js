/**
 * 数据库连接和初始化模块
 * - 使用 mysql2/promise 创建连接池
 * - 在启动时确保 favorites、playlists 和 playlist_songs 表存在
 * - 提供 pool 对象供其他模块使用
 * 是餐厅**“与超级大冰柜（MySQL 数据库）之间的专用运输通道与货物分类架”**。
 * 在终端输入 npm start 启动后端服务器时，
 *    程序还没开始接收用户的任何 HTTP 请求，就会先执行这个文件。
 *    1.它先修好一条通往大冰柜的“高速公路”（建立连接池）
 *    2.然后派一个先头部队去大冰柜里检查：“装收藏夹、歌单的货架搭好了没？”（ensureTables）。
 *    3.如果没搭好，现场敲钉子搭架子（CREATE TABLE）。
 *    4.确认一切就绪后，把这条高速公路的使用权（pool/连接池）暴露出去，供后续业务使用。
 * 为什么要在服务器启动时就确保数据库表存在？
 *    因为我们不想等到用户第一次访问收藏或歌单功能时才发现数据库表不存在，
 *    那样会导致错误和糟糕的用户体验。
 */




import mysql from 'mysql2/promise.js'
/*
const 声明一个块级作用域的常量，并且该常量的引用（内存地址）无法被重新赋值。
      const 保证的不是“值绝对不能变”，而是**“变量指向的内存地址不能变”**。
块级作用域 (Block Scope)
const（以及 let）只在它被声明的代码块 {} 内有效。这极大地减少了变量污染的问题。

JavaScript
if (true) {
    const greeting = "Hello";
    console.log(greeting); // 正常输出: Hello
}

// 报错：ReferenceError: greeting is not defined
console.log(greeting);

为什么要用 Pool，而不是普通的单次连接？（面试必考）
反面教材（单次连接）： 每次前端发来请求，
    后端就去和数据库“握手 -> 建立连接 -> 查数据 -> 挥手断开”。这个建立连接的过程极其耗时！
    就像每次客人点菜，你都要现跑去人才市场临时招一个搬运工，搬完一次就把他辞退。
连接池原理： 一启动服务器，我就**长期雇佣 10 个搬运工（connectionLimit: 10）**在后台待命。
    waitForConnections: true 的精妙之处：如果突然来了 15 个并发请求，
    10 个搬运工都在忙怎么办？这个配置让剩下的 5 个请求“排队等一会儿”，
    等哪个搬运工空闲了立刻顶上，而不是直接报错崩溃。
*/
// 连接池是一个预先建立好的一组数据库连接，服务器启动时就创建好，
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'music_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})
/*
代码层面的自动建表逻辑。
  为什么这样设计：对于学生项目或者敏捷开发来说，这叫“开箱即用”。
  你把代码发给你的同学，他只要配置好空的数据库，一运行代码，表就自动建好了，
  不需要他手动去导入 .sql 文件。
*/
// 这个函数的作用是：在服务器启动时，自动检查并创建 favorites、playlists 和 playlist_songs 表。
// async 的作用是让“需要耗费时间去等”的代码（比如去网络上下载数据、读取大文件），
//    写起来就像普通的“从上到下一行行执行”的代码一样简单、易读。
async function ensureTables() {
  try {
    const connection = await pool.getConnection()  // 借一个搬运工
    connection.release()    // 测试完通道立马还回去（好习惯！）
    console.log('✅ 数据库连接成功')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
          email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱（用户名）',
          username VARCHAR(50) UNIQUE COMMENT '用户昵称',
          password VARCHAR(255) NOT NULL COMMENT '密码哈希（bcrypt）',
          avatar VARCHAR(255) COMMENT '头像URL',
          bio TEXT COMMENT '个人简介',
          is_active TINYINT(1) DEFAULT 1 COMMENT '用户是否激活',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          KEY idx_email (email),
          KEY idx_username (username),
          KEY idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';`)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '歌曲ID',
        title VARCHAR(100) NOT NULL COMMENT '歌曲名称',
        artist VARCHAR(100) NOT NULL COMMENT '艺术家/歌手',
        album VARCHAR(100) COMMENT '专辑名称',
        description TEXT COMMENT '歌曲描述',
        duration INT NOT NULL COMMENT '时长（秒）',
        cover VARCHAR(255) NOT NULL COMMENT '封面图片URL',
        audio_url VARCHAR(255) NOT NULL COMMENT '音频文件URL',
        uploader_id INT NOT NULL COMMENT '上传者ID（分类标准）',
        play_count INT DEFAULT 0 COMMENT '播放次数',
        download_count INT DEFAULT 0 COMMENT '下载次数',
        is_public TINYINT(1) DEFAULT 1 COMMENT '是否公开',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        KEY idx_uploader_id (uploader_id),
        KEY idx_created_at (created_at),
        KEY idx_title (title),
        KEY idx_artist (artist),
        FULLTEXT idx_search (title, artist, album),
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='歌曲表';
      `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS play_history (
      id INT AUTO_INCREMENT PRIMARY KEY COMMENT '历史记录ID',
      user_id INT NOT NULL COMMENT '用户ID',
      song_id INT NOT NULL COMMENT '歌曲ID',
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '播放时间',
  
      KEY idx_user_id (user_id),
      KEY idx_song_id (song_id),
      KEY idx_played_at (played_at),
      KEY idx_user_time (user_id, played_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='播放历史表';
      `)
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        song_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_song (user_id, song_id),
        KEY idx_favorites_user_id (user_id),
        KEY idx_favorites_song_id (song_id),
        KEY idx_favorites_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_playlist_name (user_id, name),
        KEY idx_playlists_user_id (user_id),
        KEY idx_playlists_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
// pool.query() 是一个典型的耗时网络请求
    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlist_songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id INT NOT NULL,
        song_id INT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_playlist_song (playlist_id, song_id),
        KEY idx_playlist_songs_playlist_id (playlist_id),
        KEY idx_playlist_songs_song_id (song_id),
        KEY idx_playlist_songs_added_at (added_at),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    console.log('表已就绪')
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message)
    process.exit(1)
  }
}

// 按下“启动键”
// 写了那么长一串 async function ensureTables() { ... }，那只是定义了一个函数。
// 因为它是异步操作，且放在文件末尾直接调用，
// 意味着它会在后台默默执行。如果数据库里已经有这些表了，
// SQL 里的 IF NOT EXISTS 会让它瞬间跳过，不会影响性能，也不会覆盖原有数据。)
ensureTables()

// 是现代 JavaScript（ES6 模块化）的导出语句。
// 有很多功能文件都要连接数据库的
// 连接数据库是非常耗费内存和时间的，我们绝对不能在每个文件里都去重新建立一次连接。
// 通过 export { pool }，我们把这个连接池对象暴露出去，
// 让其他模块（比如 songController.js、userController.js）
// 可以通过 import { pool } from '../config/database.js' 来使用同一个连接池，
// 这样就避免了重复创建连接的麻烦，同时也保证了整个应用中只有一个连接池在运行，节省资源，提高效率。
// 怎么使用它： 其他任何需要查数据库的文件，不需要知道数据库密码，也不需要自己去连，只需要**导入（import）**这把钥匙就可以了。
export { pool }
// 命名导出，所以其他文件调用时必须用大括号，且名字必须一模一样：