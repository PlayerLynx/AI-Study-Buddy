import os
import requests
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class GitHubAIService:
    def __init__(self):
        self.github_pat = os.getenv('GITHUB_PAT')
        self.api_url = "https://models.github.ai/inference/chat/completions"
        self.fallback_responses = {
            "hello": "👋 你好！我是AI学习搭子，有什么学习问题我可以帮你吗？",
            "学习": "📚 学习需要方法！我可以帮你制定学习计划、解答问题、跟踪进度。",
            "数学": "🧮 数学学习建议：理解概念→练习→复习，建立错题本很重要！",
            "编程": "💻 编程学习：多写代码，做项目实践，阅读优秀源码。",
            "英语": "🔤 英语学习：每天坚持，多听多说，创造语言环境。",
            "计划": "🎯 告诉我你的学习目标，我来帮你制定个性化学习计划！",
            "帮助": "💡 我可以帮你：学习规划、问题解答、进度跟踪、情感支持"
        }
    
    def generate_response(self, user_message):
        """使用GitHub Models API生成回复"""
        
        # 如果没有配置GitHub PAT，使用备用回复
        if not self.github_pat:
            return self._get_fallback_response(user_message)
        
        try:
            # 构建系统提示词
            system_prompt = """你是一名亲切、专业的AI学习伙伴，名叫"学习搭子"。请根据用户需求选择语气回答。

你的核心能力：
1. 学习问题解答 - 专业准确地解答各学科问题
2. 学习计划制定 - 帮助制定个性化学习路径
3. 学习方法指导 - 提供高效学习方法和技巧
4. 情感支持 - 在学习遇到困难时给予鼓励

请保持回复专业、温暖、易于理解，适当使用emoji让对话更生动。"""
            
            # 准备请求数据
            payload = {
                "model": "openai/gpt-4o",  # 使用GPT-4o模型
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 800,
                "temperature": 0.7
            }
            
            # 设置请求头
            headers = {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.github_pat}",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json"
            }
            
            # 发送请求
            response = requests.post(
                self.api_url,
                headers=headers,
                data=json.dumps(payload),
                timeout=30  # 30秒超时
            )
            
            # 检查响应状态
            if response.status_code == 200:
                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    ai_content = result['choices'][0]['message']['content']
                    print(f"✅ AI回复生成成功: {len(ai_content)}字符")
                    return ai_content
                else:
                    print(f"❌ API响应格式异常: {result}")
                    return self._get_fallback_response(user_message)
            else:
                print(f"❌ API请求失败: {response.status_code} - {response.text}")
                return self._get_fallback_response(user_message)
                
        except requests.exceptions.Timeout:
            print("⏰ API请求超时")
            return self._get_fallback_response(user_message)
        except requests.exceptions.RequestException as e:
            print(f"🌐 网络请求错误: {e}")
            return self._get_fallback_response(user_message)
        except Exception as e:
            print(f"🤖 AI服务未知错误: {e}")
            return self._get_fallback_response(user_message)
    
    def _get_fallback_response(self, user_message):
        """备用回复逻辑"""
        message_lower = user_message.lower()
        
        for key in self.fallback_responses:
            if key in message_lower:
                if self.github_pat:
                    return f"{self.fallback_responses[key]}\n\n💡 提示：AI服务暂时不可用，这是备用回复"
                else:
                    return f"{self.fallback_responses[key]}\n\n💡 提示：请配置GITHUB_PAT环境变量获得完整AI功能"
        
        if self.github_pat:
            return f"""🤖 我理解你说的是："{user_message}"

由于AI服务暂时不可用，我无法提供详细回答。目前我可以：

📚 学习建议 • 🎯 目标规划 • 📊 进度跟踪

💡 请稍后重试或检查网络连接。"""
        else:
            return f"""🤖 我理解你说的是："{user_message}"

在完整AI模式下，我会详细解答你的问题。目前我可以：

📚 学习建议 • 🎯 目标规划 • 📊 进度跟踪

💡 如需更智能的对话，请在.env文件中配置GITHUB_PAT环境变量。"""

# 创建全局AI服务实例
github_ai_service = GitHubAIService()