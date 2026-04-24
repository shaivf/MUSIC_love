# 后勤备菜区 (Stage 1: Build dependencies)
# Stage 1: Build dependencies

FROM node:18-alpine AS builder
# 工作目录，所有后续命令都将在这个目录下执行
  # mkdir /app (创建一个叫 app 的文件夹)
  # cd /app (立刻进入这个文件夹
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for testing)
RUN npm ci

# 组装正式营业的移动餐车 (Stage 2: Production image)
# 临时车间销毁了，现在我们拉出一辆全新的、干净的 node:18-alpine 空白餐车，准备正式装修。
# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
# 安装 dumb-init 以正确处理信号。
RUN apk add --no-cache dumb-init

# Create upload directories
RUN mkdir -p /app/src/uploads/songs /app/src/uploads/covers

# Copy package files
COPY package*.json ./

# Copy node_modules from builder
# 把刚才在“第一阶段临时车间”里下载好的食材（node_modules）搬到正式餐车里，
# 然后再把你写的业务代码全搬进去。
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user for security
# 创建一个普通员工账号（appuser），并规定以后餐车只允许用这个员工身份运行。
# 因为，默认情况下，Docker 里的程序是以 Root（上帝视角老板） 身份运行的。
# 需要额外去规定
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
# 在餐车上开一个取餐窗口，编号 3000。
EXPOSE 3000

# Use dumb-init to run the app
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
