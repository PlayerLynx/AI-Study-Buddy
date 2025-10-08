# database/postgresql_database.py
import os
import psycopg2
from urllib.parse import urlparse
from .base_database import BaseDatabase

class PostgreSQLDatabase(BaseDatabase):
    def __init__(self, database_url):
        self.database_url = database_url
        self.connection = self.create_connection()
        self.init_database()
    
    def create_connection(self):
        """创建PostgreSQL连接 - 无需本地安装"""
        try:
            result = urlparse(self.database_url)
            
            conn = psycopg2.connect(
                database=result.path[1:],  # 去掉开头的/
                user=result.username,
                password=result.password,
                host=result.hostname,
                port=result.port,
                sslmode='require'  # Railway需要SSL
            )
            conn.autocommit = False
            print("✅ PostgreSQL 连接成功")
            return conn
        except Exception as e:
            print(f"❌ PostgreSQL 连接失败: {e}")
            raise
    
    def init_database(self):
        """初始化PostgreSQL表"""
        try:
            cursor = self.connection.cursor()
            
            # 用户表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 聊天记录表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    user_message TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 学习目标表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_goals (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    category VARCHAR(50) DEFAULT 'general',
                    priority INTEGER DEFAULT 2,
                    status VARCHAR(20) DEFAULT 'active',
                    target_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 学习记录表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS study_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    goal_id INTEGER REFERENCES learning_goals(id) ON DELETE SET NULL,
                    subject VARCHAR(100) NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    notes TEXT,
                    session_date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 创建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_goals_user ON learning_goals(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON study_sessions(user_id, session_date)')
            
            self.connection.commit()
            cursor.close()
            print("✅ PostgreSQL 表初始化完成")
            
        except Exception as e:
            print(f"❌ PostgreSQL 表初始化失败: {e}")
            self.connection.rollback()
    
    def execute_query(self, query, params=None, fetch=True):
        """执行查询的辅助方法"""
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, params)
            if fetch:
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return results
                else:
                    self.connection.commit()
                    return cursor.rowcount
            else:
                self.connection.commit()
                return None
        except Exception as e:
            self.connection.rollback()
            raise e
        finally:
            cursor.close()
    
    def create_user(self, username, password):
        try:
            password_hash = self.hash_password(password)
            cursor = self.connection.cursor()
            cursor.execute(
                'INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id',
                (username, password_hash)
            )
            user_id = cursor.fetchone()[0]
            self.connection.commit()
            return user_id
        except Exception as e:
            if "unique constraint" in str(e).lower():
                return None  # 用户名已存在
            raise e
        finally:
            cursor.close()
    
    def verify_user(self, username, password):
        password_hash = self.hash_password(password)
        results = self.execute_query(
            'SELECT id, username FROM users WHERE username = %s AND password_hash = %s',
            (username, password_hash)
        )
        return results[0] if results else None
    
    def add_chat_message(self, user_id, user_message, ai_response):
        self.execute_query(
            'INSERT INTO chat_history (user_id, user_message, ai_response) VALUES (%s, %s, %s)',
            (user_id, user_message, ai_response),
            fetch=False
        )
    
    def get_chat_history(self, user_id, limit=10):
        results = self.execute_query(
            '''SELECT user_message, ai_response, timestamp 
               FROM chat_history 
               WHERE user_id = %s 
               ORDER BY timestamp DESC LIMIT %s''',
            (user_id, limit)
        )
        return results[::-1]  # 反转顺序
    
    def create_learning_goal(self, user_id, title, description="", category="general", priority=2, target_date=None):
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                '''INSERT INTO learning_goals 
                   (user_id, title, description, category, priority, target_date) 
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id''',
                (user_id, title, description, category, priority, target_date)
            )
            goal_id = cursor.fetchone()[0]
            self.connection.commit()
            return goal_id
        finally:
            cursor.close()
    
    def get_user_goals(self, user_id, status=None):
        if status:
            return self.execute_query(
                '''SELECT * FROM learning_goals 
                   WHERE user_id = %s AND status = %s 
                   ORDER BY priority DESC, created_at DESC''',
                (user_id, status)
            )
        else:
            return self.execute_query(
                '''SELECT * FROM learning_goals 
                   WHERE user_id = %s 
                   ORDER BY priority DESC, created_at DESC''',
                (user_id,)
            )
    
    def update_goal_status(self, goal_id, status):
        try:
            self.execute_query(
                'UPDATE learning_goals SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s',
                (status, goal_id),
                fetch=False
            )
            return True
        except:
            return False
    
    def delete_goal(self, goal_id):
        try:
            self.execute_query('DELETE FROM learning_goals WHERE id = %s', (goal_id,), fetch=False)
            return True
        except:
            return False
    
    def get_goal_progress(self, user_id):
        results = self.execute_query('''
            SELECT 
                COUNT(*) as total_goals,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals
            FROM learning_goals 
            WHERE user_id = %s
        ''', (user_id,))
        return results[0] if results else {"total_goals": 0, "completed_goals": 0, "active_goals": 0}
    
    def add_study_session(self, user_id, subject, duration_minutes, goal_id=None, notes=""):
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                '''INSERT INTO study_sessions 
                   (user_id, goal_id, subject, duration_minutes, notes) 
                   VALUES (%s, %s, %s, %s, %s) RETURNING id''',
                (user_id, goal_id, subject, duration_minutes, notes)
            )
            session_id = cursor.fetchone()[0]
            self.connection.commit()
            return session_id
        finally:
            cursor.close()
    
    def get_study_sessions(self, user_id, days=7):
        return self.execute_query(
            '''SELECT * FROM study_sessions 
               WHERE user_id = %s AND session_date >= CURRENT_DATE - INTERVAL '%s days'
               ORDER BY session_date DESC, created_at DESC''',
            (user_id, days)
        )
    
    def get_study_statistics(self, user_id, days=30):
        total_result = self.execute_query(
            '''SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes 
               FROM study_sessions 
               WHERE user_id = %s AND session_date >= CURRENT_DATE - INTERVAL '%s days''',
            (user_id, days)
        )
        
        subject_results = self.execute_query(
            '''SELECT subject, SUM(duration_minutes) as total_minutes 
               FROM study_sessions 
               WHERE user_id = %s AND session_date >= CURRENT_DATE - INTERVAL '%s days'
               GROUP BY subject 
               ORDER BY total_minutes DESC''',
            (user_id, days)
        )
        
        return {
            "total_minutes": total_result[0]["total_minutes"] if total_result else 0,
            "subject_breakdown": subject_results
        }