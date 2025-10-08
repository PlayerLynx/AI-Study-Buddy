import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, List, Select, InputNumber, message } from 'antd';
import { ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const StudyTracker = ({ currentUser, goals }) => {
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [form] = Form.useForm();
  const [availableGoals, setAvailableGoals] = useState([]);


  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    setAvailableGoals(goals.filter(goal => goal.status === 'active'));
  }, [goals]);

  // 常用科目选项
  const subjects = ['数学', '编程', '英语', '物理', '化学', '历史', '语文', '其他'];

  // 加载学习记录
  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/study/sessions?user_id=${currentUser.id}`);
      if (response.data.success) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('加载学习记录失败:', error);
    }
  };

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/study/statistics?user_id=${currentUser.id}`);
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSessions();
      loadStatistics();
    }
  }, [currentUser]);

  // 添加学习记录
  const addStudySession = async (values) => {
    try {
      const response = await axios.post(`${API_BASE}/study/session`, {
        user_id: currentUser.id,
        ...values
      });

      if (response.data.success) {
        message.success('学习记录添加成功！');
        form.resetFields();
        loadSessions();
        loadStatistics();
      }
    } catch (error) {
      message.error('添加学习记录失败');
    }
  };

  // 格式化学习时间
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  // 计算总学习时间
  const totalStudyTime = sessions.reduce((total, session) => total + session.duration_minutes, 0);

  return (
    <div className="study-tracker">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 学习统计 */}
        <Card title="📈 学习统计">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff', marginBottom: 8 }}>
              {formatDuration(totalStudyTime)}
            </div>
            <div>总学习时间</div>
          </div>
          
          {statistics.subject_breakdown && statistics.subject_breakdown.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>科目分布:</div>
              {statistics.subject_breakdown.map((subject, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontSize: 12
                }}>
                  <span>{subject.subject}</span>
                  <span>{formatDuration(subject.total_minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 添加学习记录 */}
        <Card title="➕ 添加学习记录">
          <Form
            form={form}
            layout="vertical"
            onFinish={addStudySession}
          >
            <Form.Item
              name="subject"
              label="学习科目"
              rules={[{ required: true, message: '请选择学习科目' }]}
            >
              <Select placeholder="选择学习科目">
                {subjects.map(subject => (
                  <Option key={subject} value={subject}>{subject}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="duration_minutes"
              label="学习时长（分钟）"
              rules={[{ required: true, message: '请输入学习时长' }]}
            >
              <InputNumber 
                min={1} 
                max={480} 
                style={{ width: '100%' }}
                placeholder="例如：60"
              />
            </Form.Item>

            <Form.Item name="goal_id" label="关联目标（可选）">
              <Select placeholder="选择关联的学习目标">
                 {availableGoals.map(goal => (
                  <Option key={goal.id} value={goal.id}>
                    {goal.title}
                  </Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="学习笔记">
              <TextArea 
                rows={2}
                placeholder="记录学习内容、收获或难点..."
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block icon={<BookOutlined />}>
                保存学习记录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* 学习记录列表 */}
      <Card title="📝 最近学习记录">
        <List
          dataSource={sessions.slice(0, 10)} // 只显示最近10条
          locale={{ emptyText: '还没有学习记录，开始记录你的学习吧！' }}
          renderItem={(session) => (
            <List.Item>
              <List.Item.Meta
                avatar={<ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                title={
                  <div>
                    <span style={{ marginRight: 8 }}>{session.subject}</span>
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      {formatDuration(session.duration_minutes)}
                    </span>
                  </div>
                }
                description={
                  <div>
                    {session.notes && <div>{session.notes}</div>}
                    <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                      {new Date(session.session_date).toLocaleDateString()} • 
                      {new Date(session.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default StudyTracker;