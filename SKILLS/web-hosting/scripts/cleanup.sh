#!/bin/bash
# Web Hosting Skill - 清理过期页面
# 由 cron 定时调用

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WEBROOT="$SKILL_DIR/webroot"

echo "=== 开始清理过期页面 ==="
echo "时间: $(date)"

# 当前时间戳
NOW=$(date +%s)

# 清理过期的静态页面
clean_static() {
    local count=0
    if [ -f "$WEBROOT/tokens.json" ]; then
        # 读取所有过期的 token 并删除对应文件
        cd "$WEBROOT"
        for path in $(jq -r ".tokens | to_entries[] | select(.value.expire < $NOW) | .key" tokens.json 2>/dev/null); do
            if [ -f "$path" ]; then
                rm -f "$path"
                echo "删除过期文件: $path"
                ((count++))
            fi
        done
        
        # 从 tokens.json 中移除过期条目
        local tmp_file=$(mktemp)
        jq "del(.tokens[] | select(.expire < $NOW))" tokens.json > "$tmp_file" && mv "$tmp_file" tokens.json
    fi
    echo "清理静态页面: $count 个"
}

# 清理过期的上传文件（超过24小时）
clean_uploads() {
    local count=0
    local upload_dir="$WEBROOT/uploads"
    
    if [ -d "$upload_dir" ]; then
        # 查找超过24小时的文件
        while IFS= read -r -d '' dir; do
            rm -rf "$dir"
            echo "删除上传目录: $dir"
            ((count++))
        done < <(find "$upload_dir" -mindepth 1 -maxdepth 1 -type d -mtime +1 -print0 2>/dev/null)
    fi
    echo "清理上传目录: $count 个"
}

# 清理空目录
clean_empty_dirs() {
    find "$WEBROOT/static" -type d -empty -delete 2>/dev/null || true
    find "$WEBROOT/uploads" -type d -empty -delete 2>/dev/null || true
}

# 执行清理
clean_static
clean_uploads
clean_empty_dirs

echo "=== 清理完成 ==="