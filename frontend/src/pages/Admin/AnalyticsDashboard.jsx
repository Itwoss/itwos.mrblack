import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  DatePicker,
  Space,
  Button,
  Spin,
  message,
  Tag,
  Avatar,
  Empty
} from 'antd';
import {
  UserOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import AdminDesignSystem from '../../styles/admin-design-system';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [topVideos, setTopVideos] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchTopVideos(),
        fetchRecentCalls()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const [start, end] = dateRange;
      const response = await api.get('/admin/analytics/summary', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });

      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      message.error('Failed to fetch analytics summary');
    }
  };

  const fetchTopVideos = async () => {
    try {
      const [start, end] = dateRange;
      const response = await api.get('/admin/analytics/top-video-content', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 10
        }
      });

      if (response.data.success) {
        setTopVideos(response.data.data.videos || []);
      }
    } catch (error) {
      console.error('Error fetching top videos:', error);
      message.error('Failed to fetch top videos');
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const [start, end] = dateRange;
      const response = await api.get('/admin/analytics/recent-calls', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 20
        }
      });

      if (response.data.success) {
        setRecentCalls(response.data.data.calls || []);
      }
    } catch (error) {
      console.error('Error fetching recent calls:', error);
      message.error('Failed to fetch recent calls');
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  const callColumns = [
    {
      title: 'Caller',
      key: 'caller',
      render: (_, record) => (
        <Space>
          <Avatar src={record.caller?.avatarUrl} icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontWeight: 500, fontSize: '13px' }}>{record.caller?.name || 'Unknown'}</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.caller?.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Receiver',
      key: 'receiver',
      render: (_, record) => (
        record.receiver ? (
          <Space>
            <Avatar src={record.receiver?.avatarUrl} icon={<UserOutlined />} size="small" />
            <div>
              <div style={{ fontWeight: 500, fontSize: '13px' }}>{record.receiver?.name || 'Unknown'}</div>
              <Text type="secondary" style={{ fontSize: '11px' }}>{record.receiver?.email}</Text>
            </div>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>N/A</Text>
        )
      )
    },
    {
      title: 'Type',
      key: 'callType',
      render: (_, record) => (
        <Tag color={record.callType === 'video' ? '#3b82f6' : '#22c55e'} style={{ fontSize: '11px' }}>
          {record.callType === 'video' ? 'Video' : 'Audio'}
        </Tag>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>
          {record.durationMinutes} min
        </Text>
      )
    },
    {
      title: 'Time',
      key: 'timestamp',
      render: (_, record) => (
        <Text style={{ fontSize: '12px', color: '#64748b' }}>
          {dayjs(record.timestamp).format('MMM DD, YYYY HH:mm')}
        </Text>
      )
    }
  ];

  const videoColumns = [
    {
      title: 'Video ID',
      key: 'videoId',
      render: (_, record) => (
        <Text code style={{ fontSize: '11px' }}>{record.videoId?.slice(-8) || 'N/A'}</Text>
      )
    },
    {
      title: 'Watch Time',
      key: 'totalWatchMinutes',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#3b82f6' }}>
          {record.totalWatchMinutes} min
        </Text>
      )
    },
    {
      title: 'Plays',
      key: 'playCount',
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.playCount}</Text>
      )
    },
    {
      title: 'Completions',
      key: 'completeCount',
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.completeCount}</Text>
      )
    },
    {
      title: 'Viewers',
      key: 'uniqueViewers',
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.uniqueViewers}</Text>
      )
    },
    {
      title: 'Completion Rate',
      key: 'completionRate',
      render: (_, record) => (
        <Tag color={record.completionRate > 50 ? '#22c55e' : record.completionRate > 25 ? '#f59e0b' : '#ec4899'} style={{ fontSize: '11px' }}>
          {record.completionRate}%
        </Tag>
      )
    }
  ];

  return (
    <div style={{
      padding: '16px',
      background: '#f5f7fa',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Title level={2} style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>
            <BarChartOutlined style={{ marginRight: '8px', color: '#3b82f6', fontSize: '20px' }} />
            Usage Analytics
          </Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllData}
            loading={loading}
            size="small"
            style={{ fontSize: '12px', height: '28px' }}
          >
            Refresh
          </Button>
        </div>
        <Space>
          <Text style={{ fontSize: '13px', color: '#64748b' }}>Date Range:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            size="small"
            style={{ fontSize: '12px' }}
          />
        </Space>
      </div>

      {loading && !summary ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
                <Statistic
                  title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Active Users</Text>}
                  value={summary?.activeUsers || 0}
                  prefix={<UserOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />}
                  valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
                <Statistic
                  title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Video Call Minutes</Text>}
                  value={summary?.videoCallMinutes || 0}
                  prefix={<VideoCameraOutlined style={{ color: '#22c55e', fontSize: '18px' }} />}
                  valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}
                  suffix="min"
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
                <Statistic
                  title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Audio Call Minutes</Text>}
                  value={summary?.audioCallMinutes || 0}
                  prefix={<PhoneOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />}
                  valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#f59e0b' }}
                  suffix="min"
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
                <Statistic
                  title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Total Page Views</Text>}
                  value={summary?.totalPageViews || 0}
                  prefix={<EyeOutlined style={{ color: '#ec4899', fontSize: '18px' }} />}
                  valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#ec4899' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Top Paths */}
          {summary?.topPaths && summary.topPaths.length > 0 && (
            <Card
              title={<Text strong style={{ color: '#1e293b', fontSize: '14px' }}>Most Used Paths</Text>}
              style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
              styles={{ body: { padding: '12px' } }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {summary.topPaths.map((path, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div>
                      <Text strong style={{ fontSize: '13px', color: '#1e293b' }}>{path.path}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '11px' }}>{path.uniqueUsers} unique users</Text>
                    </div>
                    <Tag color="#3b82f6" style={{ fontSize: '12px' }}>{path.views} views</Tag>
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* Top Videos */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <PlayCircleOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ color: '#1e293b', fontSize: '14px' }}>Top Videos</Text>
                  </Space>
                }
                style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                styles={{ body: { padding: '12px' } }}
              >
                {topVideos.length > 0 ? (
                  <Table
                    columns={videoColumns}
                    dataSource={topVideos}
                    rowKey="videoId"
                    pagination={false}
                    size="small"
                    scroll={{ x: true }}
                  />
                ) : (
                  <Empty description="No video data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>

            {/* Recent Calls */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <PhoneOutlined style={{ color: '#22c55e' }} />
                    <Text strong style={{ color: '#1e293b', fontSize: '14px' }}>Recent Calls</Text>
                  </Space>
                }
                style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                styles={{ body: { padding: '12px' } }}
              >
                {recentCalls.length > 0 ? (
                  <Table
                    columns={callColumns}
                    dataSource={recentCalls}
                    rowKey="callId"
                    pagination={false}
                    size="small"
                    scroll={{ x: true }}
                  />
                ) : (
                  <Empty description="No call data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;









