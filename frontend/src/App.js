import React, { useState, useEffect, useRef} from 'react';
import { Layout, Menu, Button, message, Form, Tabs, Avatar } from 'antd';
import { 
  UserOutlined, 
  MessageOutlined, 
  BookOutlined, 
  BarChartOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import axios from 'axios';
import GoalManager from './components/GoalManager';
import StudyTracker from './components/StudyTracker';
import Statistics from './components/Statistics';
import './App.css';

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;

const API_BASE = process.env.NODE_ENV === 'production' 
  ? `${window.location.origin}/api` 
  : 'http://localhost:5000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeTab, setActiveTab] = useState('chat');
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTabChange = async (key) => {
    setActiveTab(key);
    
    // 当切换到学习记录页面时，刷新目标列表
    if (key === 'study' && currentUser) {
      await loadGoals(currentUser.id);
    }
  };

  // 当聊天记录更新时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    checkBackend();
    
    // 如果已有登录用户，加载其数据
    if (currentUser) {
      loadChatHistory(currentUser.id);
      loadGoals(currentUser.id);
    }
  }, [currentUser]); // 添加currentUser作为依赖

  const checkBackend = async () => {
    try {
      await axios.get(`${API_BASE}/health`);
      console.log('后端服务连接正常');
    } catch (error) {
      message.error('后端服务连接失败');
    }
  };

  // 加载用户目标
  const loadGoals = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE}/goals?user_id=${userId}`);
      if (response.data.success) {
        setGoals(response.data.goals);
      }
    } catch (error) {
      console.error('加载目标失败:', error);
    }
  };

  const handleLogin = async (values) => {
    try {
      const response = await axios.post(`${API_BASE}/login`, values);
      if (response.data.success) {
         const user = response.data.user;
        setCurrentUser(user);
        // 保存到localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        message.success('登录成功！');
        await loadChatHistory(response.data.user.id);
        await loadGoals(response.data.user.id);
      }
    } catch (error) {
      message.error(error.response?.data?.error || '登录失败');
    }
  };

  const handleRegister = async (values) => {
    try {
      const response = await axios.post(`${API_BASE}/register`, values);
      if (response.data.success) {
        message.success('注册成功，请登录');
      }
    } catch (error) {
      message.error(error.response?.data?.error || '注册失败');
    }
  };

  const loadChatHistory = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE}/chat/history?user_id=${userId}`);
      if (response.data.success) {
        setChatHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) {
      message.warning('请输入消息');
      return;
    }

    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        user_id: currentUser.id,
        message: messageInput
      });

      if (response.data.success) {
        setChatHistory(response.data.history);
        setMessageInput('');
      }
    } catch (error) {
      message.error('发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setChatHistory([]);
    setGoals([]);
    setActiveTab('chat');
    localStorage.removeItem('currentUser');
    message.success('已退出登录');
  };

  // 登录界面
  if (!currentUser) {
    return (
      <Layout className="layout">
        <Content className="content">
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <h1>🤖 AI学习搭子</h1>
                <p>你的智能学习伴侣</p>
              </div>
              
              <Tabs defaultActiveKey="login" centered>
                <TabPane tab="登录" key="login">
                  <Form onFinish={handleLogin} layout="vertical">
                    <Form.Item 
                      name="username" 
                      rules={[{ required: true, message: '请输入用户名' }]}
                    >
                      <input placeholder="用户名" className="login-input" />
                    </Form.Item>
                    <Form.Item 
                      name="password" 
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <input type="password" placeholder="密码" className="login-input" />
                    </Form.Item>
                    <button type="submit" className="login-button">
                      登录
                    </button>
                  </Form>
                  <div className="demo-info">
                    <strong>演示账号:</strong> demo / demo123
                  </div>
                </TabPane>
                
                <TabPane tab="注册" key="register">
                  <Form onFinish={handleRegister} layout="vertical">
                    <Form.Item 
                      name="username" 
                      rules={[{ required: true, message: '请输入用户名' }]}
                    >
                      <input placeholder="用户名" className="login-input" />
                    </Form.Item>
                    <Form.Item 
                      name="password" 
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <input type="password" placeholder="密码" className="login-input" />
                    </Form.Item>
                    <button type="submit" className="login-button">
                      注册
                    </button>
                  </Form>
                </TabPane>
              </Tabs>
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  // 主应用界面
  return (
    <Layout className="layout">
      <Header className="header">
        <div className="header-content">
          <div className="app-title">
            <h1>🤖 AI学习搭子</h1>
            <span className="app-subtitle">智能学习伴侣</span>
          </div>
          
          <div className="user-info">
            <Avatar icon={<UserOutlined />} />
            <span style={{ margin: '0 10px' }}>{currentUser.username}</span>
            <Button 
              size="small" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              退出
            </Button>
          </div>
        </div>
      </Header>
      
      <Layout>
        <Sider width={200} className="sider">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'chat',
                icon: <MessageOutlined />,
                label: '智能对话',
              },
              {
                key: 'goals',
                icon: <BookOutlined />,
                label: '学习目标',
              },
              {
                key: 'study',
                icon: <BarChartOutlined />,
                label: '学习记录',
              },
              {
                key: 'stats',
                icon: <BarChartOutlined />,
                label: '学习统计',
              },
            ]}
            onClick={({ key }) => handleTabChange(key)}
          />
        </Sider>
        
        <Content className="content">
          <div className="main-content">
            {activeTab === 'chat' && (
              <div className="chat-container">
                <div className="chat-messages">
                  {chatHistory.length === 0 ? (
                    <div className="empty-chat">
                      <div>💬 开始与AI学习搭子对话吧！</div>
                      <div className="chat-tips">
                        试试询问：学习建议、目标制定、学科问题...
                      </div>
                    </div>
                  ) : (
                    <>
                    {chatHistory.map((chat, index) => (
                      <div key={index} className="message-pair">
                        <div className="user-message">
                          <div className="message-avatar">👤</div>
                          <div className="message-content">
                            <div className="message-sender">你</div>
                            <div className="message-text">{chat.user_message}</div>
                          </div>
                        </div>
                        <div className="ai-response">
                          <div className="message-avatar">🤖</div>
                          <div className="message-content">
                            <div className="message-sender">AI学习搭子</div>
                            <div className="message-text">{chat.ai_response}</div>
                            <div className="message-time">{chat.timestamp}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                <div className="chat-input-container">
                  <textarea
                    className="chat-input"
                    rows={3}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入你的问题或想法... (按Enter发送)"
                    disabled={loading}
                  />
                  <button 
                    className="send-button"
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || loading}
                  >
                    {loading ? '发送中...' : '发送消息'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <GoalManager currentUser={currentUser} 
                onGoalsUpdate={loadGoals}
              />
            )}

            {activeTab === 'study' && (
              <StudyTracker currentUser={currentUser} goals={goals} />
            )}

            {activeTab === 'stats' && (
              <Statistics currentUser={currentUser} />
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;