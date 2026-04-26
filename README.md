# OpenClaw Workspace Repository

> 💡 **提示**：如需将某个目录加入本 README，请提供目录路径，我会将其加入目录树并添加简要说明。

## 目录结构

```
openclaw-start-sh/
├── CLAUDE.md                    # Claude Code 项目工作指引
├── sync-prompts.sh              # Workspace 状态自动同步脚本（每3小时 cron）
├── deploy_question.md           # OpenClaw Gateway 部署问题排查记录
│
├── SKILLS/                      # OpenClaw 可复用技能模块
│   └── web-hosting/            # Docker 化的临时网页托管服务
│
├── conversations/              # OpenClaw 会话工作区配置与记忆
│   └── 2026-03-10-feishu-caoting/  # 特定会话的 persona 配置
│
└── roles/                      # 角色/提示词模板库
    └── 宝爸自媒体角色设计.md   # 理工科方法论型宝爸内容创作助手
```

---

## 目录说明

| 目录/文件 | 说明 |
|-----------|------|
| `CLAUDE.md` | Claude Code 工作时必须遵守的项目指引，包含架构说明、开发命令、安全限制 |
| `sync-prompts.sh` | 每3小时自动将 OpenClaw workspace prompts 同步到 git 仓库的脚本 |
| `deploy_question.md` | OpenClaw Gateway token 不匹配、设备配对循环依赖等问题的排查与解决方案 |
| `SKILLS/` | 可复用的 OpenClaw 技能模块目录，目前包含 web-hosting 托管服务 |
| `conversations/` | OpenClaw 会话工作区，存储 persona 配置（IDENTITY、SOUL、AGENTS 等）和持久化记忆 |
| `roles/` | 角色/提示词模板库，存储可复用的 AI 助手角色定义 |
