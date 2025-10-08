import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, List, Tag, DatePicker, Select, message, Modal, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Option } = Select;

const GoalManager = ({ currentUser , onGoalsUpdate}) => {
  const [goals, setGoals] = useState([]);
  const [progress, setProgress] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm();

  const API_BASE = 'http://localhost:5000/api';

  const handleCreateGoal = async (values) => {
    try {
      const response = await axios.post(`${API_BASE}/goals`, {
        user_id: currentUser.id,
        ...values
      });
      
      if (response.data.success) {
        message.success('学习目标创建成功！');
        form.resetFields();
        
        // 调用父组件的回调函数更新目标列表
        if (onGoalsUpdate) {
          await onGoalsUpdate(currentUser.id);
        } else {
          // 如果没有回调，则直接重新加载
          await loadGoals();
        }
      }
    } catch (error) {
      message.error('创建学习目标失败');
    }
  };

  // 加载用户目标
  const loadGoals = async () => {
    try {
      const response = await axios.get(`${API_BASE}/goals?user_id=${currentUser.id}`);
      if (response.data.success) {
        setGoals(response.data.goals);
      }
    } catch (error) {
      message.error('加载目标失败');
    }
  };

  // 加载进度统计
  const loadProgress = async () => {
    try {
      const response = await axios.get(`${API_BASE}/goals/progress?user_id=${currentUser.id}`);
      if (response.data.success) {
        setProgress(response.data.progress);
      }
    } catch (error) {
      console.error('加载进度失败:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadGoals();
      loadProgress();
    }
  }, [currentUser]);

  // 创建学习目标
  const createGoal = async (values) => {
    try {
      const response = await axios.post(`${API_BASE}/goals`, {
        user_id: currentUser.id,
        ...values,
        target_date: values.target_date ? values.target_date.format('YYYY-MM-DD') : null
      });

      if (response.data.success) {
        message.success('学习目标创建成功！');
        setShowForm(false);
        form.resetFields();
        loadGoals();
        loadProgress();
      }
    } catch (error) {
      message.error('创建目标失败QAQ');
    }
  };

  // 更新目标状态
  const updateGoalStatus = async (goalId, status) => {
    try {
      const response = await axios.put(`${API_BASE}/goals/status`, {
        goal_id: goalId,
        status: status
      });

      if (response.data.success) {
        message.success('目标状态已更新');
        loadGoals();
        loadProgress();
      }
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  // 删除目标
  const deleteGoal = async (goalId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个学习目标吗？',
      onOk: async () => {
        try {
          const response = await axios.delete(`${API_BASE}/goals?goal_id=${goalId}`);
          if (response.data.success) {
            message.success('目标已删除');
            loadGoals();
            loadProgress();
          }
        } catch (error) {
          message.error('删除目标失败');
        }
      }
    });
  };

  // 获取优先级标签
  const getPriorityTag = (priority) => {
    const priorityMap = {
      1: { color: 'green', text: '低' },
      2: { color: 'orange', text: '中' },
      3: { color: 'red', text: '高' }
    };
    const info = priorityMap[priority] || priorityMap[2];
    return <Tag color={info.color}>{info.text}优先级</Tag>;
  };

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      active: { color: 'blue', text: '进行中' },
      completed: { color: 'green', text: '已完成' },
      cancelled: { color: 'red', text: '已取消' }
    };
    const info = statusMap[status] || statusMap.active;
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  return (
    <div className="goal-manager">
      {/* 进度统计 */}
      <Card title="📊 学习目标进度" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {progress.total_goals || 0}
            </div>
            <div>总目标</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {progress.completed_goals || 0}
            </div>
            <div>已完成</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
              {progress.active_goals || 0}
            </div>
            <div>进行中</div>
          </div>
        </div>
        
        {progress.total_goals > 0 && (
          <Progress 
            percent={Math.round(((progress.completed_goals || 0) / progress.total_goals) * 100)}
            style={{ marginTop: 16 }}
            status="active"
          />
        )}
      </Card>

      {/* 创建目标表单 */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🎯 学习目标管理</span>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '取消创建' : '新建目标'}
            </Button>
          </div>
        }
      >
        {showForm && (
          <Form
            form={form}
            layout="vertical"
            onFinish={createGoal}
            style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 6 }}
          >
            <Form.Item
              name="title"
              label="目标标题"
              rules={[{ required: true, message: '请输入目标标题' }]}
            >
              <Input placeholder="例如：通过高等数学期末考试" />
            </Form.Item>

            <Form.Item name="description" label="目标描述">
              <TextArea 
                rows={3} 
                placeholder="详细描述你的学习目标..." 
              />
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="category" label="分类" style={{ flex: 1 }}>
                <Select placeholder="选择分类">
                  <Option value="exam">考试准备</Option>
                  <Option value="skill">技能学习</Option>
                  <Option value="language">语言学习</Option>
                  <Option value="career">职业发展</Option>
                  <Option value="general">通用学习</Option>
                </Select>
              </Form.Item>

              <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
                <Select placeholder="选择优先级" defaultValue={2}>
                  <Option value={1}>低优先级</Option>
                  <Option value={2}>中优先级</Option>
                  <Option value={3}>高优先级</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="target_date" label="目标日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                创建学习目标
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* 目标列表 */}
        <List
          dataSource={goals}
          locale={{ emptyText: '还没有学习目标，创建你的第一个目标吧！' }}
          renderItem={(goal) => (
            <List.Item
              actions={[
                goal.status === 'active' && (
                  <Button 
                    type="link" 
                    icon={<CheckOutlined />}
                    onClick={() => updateGoalStatus(goal.id, 'completed')}
                  >
                    完成
                  </Button>
                ),
                <Button 
                  type="link" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => deleteGoal(goal.id)}
                >
                  删除
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <div>
                    {goal.title}
                    {getPriorityTag(goal.priority)}
                    {getStatusTag(goal.status)}
                  </div>
                }
                description={
                  <div>
                    {goal.description && <div>{goal.description}</div>}
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      创建时间: {new Date(goal.created_at).toLocaleDateString()}
                      {goal.target_date && ` | 目标日期: ${goal.target_date}`}
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

export default GoalManager;