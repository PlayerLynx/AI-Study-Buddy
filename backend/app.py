from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
import json
import time
from database import db
from github_ai_service import github_ai_service

app = Flask(__name__)
CORS(app)

# 配置
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['JSON_AS_ASCII'] = False  # 支持中文

@app.before_request
def before_request():
    """记录请求日志"""
    g.start_time = time.time()

@app.after_request
def after_request(response):
    """记录响应日志"""
    if hasattr(g, 'start_time'):
        duration = time.time() - g.start_time
        print(f"[{time.strftime('%H:%M:%S')}] {request.method} {request.path} - {response.status_code} - {duration:.2f}s")
    return response

# ========== 健康检查 ==========
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "AI学习搭子 Flask版",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/')
def home():
    return jsonify({
        "message": "AI学习搭子 Flask版服务运行正常",
        "version": "2.3.0",
        "features": ["用户管理", "智能对话", "学习目标管理", "学习进度跟踪"]
    })

# ========== 用户认证 ==========
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    print(f"登录尝试: {username}")
    
    if not username or not password:
        return jsonify({"success": False, "error": "用户名和密码不能为空"}), 400
    
    user = db.verify_user(username, password)
    if user:
        print(f"登录成功: {username}")
        return jsonify({
            "success": True,
            "message": "登录成功",
            "user": user
        })
    else:
        return jsonify({"success": False, "error": "用户名或密码错误"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"success": False, "error": "用户名和密码不能为空"}), 400
    
    user_id = db.create_user(username, password)
    if user_id:
        return jsonify({
            "success": True,
            "message": "注册成功",
            "user_id": user_id
        })
    else:
        return jsonify({"success": False, "error": "用户名已存在"}), 400

# ========== AI聊天 ==========
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_id = data.get('user_id')
    message = data.get('message', '').strip()
    
    if not user_id or not message:
        return jsonify({"success": False, "error": "参数不完整"}), 400
    
    print(f"💬 用户消息: {message}")
    
    # 使用GitHub AI服务生成回复
    ai_response = github_ai_service.generate_response(message)
    
    # 保存到数据库
    db.add_chat_message(user_id, message, ai_response)
    
    # 获取更新后的聊天记录
    history = db.get_chat_history(user_id)
    
    return jsonify({
        "success": True,
        "response": ai_response,
        "history": history
    })

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """获取用户聊天历史"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"success": False, "error": "用户ID不能为空"}), 400
    
    try:
        history = db.get_chat_history(user_id)
        return jsonify({
            "success": True,
            "history": history
        })
    except Exception as e:
        print(f"获取聊天历史失败: {e}")
        return jsonify({"success": False, "error": "获取聊天历史失败"}), 500
    
# ========== 学习目标管理 ==========
@app.route('/api/goals', methods=['GET', 'POST'])
def handle_goals():
    if request.method == 'GET':
        return get_goals()
    else:
        return create_goal()

def get_goals():
    """获取用户的学习目标"""
    user_id = request.args.get('user_id')
    status = request.args.get('status')
    
    if not user_id:
        return jsonify({"success": False, "error": "用户ID不能为空"}), 400
    
    goals = db.get_user_goals(user_id, status)
    return jsonify({
        "success": True,
        "goals": goals
    })

def create_goal():
    """创建学习目标"""
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', 'general')
    priority = data.get('priority', 2)
    target_date = data.get('target_date')
    
    if not user_id or not title:
        return jsonify({"success": False, "error": "用户ID和目标标题不能为空"}), 400
    
    goal_id = db.create_learning_goal(user_id, title, description, category, priority, target_date)
    
    if goal_id:
        return jsonify({
            "success": True,
            "message": "学习目标创建成功",
            "goal_id": goal_id
        })
    else:
        return jsonify({"success": False, "error": "创建学习目标失败"}), 400

@app.route('/api/goals/progress', methods=['GET'])
def get_goals_progress():
    """获取目标进度统计"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"success": False, "error": "用户ID不能为空"}), 400
    
    progress = db.get_goal_progress(user_id)
    return jsonify({
        "success": True,
        "progress": progress
    })

@app.route('/api/goals/status', methods=['PUT'])
def update_goal_status():
    """更新目标状态"""
    data = request.get_json()
    goal_id = data.get('goal_id')
    status = data.get('status')
    
    if not goal_id or not status:
        return jsonify({"success": False, "error": "目标ID和状态不能为空"}), 400
    
    success = db.update_goal_status(goal_id, status)
    if success:
        return jsonify({
            "success": True,
            "message": "目标状态更新成功"
        })
    else:
        return jsonify({"success": False, "error": "更新目标状态失败"}), 400

@app.route('/api/goals', methods=['DELETE'])
def delete_goal():
    """删除学习目标"""
    goal_id = request.args.get('goal_id')
    
    if not goal_id:
        return jsonify({"success": False, "error": "目标ID不能为空"}), 400
    
    success = db.delete_goal(goal_id)
    if success:
        return jsonify({
            "success": True,
            "message": "学习目标删除成功"
        })
    else:
        return jsonify({"success": False, "error": "删除学习目标失败"}), 400

# ========== 学习记录管理 ==========
@app.route('/api/study/session', methods=['POST'])
def add_study_session():
    """添加学习记录"""
    data = request.get_json()
    user_id = data.get('user_id')
    subject = data.get('subject', '').strip()
    duration_minutes = data.get('duration_minutes', 0)
    goal_id = data.get('goal_id')
    notes = data.get('notes', '').strip()
    
    if not user_id or not subject or duration_minutes <= 0:
        return jsonify({"success": False, "error": "参数不完整或无效"}), 400
    
    session_id = db.add_study_session(user_id, subject, duration_minutes, goal_id, notes)
    
    if session_id:
        return jsonify({
            "success": True,
            "message": "学习记录添加成功",
            "session_id": session_id
        })
    else:
        return jsonify({"success": False, "error": "添加学习记录失败"}), 400

@app.route('/api/study/sessions', methods=['GET'])
def get_study_sessions():
    """获取学习记录"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"success": False, "error": "用户ID不能为空"}), 400
    
    sessions = db.get_study_sessions(user_id)
    return jsonify({
        "success": True,
        "sessions": sessions
    })

@app.route('/api/study/statistics', methods=['GET'])
def get_study_statistics():
    """获取学习统计"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"success": False, "error": "用户ID不能为空"}), 400
    
    stats = db.get_study_statistics(user_id)
    return jsonify({
        "success": True,
        "statistics": stats
    })

# ========== 错误处理 ==========
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "接口不存在"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "服务器内部错误"}), 500

# ========== 启动应用 ==========
def run_flask_app():
    port = 5000
    
    print("=" * 60)
    print("🚀 AI学习搭子 v2.3 - Flask迁移版")
    print(f"📍 服务地址: http://localhost:{port}")
    print("🤖 AI功能: GitHub Models API")
    print("💡 提示: 请在 .env 文件中配置 GITHUB_PAT")
    print("=" * 60)
    
    # 检查AI服务状态
    if github_ai_service.github_pat:
        print("✅ GitHub PAT: 已配置")
        print("🔗 API端点: https://models.github.ai/inference/chat/completions")
    else:
        print("⚠️ GitHub PAT: 未配置 (运行在模拟模式)")
    
    print("✅ Flask服务启动成功！")
    print("💡 提示: 按 Ctrl+C 停止服务")

if __name__ == '__main__':
    run_flask_app()
    app.run(debug=True, host='0.0.0.0', port=5000)