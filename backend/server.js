
// server.js - 服务器入口文件
// 这个文件负责启动 Express 服务器，并监听指定的端口
// server.js 只负责“启动和关闭系统”：
// 它像一个外壳，把 app.js 包装起来并暴露在网络上。
// server.js 负责监听端口并处理优雅关闭，而 app.js 负责定义路由和中间件。
import 'dotenv/config.js';
import app from './src/app.js';
// app.js (应用配置)：负责定义你的应用长什么样
// 比如包含哪些路由（/users, /login）、使用了什么中间件。
// 这就像是造好了一台汽车引擎。

const PORT = process.env.PORT || 3000;

// 启动服务器，调用 app.listen() 方法，监听指定的端口,到达app.js
// 启动 HTTP 服务器并监听指定端口 的标准写法
// 当服务器成功启动并准备接收请求时，会自动调用传入的回调函数。
// app.listen(PORT, callback) 
// 返回一个 http.Server 实例，我们将其保存在 server 变量中，
// 以便后续进行优雅关闭。
// （回调函数）不是用来处理客户端请求的，而是 仅在服务器启动完成时执行一次。
// 服务器启动后，回调函数会打印服务器运行的 URL（访问地址） 和当前环境信息。
const server = app.listen(PORT, () => {
  console.log(`✅ 服务器运行于 http://localhost:${PORT}`)
  console.log(`📍 环境: ${process.env.NODE_ENV || 'development'}`)
});

// 优雅关闭
['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    console.log('📞 收到 SIGTERM 信号，关闭服务器...');
    /*
    server.close() 方法会停止服务器接受新的连接，
    并在所有现有连接关闭后调用回调函数。
    这确保了服务器在关闭前完成所有正在处理的请求，避免了突然中断用户体验。
    */
    server.close(() => {
      console.log('✅ 服务器已关闭');
      process.exit(0) ; // 回调函数
    });
  });
});
/**
 * 完美配合的 4 个步骤（数据流与指令流）
 * 当你在服务器敲下 docker stop <容器名>，或者云服务器自动缩容时，
 * 以下连锁反应开始发生：
 * 第一步：物业下发通知（Docker 发出 SIGTERM）
 *    Docker 引擎并不会立刻“拔电源”，而是讲武德地向容器的 1 号进程（PID 1）
 *    发送一个名叫 SIGTERM（终止请求）的系统信号。意思是：“请准备下班”。
 * 第二步：专业店长接旨（dumb-init 的作用）
 *    还记得我们在 Dockerfile 里写的 ENTRYPOINT ["dumb-init", "--"] 吗？
 *    因为有了它，坐在 1 号进程位置上的是专业的店长 dumb-init。
 *    dumb-init 非常懂操作系统的规矩，它稳稳地接住了 SIGTERM 信号，
 *    然后立刻原封不动地把信号转身传递给它的下属 —— Node.js 进程（主厨）。
 * 第三步：主厨听到指令（process.on('SIGTERM') 的作用）
 *    信号传到了 Node.js。如果你不在 server.js 里写那段代码，
 *    Node.js 主厨其实是“聋子”，他会无视信号继续炒菜。
 *    但是，因为你写了：
 *      process.on('SIGINT', () => {
          console.log('📞 收到 SIGINT 信号，关闭服务器...')
          server.close(() => {
            console.log('✅ 服务器已关闭')
            process.exit(0)
            })
          })
 *    这就像主厨戴上了对讲机耳机！
      他成功听到了店长传来的“准备下班”的指令。
  第四步：执行关店标准流程（server.close() 的作用）
      听到指令后，主厨开始执行紧急预案：
        server.close(() => {
          console.log('✅ 服务器已关闭')
          process.exit(0)
        })
    这里的 server.close() 是一句魔法代码，它会做两件事：
      挂上“打烊”牌子：拒绝任何新的网络请求进来（直接拒接新的 HTTP 请求）。
      耐心等待：让那些正在传输数据的旧请求继续走完。
      等到最后一个字节传输完毕，回调函数触发，打印出“服务器已关闭”，
      最后执行 process.exit(0)，Node.js 进程安全退出。
      主厨下班了，店长 dumb-init 看到厨房空了，自己也跟着下班。
      Docker 容器完美关闭！
 * */ 
