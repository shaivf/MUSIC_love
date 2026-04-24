#!/bin/bash

# 音乐平台部署启动脚本
# 支持：开发环境、测试环境、生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 检查依赖
check_dependencies() {
    print_header "检查依赖"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    print_success "Docker 已安装"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    print_success "Docker Compose 已安装"
}

# 环境变量检查
check_env() {
    print_header "检查环境配置"
    
    if [ ! -f ".env" ]; then
        if [ ! -f ".env.production" ]; then
            print_error ".env 文件不存在"
            echo "请复制 .env.production 到 .env 并根据需要修改"
            exit 1
        fi
        print_warning "复制 .env.production 到 .env"
        cp .env.production .env
    fi
    print_success "环境变量已配置"
}

# 启动开发环境
start_dev() {
    print_header "启动开发环境"
    
    print_warning "开发环境启动 (仅用于本地开发)"
    
    # 启动后端
    echo -e "${YELLOW}启动后端服务...${NC}"
    cd backend
    npm install || true
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    # 启动前端
    echo -e "${YELLOW}启动前端服务...${NC}"
    cd frontend
    npm install || true
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "开发环境已启动"
    echo -e "${BLUE}后端: http://localhost:3000${NC}"
    echo -e "${BLUE}前端: http://localhost:5173${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    
    wait $BACKEND_PID $FRONTEND_PID
}

# 启动 Docker 容器（开发模式）
start_docker_dev() {
    print_header "启动 Docker 容器 (开发模式)"
    
    docker-compose up -d
    
    sleep 5
    
    print_success "容器已启动"
    echo -e "${BLUE}前端: http://localhost${NC}"
    echo -e "${BLUE}后端: http://localhost:3000${NC}"
    echo -e "${BLUE}数据库: 仅限容器内访问${NC}"
    
    docker-compose ps
}

# 启动 Docker 容器（生产模式）
start_docker_prod() {
    print_header "启动 Docker 容器 (生产模式)"
    
    # 检查敏感信息
    if grep -q "change_this_to_a_strong_secret_key" .env; then
        print_error "JWT_SECRET 仍为默认值，请修改 .env 文件"
        exit 1
    fi
    
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    sleep 5
    
    print_success "生产容器已启动"
    docker-compose ps
}

# 健康检查
health_check() {
    print_header "执行健康检查"
    
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10
    
    # 检查后端
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "后端服务正常"
    else
        print_error "后端服务不响应"
    fi
    
    # 检查前端
    if curl -s http://localhost/health > /dev/null 2>&1; then
        print_success "前端服务正常"
    else
        print_error "前端服务不响应"
    fi
    
    # 检查数据库
    if docker-compose exec -T database mysqladmin ping -h localhost > /dev/null 2>&1; then
        print_success "数据库连接正常"
    else
        print_error "数据库连接异常"
    fi
}

# 查看日志
view_logs() {
    print_header "服务日志"
    docker-compose logs -f --tail=50 "$1"
}

# 停止服务
stop_services() {
    print_header "停止服务"
    docker-compose down
    print_success "服务已停止"
}

# 清理所有
cleanup() {
    print_header "清理所有容器和数据"
    read -p "确认删除所有容器和数据卷? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        print_success "清理完成"
    else
        print_warning "已取消"
    fi
}

# 显示帮助
show_help() {
    cat << EOF
🎵 音乐平台部署脚本

用法: $0 [命令]

命令:
  dev              启动本地开发环境 (Node.js 直接运行)
  docker           启动 Docker 容器 (开发模式)
  docker:prod      启动 Docker 容器 (生产模式)
  health           执行健康检查
  logs [service]   查看服务日志 (backend/frontend/database)
  stop             停止所有服务
  clean            清理所有容器和数据
  help             显示此帮助信息

示例:
  $0 dev           # 启动本地开发
  $0 docker        # 启动 Docker 容器
  $0 logs backend  # 查看后端日志
EOF
}

# 主函数
main() {
    case "${1:-help}" in
        dev)
            check_dependencies
            start_dev
            ;;
        docker)
            check_dependencies
            check_env
            start_docker_dev
            health_check
            ;;
        docker:prod)
            check_dependencies
            check_env
            start_docker_prod
            health_check
            ;;
        health)
            health_check
            ;;
        logs)
            view_logs "${2:-backend}"
            ;;
        stop)
            stop_services
            ;;
        clean)
            cleanup
            ;;
        help)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
