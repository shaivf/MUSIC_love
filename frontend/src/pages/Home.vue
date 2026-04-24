<template>
  <div class="home">
    <el-container>
      <el-header class="header">
        <h1>音乐展示平台</h1>
        <div class="nav">
          <router-link to="/songs" class="nav-link">浏览音乐</router-link>
          <router-link v-if="!userStore.isAuthenticated" to="/login" class="nav-link">登录</router-link>
          <router-link v-if="!userStore.isAuthenticated" to="/register" class="nav-link">注册</router-link>
          <router-link v-if="userStore.isAuthenticated" to="/user-center" class="nav-link">个人中心</router-link>
          <el-button v-if="userStore.isAuthenticated" @click="logout" type="text">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <div class="hero">
          <h2>欢迎来到音乐展示平台</h2>
          <p>发现和分享精彩的音乐作品</p>
          <el-button type="primary" size="large" @click="$router.push('/songs')">开始浏览</el-button>
        </div>
        <div class="features">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="feature-card">
                <div class="feature-icon">🎵</div>
                <h3>海量音乐</h3>
                <p>收录各类音乐作品，满足不同口味</p>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="feature-card">
                <div class="feature-icon">👥</div>
                <h3>用户社区</h3>
                <p>注册账号，上传分享您的音乐</p>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="feature-card">
                <div class="feature-icon">▶️</div>
                <h3>在线播放</h3>
                <p>高质量音频播放，随时随地欣赏</p>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const logout = () => {
  userStore.logout()
}
</script>

<style scoped>
.home {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.nav {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.main {
  padding: 40px 20px;
  background: #f5f5f5;
}

.hero {
  text-align: center;
  margin-bottom: 60px;
  padding: 60px 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.hero h2 {
  color: #333;
  margin-bottom: 16px;
  font-size: 36px;
}

.hero p {
  color: #666;
  font-size: 18px;
  margin-bottom: 32px;
}

.features {
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 40px 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.feature-card h3 {
  color: #333;
  margin-bottom: 12px;
  font-size: 20px;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}
</style>
