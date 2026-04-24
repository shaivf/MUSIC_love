<!--数据驱动视图（Pinia 的完美应用）-->
<template>
  <header class="header">
    <div class="header-container">
      <div class="logo">
        🎵 Music Showcase
      </div>
      <nav class="nav">
        <!--是 Vue Router 提供的专属跳转标签。不会向服务器请求整个新网页-->
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/songs" class="nav-link">总歌曲</RouterLink>
      </nav>
      <div class="user-section">
        <!--Vue 的条件渲染指令 v-if / v-else-->
        <template v-if="userStore.isAuthenticated">
          <span class="username">{{ userStore.user?.username || userStore.user?.email }}</span>
          <RouterLink to="/user-center" class="btn btn-secondary">用户中心</RouterLink>
          <button @click="handleLogout" class="btn btn-danger">登出</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-primary">登录</RouterLink>
          <RouterLink to="/register" class="btn btn-secondary">注册</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()    
const router = useRouter()

const handleLogout = () => {
  userStore.logout()   // 1. 清除大堂经理的记忆
  ElMessage.success('已登出')  // 2. 屏幕弹出绿色提示框
  router.push('/')       // 3. 把用户踢回首页
}
</script>

<style scoped>
.header {
  background-color: #1a1a1a;
  color: white;
  padding: 15px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.nav {
  flex: 1;
  display: flex;
  gap: 30px;
  margin-left: 50px;
}

.nav-link {
  color: white;
  text-decoration: none;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #ff6b6b;
}

.nav-link.router-link-active {
  color: #ff6b6b;
  border-bottom: 2px solid #ff6b6b;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #ff6b6b;
  color: white;
}

.btn-primary:hover {
  background-color: #ff5252;
}

.btn-secondary {
  background-color: #666;
  color: white;
}

.btn-secondary:hover {
  background-color: #777;
}

.btn-danger {
  background-color: #d32f2f;
  color: white;
}

.btn-danger:hover {
  background-color: #b71c1c;
}

@media (max-width: 768px) {
  .header-container {
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .nav {
    margin-left: 20px;
    gap: 15px;
  }
  
  .user-section {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
