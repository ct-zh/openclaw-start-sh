#!/bin/bash
# OpenClaw 工作区提示词同步脚本
# 每3小时执行：同步提示词文件 + 检查提交推送

set -e

WORKSPACE="/home/admin/.openclaw/workspace"
REPO="/home/admin/.openclaw/workspace/openclaw-start-sh"
CONVERSATION_DIR="$REPO/conversations/2026-03-10-feishu-caoting"
DEPLOY_KEY="$HOME/.ssh/github_deploy_key"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查仓库是否存在
if [ ! -d "$REPO/.git" ]; then
    log "错误：仓库不存在"
    exit 1
fi

# 检查对话文件夹是否存在，不存在则创建
if [ ! -d "$CONVERSATION_DIR" ]; then
    mkdir -p "$CONVERSATION_DIR"
    log "创建对话文件夹: $CONVERSATION_DIR"
fi

# 同步提示词文件
log "开始同步提示词文件..."

PROMPT_FILES=(
    "AGENTS.md"
    "BOOTSTRAP.md"
    "HEARTBEAT.md"
    "IDENTITY.md"
    "MEMORY.md"
    "SOUL.md"
    "TOOLS.md"
    "USER.md"
)

for file in "${PROMPT_FILES[@]}"; do
    src="$WORKSPACE/$file"
    dst="$CONVERSATION_DIR/$file"
    if [ -f "$src" ]; then
        cp "$src" "$dst"
        log "已同步: $file"
    fi
done

# 同步 memory 目录
if [ -d "$WORKSPACE/memory" ]; then
    mkdir -p "$CONVERSATION_DIR/memory"
    cp -r "$WORKSPACE/memory/"*.md "$CONVERSATION_DIR/memory/" 2>/dev/null || true
    log "已同步: memory/*.md"
fi

log "同步完成"

# 检查是否有未提交的修改
cd "$REPO"

# 配置 git 使用 deploy key
export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no"

# 检查是否有变更
if [ -n "$(git status --porcelain)" ]; then
    log "检测到未提交的修改，开始提交..."
    
    # 设置 git 用户信息（如果未配置）
    git config user.email "openclaw-bot@local" 2>/dev/null || true
    git config user.name "OpenClaw Bot" 2>/dev/null || true
    
    # 添加所有变更
    git add -A
    
    # 生成 commit message
    COMMIT_MSG="chore: sync workspace prompts - $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 提交
    git commit -m "$COMMIT_MSG"
    log "已创建 commit: $COMMIT_MSG"
    
    # 推送
    git push origin main 2>&1 || git push origin master 2>&1 || {
        log "警告：推送失败，可能需要检查网络或权限"
        exit 1
    }
    log "推送成功"
else
    log "没有检测到变更，跳过提交"
fi

log "同步脚本执行完成"