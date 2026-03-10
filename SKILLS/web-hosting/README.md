# Web Hosting Skill

为 OpenClaw 提供 Web 页面托管能力，支持静态页面和动态页面（Python Flask）。

## 功能

- ✅ 静态 HTML/CSS/JS 页面托管
- ✅ 动态页面（Python Flask）- 表单处理、文件上传
- ✅ 安全验证 - token + 时间戳，防止恶意访问
- ✅ 自动清理过期页面
- ✅ 飞书文件上传 - 生成安全上传页面

## 快速安装

```bash
# 1. 克隆仓库或复制技能目录
git clone https://github.com/ct-zh/openclaw-start-sh.git
cp -r openclaw-start-sh/SKILLS/web-hosting ~/.openclaw/workspace/skills/

# 2. 初始化（首次使用）
cd ~/.openclaw/workspace/skills/web-hosting
./scripts/init.sh
```

## 使用方法

### 1. 创建静态页面

```bash
./scripts/create-page.sh static "<h1>Hello World</h1>" hello
# 输出: http://<IP>:8888/hello.html?token=xxx&ts=xxx
```

### 2. 创建动态页面

```bash
./scripts/create-page.sh dynamic 'return jsonify({"msg": "hello"})' myapi
# 输出: http://<IP>:8888/api/myapi?token=xxx&ts=xxx
```

### 3. 创建文件上传页面

```bash
./scripts/create-page.sh upload "上传您的文件" upload
# 输出: http://<IP>:8888/upload.html?token=xxx&ts=xxx
```

## 安全机制

- **Token 验证**：每个页面生成唯一 token
- **时间戳过期**：默认 1 小时失效
- **自动清理**：定时任务清理过期文件

## 文件结构

```
web-hosting/
├── SKILL.md              # 技能说明
├── README.md             # 本文件
├── scripts/
│   ├── init.sh           # 初始化脚本
│   ├── create-page.sh    # 创建页面
│   ├── cleanup.sh        # 清理过期文件
│   └── get-public-ip.sh  # 获取公网 IP
├── docker/
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf
│   └── python/
│       ├── Dockerfile
│       ├── app.py
│       └── requirements.txt
├── templates/            # 页面模板
└── webroot/              # Web 根目录
    ├── static/           # 静态页面
    ├── dynamic/routes/   # 动态路由
    └── uploads/          # 上传文件
```

## 配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 端口 | 8888 | Web 服务端口 |
| 过期时间 | 1 小时 | 链接有效期 |
| 上传限制 | 10MB | 文件大小限制 |

## 注意事项

1. 需要安装 Docker
2. 确保防火墙开放端口
3. 首次使用需要拉取镜像