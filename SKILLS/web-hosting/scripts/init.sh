#!/bin/bash
# Web Hosting Skill - 初始化脚本
# 检查环境、启动 Docker 容器、设置定时清理

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WEBROOT="$SKILL_DIR/webroot"
PORT="${WEB_PORT:-8888}"

echo "=== Web Hosting Skill 初始化 ==="

# 检查 Docker
echo "[1/5] 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo "是否安装 Docker？[y/n]"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER"
        echo "✅ Docker 安装完成，请重新登录后再次运行此脚本"
        exit 0
    else
        echo "已取消"
        exit 1
    fi
fi
echo "✅ Docker 已安装: $(docker --version)"

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi
echo "✅ Docker Compose 已安装: $(docker compose version)"

# 创建目录
echo "[2/5] 创建目录结构..."
mkdir -p "$WEBROOT"/{static,dynamic/routes,uploads}
mkdir -p "$SKILL_DIR"/docker/python
echo "✅ 目录创建完成"

# 初始化 tokens.json
if [ ! -f "$WEBROOT/tokens.json" ]; then
    echo '{"tokens":{}}' > "$WEBROOT/tokens.json"
    echo "✅ tokens.json 初始化完成"
fi

# 检查是否已运行
echo "[3/5] 检查容器状态..."
if docker compose -f "$SKILL_DIR/docker/docker-compose.yml" ps | grep -q "web-nginx\|web-python"; then
    echo "⚠️  容器已在运行中"
    read -r -p "是否重启？[y/n] " answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        docker compose -f "$SKILL_DIR/docker/docker-compose.yml" down
    else
        echo "跳过容器启动"
    fi
fi

# 启动容器
echo "[4/5] 启动 Docker 容器..."
cd "$SKILL_DIR/docker"
docker compose up -d --build
echo "✅ 容器启动完成"

# 设置定时清理
echo "[5/5] 设置定时清理任务..."
CLEANUP_CRON="0 * * * * $SKILL_DIR/scripts/cleanup.sh >> $SKILL_DIR/cleanup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "cleanup.sh"; then
    (crontab -l 2>/dev/null; echo "$CLEANUP_CRON") | crontab -
    echo "✅ 定时清理任务已添加"
else
    echo "✅ 定时清理任务已存在"
fi

# 获取公网 IP
PUBLIC_IP=$("$SKILL_DIR/scripts/get-public-ip.sh")

echo ""
echo "=== 初始化完成 ==="
echo "Web 服务地址: http://$PUBLIC_IP:$PORT"
echo "静态页面目录: $WEBROOT/static/"
echo "动态路由目录: $WEBROOT/dynamic/routes/"
echo "上传文件目录: $WEBROOT/uploads/"
echo ""
echo "使用 create-page.sh 创建页面"