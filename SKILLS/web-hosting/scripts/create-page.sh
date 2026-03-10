#!/bin/bash
# Web Hosting Skill - 创建页面
# 用法: create-page.sh <static|dynamic|upload> <内容或标题> [自定义路径]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WEBROOT="$SKILL_DIR/webroot"
PORT="${WEB_PORT:-8888}"

# 获取公网 IP
get_public_ip() {
    curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || \
    curl -s --connect-timeout 5 ip.sb 2>/dev/null || \
    curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || \
    echo "127.0.0.1"
}

# 生成 token
generate_token() {
    openssl rand -hex 16
}

# 获取时间戳
get_timestamp() {
    date +%s
}

# 计算过期时间戳
get_expire_timestamp() {
    echo $(($(date +%s) + 3600))  # 1小时后过期
}

# 保存 token 到 tokens.json
save_token() {
    local path="$1"
    local token="$2"
    local expire="$3"
    
    local tmp_file=$(mktemp)
    cd "$WEBROOT"
    if [ -f "tokens.json" ]; then
        # 使用 jq 更新 JSON
        jq --arg path "$path" --arg token "$token" --argjson expire "$expire" \
            '.tokens[$path] = {"token": $token, "expire": $expire}' \
            tokens.json > "$tmp_file" && mv "$tmp_file" tokens.json
    else
        echo "{\"tokens\":{\"$path\":{\"token\":\"$token\",\"expire\":$expire}}}" > tokens.json
    fi
}

# 创建静态页面
create_static_page() {
    local content="$1"
    local custom_name="${2:-}"
    
    # 生成文件名
    if [ -n "$custom_name" ]; then
        local filename="${custom_name%.html}.html"
    else
        local filename="page_$(date +%Y%m%d_%H%M%S).html"
    fi
    
    local filepath="$WEBROOT/static/$filename"
    
    # 写入内容
    echo "$content" > "$filepath"
    
    # 生成安全参数
    local token=$(generate_token)
    local ts=$(get_timestamp)
    local expire=$(get_expire_timestamp)
    
    # 保存 token
    save_token "static/$filename" "$token" "$expire"
    
    # 返回 URL
    local public_ip=$(get_public_ip)
    local url="http://${public_ip}:${PORT}/${filename}?token=${token}&ts=${ts}"
    
    echo "✅ 静态页面创建成功"
    echo "URL: $url"
    echo "过期时间: 1小时"
    echo "文件: $filepath"
}

# 创建动态页面（Flask 路由）
create_dynamic_page() {
    local code="$1"
    local route_path="${2:-/dynamic}"
    
    # 规范化路由路径
    route_path="${route_path#/}"
    local route_name=$(echo "$route_path" | tr '/' '_')
    local filename="${route_name}.py"
    local filepath="$WEBROOT/dynamic/routes/$filename"
    
    # 写入代码
    cat > "$filepath" << EOF
# Auto-generated Flask route
# Created at: $(date)

from flask import Blueprint, request, jsonify, render_template_string
import time

bp = Blueprint('$route_name', __name__)

@bp.route('/$route_path', methods=['GET', 'POST'])
def handler():
    # 安全验证
    token = request.args.get('token', '')
    ts = request.args.get('ts', '0')
    
    if not validate_request(token, int(ts)):
        return '链接已过期或无效', 403
    
    # 用户代码
    $code
EOF
    
    # 生成安全参数
    local token=$(generate_token)
    local ts=$(get_timestamp)
    local expire=$(get_expire_timestamp)
    
    # 保存 token
    save_token "dynamic/$route_path" "$token" "$expire"
    
    # 返回 URL
    local public_ip=$(get_public_ip)
    local url="http://${public_ip}:${PORT}/api/${route_path}?token=${token}&ts=${ts}"
    
    echo "✅ 动态页面创建成功"
    echo "URL: $url"
    echo "过期时间: 1小时"
    echo "文件: $filepath"
}

