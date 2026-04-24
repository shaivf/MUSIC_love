// 专属业务指路牌与分流台
// 大门（app.js）是怎么知道要把请求精准交给对应的经理（authController）的？
// 答案就写在这个 auth.js 文件里。
// 经典的 MVC 架构或者现代 Web 开发中，这个文件扮演的是 Router（路由层） 的角色。
/*
第一部分：整体架构（它在哪个环节起作用？）
如果把整个后端比作一个庞大的餐厅服务系统：
    app.js（大门总控）：负责基础安检，并把请求按大类粗略分发。
      比如它规定：“只要是想办会员的（/api/auth开头的），全去左边大厅！”
    auth.js（具体业务分流台 / 也就是当前文件）： 它就站在左边大厅的入口。
      它负责精准核对客人的具体需求：“你是来注册的？还是来登录的？”然后把客人引荐给对应的办理经理。
    authController.js（具体办理经理）： 拿到客人资料，开始真正地干活（查数据库、发手环）。
      它起作用的环节，正好死死地卡在 app.js 和 Controller 之间，起到了“承上启下”的桥梁作用。
*/
import express from 'express'
import * as authController from '../controllers/authController.js'

// 制造分流台 (express.Router())
// 这是 Express 框架提供的一个“迷你小大门”。
const router = express.Router()

// 用户注册
// 这就是分流台的核心功能：根据不同的请求路径和方法，精准地把请求交给对应的业务处理函数。
// 规定前端必须用 POST 请求方法（因为注册要提交账号密码，不能用明文展示在网址上的 GET）。
router.post('/register', authController.register)
// 这里只是写函数名，不要加括号 ()！ 加了括号就变成当场执行了，我们要的是“等请求来了再执行”。

// 用户登录
// 这里的 authController.login 就是我们在 controllers/authController.js 里定义的那个函数。
router.post('/login', authController.login)

// 用户登出
// 这个路由虽然没有真正的业务逻辑，但它的存在是为了满足前端的需求，
// 让前端能够有一个明确的接口来调用“登出”功能，哪怕这个功能只是前端清除本地存储的 token。
// 上面注册和登录的逻辑很复杂，所以交给了外面的 Controller 文件去处理；
// 而“登出”通常不需要查数据库（前端只要把自己本地存的 Token 删掉就行了），
// 所以这里没有叫厨师，领位员自己顺手就处理了。
// 直接当场写了一个匿名函数 (req, res) => {...} 返回了成功的 JSON 提示。
// 手环（Token）是存在**用户自己的浏览器（前端）**里的。后端根本就没有用内存或数据库去记录“谁在线上”。
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    code: 200,
    data: null,
    message: '登出成功'
  })
})

// 把这个配置好的“专属服务区（分流台）”整体打包暴露出去。
export default router
// 命名导出（精准匹配）
//  之前在数据库配置里用的是：export { pool }。
//  这就好比你明确告诉外界：“我导出的这个东西，它的名字就叫 pool”。
//  所以，别人在借用时，必须带上大括号，且名字必须一模一样：
// 默认导出（随便改名）
//  在 auth.js 路由文件里，你用的是：export default router。
//  default 这个词的意思是：这个文件里，只有这一个“唯一的大哥”。
//  既然它是唯一的，那么去接它的文件（app.js）就不需要去挑挑拣拣了。
//  app.js 只要一把将它抓过来，并且可以根据自己的喜好，随便给它重新起个名字。
//  这就好比 auth.js 说：“我把我这里的唯一大管家派给你了，至于你叫他小王、老王还是王总，随你的便。”
