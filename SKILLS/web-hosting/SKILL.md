# Web Hosting Skill

为 OpenClaw 提供 Web 页面托管能力，支持静态页面和动态页面（Python Flask）。

## 功能

- ✅ 静态 HTML/CSS/JS 页面托管
- ✅ 动态页面（Python Flask）- 表单处理、文件上传
- ✅ 安全验证 - token + 时间戳，防止恶意访问
- ✅ 自动清理过期页面
- ✅ 飞书文件上传 - 生成安全上传页面

## 使用场景

### 1. 创建静态展示页面
当用户需要展示数据、图表、简单网页时，使用 `create-static-page` 创建静态 HTML 页面。

### 2. 创建动态页面
当用户需要表单提交、数据处理等交互功能时，使用 `create-dynamic-page` 创建 Flask 路由。

### 3. 飞书文件上传
当用户在飞书会话中发送文件时，不直接下载，而是：
1. 创建一个带安全验证的上传页面
2. 返回 URL 给用户
3. 用户通过页面上传文件

## 快速开始

### 初始化环境

```bash
~/.openclaw/workspace/skills/web-hosting/scripts/init.sh
```

首次运行会：
- 检查 Docker 环境
- 创建 webroot 目录
- 启动 Nginx + Flask 容器
- 设置自动清理 cron 任务

### 创建页面

```bash
# 静态页面
./scripts/create-page.sh static "页面内容" [自定义文件名]

# 动态页面（Flask 路由）
./scripts/create-page.sh dynamic "Python代码" [路由路径]
```

### 获取访问 URL

脚本会自动返回带 token 的完整 URL：
```
http://<公网IP>:8888/page.html?token=xxx&ts=xxx
```

## 安全机制

### Token 验证
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
| PORT | 8888 | Web 服务端口 |
| EXPIRE_SECONDS | 3600 | 链接过期时间（秒） |
| MAX_UPLOAD_SIZE | 10MB | 上传文件大小限制 |
| CLEANUP_INTERVAL | 1h | 清理任务间隔 |

## 注意事项

1. 确保服务器防火墙开放 8888 端口
2. 动态页面代码需要是安全的 Python Flask 路由代码
3. 文件上传页面自动包含安全验证