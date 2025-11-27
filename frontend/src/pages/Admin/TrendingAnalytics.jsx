import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Select,
  DatePicker,
  Space,
  Typography,
  Spin,
  Alert,
  Empty,
  Tooltip
} from 'antd';
import {
  FireOutlined,
  EyeOutlined,
  HeartOutlined,
  MessageOutlined,
  BookOutlined,
  ShareAltOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TrendingAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching trending analytics for', days, 'days');
      const response = await api.get(`/admin/trending/analytics?days=${days}`);
      
      console.log('📊 Trending analytics response:', response.data);
      
      if (response.data?.success) {
        setAnalytics(response.data.data);
      } else {
        console.error('📊 Analytics API returned unsuccessful response:', response.data);
        setError('Failed to load analytics data');
      }
    } catch (err) {
      console.error('❌ Error fetching trending analytics:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={fetchAnalytics} style={{ marginLeft: '1rem' }}>
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ padding: '2rem' }}>
        <Empty description="No analytics data available" />
      </div>
    );
  }

  // Safely destructure with defaults
  const summary = analytics.summary || {};
  const engagement = analytics.engagement || { total: {}, last24h: {} };
  const topTrending = analytics.topTrending || [];
  const charts = analytics.charts || { dailyTrending: [], engagementOverTime: [] };

  // Prepare chart data
  const dailyTrendingConfig = {
    data: charts.dailyTrending || [],
    xField: 'date',
    yField: 'count',
    point: {
      size: 5,
      shape: 'circle',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
    color: '#ff6b6b',
    smooth: true,
    height: 300,
    autoFit: true,
    padding: 'auto',
    xAxis: {
      label: {
        style: {
          fill: '#666',
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#666',
        },
      },
    },
    tooltip: {
      showMarkers: true,
    },
  };

  const engagementConfig = {
    data: charts.engagementOverTime || [],
    xField: 'date',
    yField: 'views',
    seriesField: 'type',
    isStack: false,
    point: {
      size: 4,
    },
    label: {
      position: 'middle',
    },
  };

  // Table columns for top trending posts
  const columns = [
    {
      title: 'Rank',
      dataIndex: 'trendingRank',
      key: 'rank',
      width: 80,
      render: (rank) => (
        <Tag color="red" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          #{rank}
        </Tag>
      ),
    },
    {
      title: 'Post',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title, record) => (
        <div>
          <Text strong>{title || 'Untitled'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            by {record.author?.name || record.author?.username || 'Unknown'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trending Score',
      dataIndex: 'trendingScore',
      key: 'trendingScore',
      width: 120,
      render: (score) => (
        <Text strong style={{ color: '#ff6b6b' }}>
          {score?.toFixed(2) || '0.00'}
        </Text>
      ),
      sorter: (a, b) => (a.trendingScore || 0) - (b.trendingScore || 0),
    },
    {
      title: 'Views',
      dataIndex: 'views',
      key: 'views',
      width: 100,
      render: (views) => (
        <Space>
          <EyeOutlined />
          {views || 0}
        </Space>
      ),
      sorter: (a, b) => (a.views || 0) - (b.views || 0),
    },
    {
      title: 'Likes',
      dataIndex: 'likes',
      key: 'likes',
      width: 100,
      render: (likes) => (
        <Space>
          <HeartOutlined style={{ color: '#ff4d4f' }} />
          {likes || 0}
        </Space>
      ),
      sorter: (a, b) => (a.likes || 0) - (b.likes || 0),
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      key: 'comments',
      width: 100,
      render: (comments) => (
        <Space>
          <MessageOutlined />
          {comments || 0}
        </Space>
      ),
    },
    {
      title: 'Saves',
      dataIndex: 'saves',
      key: 'saves',
      width: 100,
      render: (saves) => (
        <Space>
          <BookOutlined />
          {saves || 0}
        </Space>
      ),
    },
    {
      title: 'Shares',
      dataIndex: 'shares',
      key: 'shares',
      width: 100,
      render: (shares) => (
        <Space>
          <ShareAltOutlined />
          {shares || 0}
        </Space>
      ),
    },
    {
      title: 'Trending Since',
      dataIndex: 'trendingSince',
      key: 'trendingSince',
      width: 150,
      render: (date) => (
        <Tooltip title={date ? new Date(date).toLocaleString() : 'N/A'}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {date ? dayjs(date).fromNow() : 'N/A'}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          <FireOutlined style={{ color: '#ff6b6b', marginRight: '8px' }} />
          Trending Analytics
        </Title>
        <Space>
          <Select
            value={days}
            onChange={setDays}
            style={{ width: 150 }}
          >
            <Option value={1}>Last 24 Hours</Option>
            <Option value={7}>Last 7 Days</Option>
            <Option value={30}>Last 30 Days</Option>
            <Option value={90}>Last 90 Days</Option>
          </Select>
        </Space>
      </div>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Total Trending Posts</Text>}
              value={summary.totalTrending}
              prefix={<FireOutlined style={{ color: '#ff6b6b' }} />}
              valueStyle={{ color: '#ff6b6b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Conversion Rate</Text>}
              value={
                summary.conversionRate 
                  ? (typeof summary.conversionRate === 'number' 
                      ? summary.conversionRate.toFixed(2) 
                      : summary.conversionRate)
                  : '0.00'
              }
              suffix="%"
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {summary.totalPosts || 0} total posts
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Avg Trending Score</Text>}
              value={
                summary.avgTrendingScore 
                  ? (typeof summary.avgTrendingScore === 'number' 
                      ? summary.avgTrendingScore.toFixed(2) 
                      : summary.avgTrendingScore)
                  : '0.00'
              }
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Avg Time to Trend</Text>}
              value={
                summary.avgTimeToTrend 
                  ? (typeof summary.avgTimeToTrend === 'number' 
                      ? summary.avgTimeToTrend.toFixed(1) 
                      : summary.avgTimeToTrend)
                  : 'N/A'
              }
              suffix={summary.avgTimeToTrend ? 'hours' : ''}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Engagement Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Total Engagement</span>} 
            style={{ height: '100%' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Views</Text>}
                  value={engagement.total?.views || 0}
                  prefix={<EyeOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Likes</Text>}
                  value={engagement.total?.likes || 0}
                  prefix={<HeartOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Comments</Text>}
                  value={engagement.total?.comments || 0}
                  prefix={<MessageOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Saves</Text>}
                  value={engagement.total?.saves || 0}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Shares</Text>}
                  value={engagement.total?.shares || 0}
                  prefix={<ShareAltOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Flagged Posts</Text>}
                  value={summary.flaggedTrending || 0}
                  prefix={<FlagOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Last 24 Hours Engagement</span>} 
            style={{ height: '100%' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Views</Text>}
                  value={engagement.last24h?.views || 0}
                  prefix={<EyeOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Likes</Text>}
                  value={engagement.last24h?.likes || 0}
                  prefix={<HeartOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Comments</Text>}
                  value={engagement.last24h?.comments || 0}
                  prefix={<MessageOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Saves</Text>}
                  value={engagement.last24h?.saves || 0}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: '#000000', fontWeight: 600, fontSize: '14px' }}>Shares</Text>}
                  value={engagement.last24h?.shares || 0}
                  prefix={<ShareAltOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Daily Trending Posts</span>}>
            {charts.dailyTrending && charts.dailyTrending.length > 0 ? (
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <Line {...dailyTrendingConfig} />
              </div>
            ) : (
              <Empty description="No data available" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Engagement Over Time</span>}>
            {charts.engagementOverTime && charts.engagementOverTime.length > 0 ? (
              <Column
                data={charts.engagementOverTime}
                xField="date"
                yField="views"
                height={300}
                color="#1890ff"
              />
            ) : (
              <Empty description="No data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Top Trending Posts Table */}
      <Card title={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Top Trending Posts</span>}>
        <Table
          columns={columns}
          dataSource={topTrending}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} trending posts`,
          }}
        />
      </Card>
    </div>
  );
};

export default TrendingAnalytics;
