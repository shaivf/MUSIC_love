<template>
  <div class="login">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>用户登录</h2>
        </div>
      </template>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="请输入邮箱地址"
            prefix-icon="📧"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="🔒"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="links">
        <router-link to="/register">还没有账号？立即注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAsyncError } from '@/utils/useAsyncError'

const router = useRouter()
const userStore = useUserStore()
const { loading, execute } = useAsyncError()

// 登录表单数据源
const loginForm = reactive({
  email: '',
  password: ''
})
const loginFormRef = ref()
// 表单校验规则如何工作
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '你输入的什么密码！！！', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await loginFormRef.value.validate()    // 校验数据流
    // 存疑？？？？？如果 validate() 失败会抛出异常吗？
    // 如果抛出异常了，是否会被 useAsyncError 捕获到？
    // 如果没有被捕获到，是否需要在这里 catch 住这个异常？
    // 如果不 catch 住这个异常，会不会导致全局错误界面被触发？ 
    // --- IGNORE ---

    await execute(
      () => userStore.login(loginForm.email, loginForm.password),
      '登录失败，请检查邮箱和密码'
    )
    
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    // execute 已经处理了错误显示
    // 接住 validate() 的失败 ，不会继续向上抛
    // 接住 execute() 返回的 rejected promise
    // 需要catch
  }
}
</script>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #333;
}

.links {
  text-align: center;
  margin-top: 20px;
}

.links a {
  color: #667eea;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>