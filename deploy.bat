@echo off
REM 音乐平台部署启动脚本 (Windows 版本)
REM 支持：开发环境、测试环境、生产环境

setlocal enabledelayedexpansion

REM 颜色定义 (使用 ANSI 代码)
set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

REM 检查 Docker
echo.
echo !BLUE!================================!NC!
echo !BLUE!检查Docker...!NC!
echo !BLUE!================================!NC!

docker --version >nul 2>&1
if errorlevel 1 (
    echo !RED!✗ Docker 未安装!NC!
    exit /b 1
)
echo !GREEN!✓ Docker 已安装!NC!

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo !RED!✗ Docker Compose 未安装!NC!
    exit /b 1
)
echo !GREEN!✓ Docker Compose 已安装!NC!

REM 检查 .env 文件
if not exist ".env" (
    if exist ".env.production" (
        echo !YELLOW!复制 .env.production 到 .env!NC!
        copy .env.production .env >nul
    ) else (
        echo !RED!✗ .env 文件不存在!NC!
        exit /b 1
    )
)
echo !GREEN!✓ 环境变量已配置!NC!

REM 处理命令
if "%1"=="" goto help
if /i "%1"=="dev" goto dev
if /i "%1"=="docker" goto docker_dev
if /i "%1"=="docker:prod" goto docker_prod
if /i "%1"=="health" goto health
if /i "%1"=="logs" goto logs
if /i "%1"=="stop" goto stop
if /i "%1"=="clean" goto clean
if /i "%1"=="help" goto help

echo !RED!✗ 未知命令: %1!NC!
goto help

:dev
echo.
echo !BLUE!================================!NC!
echo !BLUE!启动本地开发环境!NC!
echo !BLUE!================================!NC!
echo !YELLOW!后端启动中...!NC!
start cmd /k "cd backend && npm install && npm run dev"
timeout /t 3
echo !YELLOW!前端启动中...!NC!
start cmd /k "cd frontend && npm install && npm run dev"
echo !GREEN!✓ 开发环境已启动!NC!
echo !BLUE!前端: http://localhost:5173!NC!
echo !BLUE!后端: http://localhost:3000!NC!
goto end

:docker_dev
echo.
echo !BLUE!================================!NC!
echo !BLUE!启动 Docker 容器 (开发模式)!NC!
echo !BLUE!================================!NC!
docker-compose up -d
timeout /t 5
echo !GREEN!✓ 容器已启动!NC!
docker-compose ps
echo !BLUE!前端: http://localhost!NC!
echo !BLUE!后端: http://localhost:3000!NC!
goto end

:docker_prod
echo.
echo !BLUE!================================!NC!
echo !BLUE!启动 Docker 容器 (生产模式)!NC!
echo !BLUE!================================!NC!
for /f "tokens=*" %%a in ('findstr "JWT_SECRET" .env') do set "line=%%a"
if "!line:change_this_to_a_strong_secret_key=!"=="!line!" (
    echo !GREEN!✓ JWT_SECRET 已配置!NC!
) else (
    echo !RED!✗ JWT_SECRET 仍为默认值，请修改.env文件!NC!
    exit /b 1
)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
timeout /t 5
echo !GREEN!✓ 生产容器已启动!NC!
docker-compose ps
goto end

:health
echo.
echo !BLUE!================================!NC!
echo !BLUE!执行健康检查!NC!
echo !BLUE!================================!NC!
echo !YELLOW!等待服务启动...!NC!
timeout /t 10
curl http://localhost:3000/health >nul 2>&1
if errorlevel 0 (
    echo !GREEN!✓ 后端服务正常!NC!
) else (
    echo !RED!✗ 后端服务不响应!NC!
)
curl http://localhost:80/health >nul 2>&1
if errorlevel 0 (
    echo !GREEN!✓ 前端服务正常!NC!
) else (
    echo !RED!✗ 前端服务不响应!NC!
)
docker-compose exec -T database mysqladmin ping -h localhost >nul 2>&1
if errorlevel 0 (
    echo !GREEN!✓ 数据库连接正常!NC!
) else (
    echo !RED!✗ 数据库连接异常!NC!
)
goto end

:logs
if "%2"=="" (set "service=backend") else (set "service=%2")
echo.
echo !BLUE!================================!NC!
echo !BLUE!查看 %service% 日志!NC!
echo !BLUE!================================!NC!
docker-compose logs -f --tail=50 %service%
goto end

:stop
echo.
echo !BLUE!================================!NC!
echo !BLUE!停止服务!NC!
echo !BLUE!================================!NC!
docker-compose down
echo !GREEN!✓ 服务已停止!NC!
goto end

:clean
echo.
echo !BLUE!================================!NC!
echo !BLUE!清理所有容器和数据!NC!
echo !BLUE!================================!NC!
set /p "confirm=确认删除所有容器和数据卷? (y/N): "
if /i "!confirm!"=="y" (
    docker-compose down -v
    echo !GREEN!✓ 清理完成!NC!
) else (
    echo !YELLOW!已取消!NC!
)
goto end

:help
echo.
echo !BLUE!🎵 音乐平台部署脚本!NC!
echo.
echo 用法: %0 [命令]
echo.
echo 命令:
echo   dev              启动本地开发环境 (Node.js 直接运行)
echo   docker           启动 Docker 容器 (开发模式)
echo   docker:prod      启动 Docker 容器 (生产模式)
echo   health           执行健康检查
echo   logs [service]   查看服务日志 (backend/frontend/database)
echo   stop             停止所有服务
echo   clean            清理所有容器和数据
echo   help             显示此帮助信息
echo.
echo 示例:
echo   %0 dev           启动本地开发
echo   %0 docker        启动 Docker 容器
echo   %0 logs backend  查看后端日志
echo.
goto end

:end
endlocal
