import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, List, Tag } from 'antd';
import { TrophyOutlined, RiseOutlined, CalendarOutlined } from '@ant-design/icons';
import axios from 'axios';

const Statistics = ({ currentUser }) => {
  const [statistics, setStatistics] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    if (currentUser) {
      loadStatistics();
      loadRecentSessions();
    }
  }, [currentUser]);

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

  const loadRecentSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/study/sessions?user_id=${currentUser.id}`);
      if (response.data.success) {
        setRecentSessions(response.data.sessions.slice(0, 5));
      }
    } catch (error) {
      console.error('加载学习记录失败:', error);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const getStudyStreak = () => {
    // 简单的连续学习天数计算（简化版）
    if (recentSessions.length === 0) return 0;
    
    const today = new Date().toDateString();
    const dates = [...new Set(recentSessions.map(s => new Date(s.session_date).toDateString()))];
    
    return dates.includes(today) ? Math.min(dates.length, 7) : 0;
  };

  return (
    <div className="statistics">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TrophyOutlined style={{ fontSize: 24, color: '#ffc53d', marginBottom: 8 }} />
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                {formatDuration(statistics.total_minutes || 0)}
              </div>
              <div>本月学习时长</div>
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <RiseOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                {getStudyStreak()} 天
              </div>
              <div>连续学习</div>
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CalendarOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                {recentSessions.length}
              </div>
              <div>学习记录</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 科目分布 */}
      {statistics.subject_breakdown && statistics.subject_breakdown.length > 0 && (
        <Card title="📊 科目学习分布" style={{ marginBottom: 16 }}>
          {statistics.subject_breakdown.map((subject, index) => {
            const percentage = Math.round((subject.total_minutes / statistics.total_minutes) * 100);
            return (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{subject.subject}</span>
                  <span>
                    {formatDuration(subject.total_minutes)} ({percentage}%)
                  </span>
                </div>
                <Progress 
                  percent={percentage} 
                  size="small"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            );
          })}
        </Card>
      )}

      {/* 最近学习记录 */}
      <Card title="🔥 最近学习活动">
        <List
          dataSource={recentSessions}
          locale={{ emptyText: '还没有学习记录' }}
          renderItem={(session) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div>
                    <Tag color="blue">{session.subject}</Tag>
                    {formatDuration(session.duration_minutes)}
                  </div>
                }
                description={
                  <div>
                    {session.notes && <div style={{ marginBottom: 4 }}>{session.notes}</div>}
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {new Date(session.session_date).toLocaleDateString()}
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

export default Statistics;