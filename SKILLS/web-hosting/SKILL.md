---
name: web-hosting
description: Web page hosting for OpenClaw. Support static HTML and dynamic Flask pages with secure token validation.
---

# Web Hosting Skill

为 OpenClaw 提供 Web 页面托管能力，支持静态页面和动态页面（Python Flask）。

## ⚠️ 核心规则（必须遵守）

1. **必须使用 8888 端口**，通过 Docker Nginx 容器对外访问
2. **禁止使用其他端口**（如 Python http.server、其他端口）
3. **先检查现有资源**，再决定是否需要创建新容器

### 快速检查清单

```bash
# 1. 检查容器是否已运行
docker ps | grep nginx-8888

# 2. 检查镜像是否存在
docker images | grep nginx

# 3. 托管静态页面（最常用）
docker cp <本地文件> nginx-8888:/usr/share/nginx/html/<文件名>

# 4. 验证访问
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8888/<文件名>
```

### 托管静态页面（推荐流程）

```bash
# 1. 检查容器
docker ps | grep nginx-8888 || echo "容器未运行"

# 2. 如果容器不存在，运行 init.sh 初始化
# 3. 复制文件到容器
docker cp /path/to/page.html nginx-8888:/usr/share/nginx/html/page.html

# 4. 返回访问 URL
echo "http://<公网IP>:8888/page.html"
```

## 功能

- ✅ 静态 HTML/CSS/JS 页面托管
- ✅ 动态页面（Python Flask）- 表单处理、文件上传
- ✅ 安全验证 - token + 时间戳，防止恶意访问
- ✅ 自动清理过期页面
- ✅ 飞书文件上传 - 生成安全上传页面

## 使用场景

### 1. 创建静态展示页面（最常用）
当用户需要展示数据、图表、简单网页时：
1. 检查 nginx-8888 容器是否运行
2. 使用 `docker cp` 复制文件到容器
3. 返回 `http://<公网IP>:8888/<文件名>` 作为访问地址

### 2. 创建动态页面
当用户需要表单提交、数据处理等交互功能时，使用 `create-dynamic-page` 创建 Flask 路由。

### 3. 飞书文件上传
当用户在飞书会话中发送文件时，不直接下载，而是：
1. 创建一个带安全验证的上传页面
2. 返回 URL 给用户
3. 用户通过页面上传文件

## 初始化环境

```bash
~/.openclaw/workspace/skills/web-hosting/scripts/init.sh
```

首次运行会：
- 检查 Docker 环境
- 检查现有容器和镜像（优先使用现有资源）
- 创建 webroot 目录
- 启动 Nginx + Flask 容器
- 设置自动清理 cron 任务

## 故障排除

### Docker 镜像拉取失败

```bash
# 1. 先检查是否已有镜像
docker images | grep nginx

# 2. 如果有镜像但容器未运行，直接启动
docker run -d --name nginx-8888 -p 8888:80 nginx

# 3. 如果需要拉取且失败，尝试开启代理
# 或使用国内镜像源
```

### 端口被占用

```bash
# 检查 8888 端口占用
netstat -tlnp | grep 8888

# 如果有其他服务占用，停止它
# 绝对不能改用其他端口托管页面
```

### 容器已存在但未运行

```bash
# 启动已存在的容器
docker start nginx-8888
```

## 安全机制

### Token 验证（用于上传页面）
- 每个页面生成唯一 token
- URL 包含时间戳参数
- 默认 1 小时过期

### 过期清理
- Cron 任务每小时检查
- 自动删除过期页面文件
- 清理超过 24 小时的上传文件

## 文件结构

```
~/.openclaw/workspace/webroot/
├── static/           # 静态页面
│   ├── page1.html
│   └── ...
├── dynamic/          # Flask 动态路由
│   ├── routes/
│   └── ...
├── uploads/          # 用户上传文件
└── tokens.json       # token 验证数据

~/.openclaw/workspace/skills/web-hosting/
├── SKILL.md          # 本文件
├── scripts/
│   ├── init.sh       # 初始化
│   ├── create-page.sh
│   ├── cleanup.sh
│   └── get-public-ip.sh
├── docker/
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf
│   └── python/
│       ├── app.py
│       └── requirements.txt
└── templates/
    ├── static.html
    └── upload.html
```

## 配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 8888 | Web 服务端口（固定，不可更改） |
| EXPIRE_SECONDS | 3600 | 链接过期时间（秒） |
| MAX_UPLOAD_SIZE | 10MB | 上传文件大小限制 |
| CLEANUP_INTERVAL | 1h | 清理任务间隔 |

## 注意事项

1. **端口固定为 8888**，不得使用其他端口
2. 确保服务器防火墙开放 8888 端口
3. 动态页面代码需要是安全的 Python Flask 路由代码
4. 文件上传页面自动包含安全验证
5. 优先检查现有容器和镜像，避免重复创建