-- 创建数据库
CREATE DATABASE IF NOT EXISTS music_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE music_db;

-- users 表 (用户表)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- songs 表 (歌曲表)
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

-- play_history 表 (播放历史表)
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

-- favorites 表 (收藏表)
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '收藏ID',
  user_id INT NOT NULL COMMENT '用户ID',
  song_id INT NOT NULL COMMENT '歌曲ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',

  UNIQUE KEY unique_user_song (user_id, song_id),
  KEY idx_favorites_user_id (user_id),
  KEY idx_favorites_song_id (song_id),
  KEY idx_favorites_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- 插入测试数据（可选）
-- INSERT INTO users (email, username, password) VALUES 
-- ('test@example.com', 'testuser', '$2b$10$...hashed_password...');

-- playlists table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- playlist_songs table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
