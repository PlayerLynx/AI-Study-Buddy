from abc import ABC, abstractmethod
import hashlib

class BaseDatabase(ABC):
    """数据库抽象基类"""
    
    def hash_password(self, password):
        """统一的密码哈希方法"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @abstractmethod
    def create_connection(self):
        pass
    
    @abstractmethod
    def init_database(self):
        pass
    
    @abstractmethod
    def create_user(self, username, password):
        pass
    
    @abstractmethod
    def verify_user(self, username, password):
        pass
    
    @abstractmethod
    def add_chat_message(self, user_id, user_message, ai_response):
        pass
    
    @abstractmethod
    def get_chat_history(self, user_id, limit=10):
        pass
    
    @abstractmethod
    def create_learning_goal(self, user_id, title, description, category, priority, target_date):
        pass
    
    @abstractmethod
    def get_user_goals(self, user_id, status=None):
        pass
    
    @abstractmethod
    def update_goal_status(self, goal_id, status):
        pass
    
    @abstractmethod
    def delete_goal(self, goal_id):
        pass
    
    @abstractmethod
    def get_goal_progress(self, user_id):
        pass
    
    @abstractmethod
    def add_study_session(self, user_id, subject, duration_minutes, goal_id, notes):
        pass
    
    @abstractmethod
    def get_study_sessions(self, user_id, days=7):
        pass
    
    @abstractmethod
    def get_study_statistics(self, user_id, days=30):
        pass