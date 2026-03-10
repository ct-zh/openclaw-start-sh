"""
Web Hosting Skill - Flask 应用
处理动态页面和文件上传
"""

import os
import json
import time
import hashlib
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string
from werkzeug.utils import secure_filename

app = Flask(__name__)

# 配置
TOKENS_FILE = os.environ.get('TOKENS_FILE', '/app/webroot/tokens.json')
UPLOAD_DIR = '/app/webroot/uploads'
ROUTES_DIR = '/app/routes'
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'csv'}

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ROUTES_DIR, exist_ok=True)


def load_tokens():
    """加载 tokens 数据"""
    try:
        with open(TOKENS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'tokens': {}}


def save_tokens(data):
    """保存 tokens 数据"""
    with open(TOKENS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def validate_request(token, ts):
    """验证请求是否有效"""
    if not token or not ts:
        return False
    
    try:
        ts = int(ts)
    except (TypeError, ValueError):
        return False
    
    # 检查时间戳是否过期（1小时）
    if time.time() - ts > 3600:
        return False
    
    # 检查 token 是否有效
    tokens_data = load_tokens()
    for path, data in tokens_data.get('tokens', {}).items():
        if data.get('token') == token:
            # 检查过期时间
            if data.get('expire', 0) > time.time():
                return True
    
    return False


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    """文件上传处理"""
    if request.method == 'GET':
        return jsonify({'status': 'ok', 'message': 'Upload endpoint ready'}), 200
    
    # 验证 token
    token = request.args.get('token', '')
    ts = request.args.get('ts', '0')
    
    if not validate_request(token, ts):
        return jsonify({'error': '链接已过期或无效'}), 403
    
    # 检查文件
    if 'file' not in request.files:
        return jsonify({'error': '没有选择文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件类型'}), 400
    
    # 检查文件大小
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': '文件大小超过限制 (最大 10MB)'}), 400
    
    # 生成上传 ID
    upload_id = request.form.get('upload_id', datetime.now().strftime('%Y%m%d_%H%M%S'))
    upload_dir = os.path.join(UPLOAD_DIR, upload_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # 保存文件
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{filename}"
    filepath = os.path.join(upload_dir, unique_filename)
    file.save(filepath)
    
    return jsonify({
        'status': 'success',
        'filename': unique_filename,
        'upload_id': upload_id,
        'size': file_size
    })


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok'}), 200


@app.route('/api/info', methods=['GET'])
def info():
    """API 信息"""
    return jsonify({
        'name': 'OpenClaw Web Hosting',
        'version': '1.0.0',
        'endpoints': {
            'upload': '/api/upload',
            'health': '/health'
        }
    })


# 动态加载用户定义的路由
def load_user_routes():
    """加载用户创建的动态路由"""
    if not os.path.exists(ROUTES_DIR):
        return
    
    for filename in os.listdir(ROUTES_DIR):
        if filename.endswith('.py'):
            filepath = os.path.join(ROUTES_DIR, filename)
            try:
                with open(filepath, 'r') as f:
                    code = f.read()
                # 这里可以安全地执行用户代码
                # 注意：实际生产环境需要更严格的安全控制
                exec_globals = {'Blueprint': Blueprint, 'request': request, 'jsonify': jsonify}
                exec(code, exec_globals)
                if 'bp' in exec_globals:
                    app.register_blueprint(exec_globals['bp'])
            except Exception as e:
                print(f"Error loading route {filename}: {e}")


if __name__ == '__main__':
    load_user_routes()
    app.run(host='0.0.0.0', port=5000, debug=False)