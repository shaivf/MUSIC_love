/**
 * API 响应格式标准化
 */
/*
  这里传了 code 和 statusCode 两个东西。它们有什么区别？
  statusCode（HTTP 状态码）：这是给“外卖小哥（浏览器/网络）”看的。
    200：路面通畅，外卖送到了。
    404：找不到这家店。
    500：路上出车祸了（服务器崩溃）。
    这是全球统一的互联网标准。
  code（业务状态码）：这是给“顾客（前端代码）”看的。
  哪怕外卖成功送到了顾客手里（HTTP 是 200），
      但打开盒子一看，里面可能是张纸条：“对不起，由于食材耗尽，退款给你（业务失败）”。
  在企业级开发中，code 通常是你们自己定义的。比如：
  20000: 真的成功了。
  40001: 密码错误。
  40002: 账号被封禁。
*/
export function sendSuccess(res, data = null, message = '成功', code = 200, statusCode = code) {
  res.status(statusCode).json({
    success: true,
    code,
    data,
    message
  })
}

export function sendError(res, message = '操作失败', code = 400, statusCode = code, data = null) {
  res.status(statusCode).json({
    success: false,
    code,
    data,
    message
  })
}
