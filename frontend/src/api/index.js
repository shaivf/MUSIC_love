// 这个文件起到了    接口抽象层
// 将一些接口调用的细节封装起来，提供更简洁的API给页面组件使用；成为了前端内部的“语义化接口”

// 引入Axios封装的http工具，用于发送HTTP请求到后端API：HTTP 请求实例
// 屏蔽页面store 对底层HTTP 细节的直接依赖?
// 是页面Store和HTTP 工具之间的“中间接口层”?
import http from '@/utils/http'
/*
让这里的 API 方法不用关心：

  请求前怎么加 token
  错误怎么处理
  基础 URL 是什么
  而且可以直接在调用的时候，传入的参数也无需去协商，通过stores/user.js 进行封装，
    提供更友好的接口。
    例如：userApi.login({ email, password }) 就足够了，不需要关心底层细节。
*/

// 对象封装 Export（index.js 的写法）—?【套餐模式?
// 对于这些函数，要么不要，要就全部引用
// 当Login.vue 需要用的时候，不需要用大括号，直接把整个套餐端过来。

// 用户相关 API（包括认证和用户信息）
export const userApi = {
  
  // ==================== 认证相关 ====================
  
  // 注册
  register(data) {
    return http.post('/auth/register', data)
  },
  
  // 登录
  login(data) {
    return http.post('/auth/login', data)
  },
  
  // 登出
  logout() {
    return http.post('/auth/logout')
  },
  
  // ==================== 用户信息相关 ====================
  
  // 获取个人信息
  getProfile() {
    return http.get('/user/profile')
  },
  
  // 更新个人信息
  updateProfile(data) {
    return http.put('/user/profile', data)
  },
  
  // 获取我上传的歌曲
  getMySongs(page = 1, pageSize = 20) {
    return http.get('/songs/user/songs', { 
      params: { page, pageSize } 
    })
  },
  
  // 获取播放历史
  getPlayHistory(page = 1, pageSize = 20) {
    return http.get('/user/history', { 
      params: { page, pageSize } 
    })
  },
  
  // 记录播放历史
  recordPlayHistory(songId) {
    return http.post('/user/history', { song_id: songId })
  }
}