# 创建上传页面
create_upload_page() {
    local title="${1:-文件上传}"
    local custom_name="${2:-upload}"
    
    local filename="${custom_name}.html"
    local filepath="$WEBROOT/static/$filename"
    
    # 生成 token
    local token=$(generate_token)
    local ts=$(get_timestamp)
    local expire=$(get_expire_timestamp)
    local upload_id="upload_$(date +%Y%m%d_%H%M%S)_$(openssl rand -hex 4)"
    
    # 从模板创建上传页面
    cat > "$filepath" << HTMLEOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>$title</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); max-width: 500px; width: 100%; }
        h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
        .info { color: #666; margin-bottom: 20px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
        .file-input { width: 100%; padding: 12px; border: 2px dashed #ddd; border-radius: 8px; cursor: pointer; text-align: center; transition: border-color 0.2s; }
        .file-input:hover { border-color: #4a90d9; }
        .file-input input { display: none; }
        .file-input-text { color: #666; }
        .btn { width: 100%; padding: 14px; background: #4a90d9; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .btn:hover { background: #3a7bc8; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .status { margin-top: 20px; padding: 12px; border-radius: 8px; display: none; }
        .status.success { background: #d4edda; color: #155724; display: block; }
        .status.error { background: #f8d7da; color: #721c24; display: block; }
        .warning { background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📤 $title</h1>
        <div class="warning">⚠️ 此链接将在 1 小时后失效</div>
        <div class="info">上传 ID: $upload_id</div>
        
        <form id="uploadForm">
            <div class="form-group">
                <label>选择文件</label>
                <div class="file-input" onclick="document.getElementById('fileInput').click()">
                    <input type="file" id="fileInput" name="file" onchange="updateFileName()">
                    <span class="file-input-text" id="fileText">点击选择文件或拖放文件到此处</span>
                </div>
            </div>
            <button type="submit" class="btn" id="submitBtn" disabled>上传文件</button>
        </form>
        
        <div id="status" class="status"></div>
    </div>

    <script>
        const uploadId = '$upload_id';
        const token = '$token';
        
        function updateFileName() {
            const input = document.getElementById('fileInput');
            const text = document.getElementById('fileText');
            const btn = document.getElementById('submitBtn');
            
            if (input.files.length > 0) {
                text.textContent = input.files[0].name + ' (' + formatSize(input.files[0].size) + ')';
                btn.disabled = false;
            } else {
                text.textContent = '点击选择文件或拖放文件到此处';
                btn.disabled = true;
            }
        }
        
        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const input = document.getElementById('fileInput');
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('status');
            
            if (!input.files.length) return;
            
            btn.disabled = true;
            btn.textContent = '上传中...';
            status.className = 'status';
            status.textContent = '';
            
            const formData = new FormData();
            formData.append('file', input.files[0]);
            formData.append('upload_id', uploadId);
            
            try {
                const response = await fetch('/api/upload?token=' + token, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    status.className = 'status success';
                    status.textContent = '✅ 上传成功！文件已保存。';
                } else {
                    status.className = 'status error';
                    status.textContent = '❌ 上传失败: ' + (result.error || '未知错误');
                }
            } catch (err) {
                status.className = 'status error';
                status.textContent = '❌ 上传失败: ' + err.message;
            }
            
            btn.disabled = false;
            btn.textContent = '上传文件';
        });
    </script>
</body>
</html>
HTMLEOF
    
    # 保存 token
    save_token "static/$filename" "$token" "$expire"
    
    # 返回 URL
    local public_ip=$(get_public_ip)
    local url="http://${public_ip}:${PORT}/${filename}?token=${token}&ts=${ts}"
    
    echo "✅ 上传页面创建成功"
    echo "URL: $url"
    echo "过期时间: 1小时"
    echo "上传目录: $WEBROOT/uploads/$upload_id/"
    echo "文件: $filepath"
}

# 主逻辑
case "$1" in
    static)
        create_static_page "$2" "$3"
        ;;
    dynamic)
        create_dynamic_page "$2" "$3"
        ;;
    upload)
        create_upload_page "$2" "$3"
        ;;
    *)
        echo "用法: $0 <static|dynamic|upload> <内容或标题> [自定义路径]"
        echo ""
        echo "示例:"
        echo "  $0 static '<h1>Hello</h1>' hello"
        echo "  $0 dynamic 'return jsonify({\"msg\": \"hello\"})' myapi"
        echo "  $0 upload '上传您的文件' myupload"
        exit 1
        ;;
esac