import os
from .sqlite_database import SQLiteDatabase
from .postgresql_database import PostgreSQLDatabase

def create_database():
    """智能创建数据库实例"""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url and database_url.startswith('postgresql://'):
        print("🚀 使用 PostgreSQL 数据库 (生产环境)")
        try:
            return PostgreSQLDatabase(database_url)
        except Exception as e:
            print(f"❌ PostgreSQL 连接失败，回退到 SQLite: {e}")
            return SQLiteDatabase()
    else:
        print("💻 使用 SQLite 数据库 (开发环境)")
        return SQLiteDatabase()

# 创建全局数据库实例
db = create_database()