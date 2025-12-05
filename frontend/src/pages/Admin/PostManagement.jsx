import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Input,
  Select,
  Space,
  Modal,
  message,
  Image,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ReloadOutlined,
  FlagOutlined,
  EditOutlined
} from '@ant-design/icons';
import { postsAPI } from '../../services/api';
import AdminDesignSystem from '../../styles/admin-design-system';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [moderationModalVisible, setModerationModalVisible] = useState(false);
  const [moderationAction, setModerationAction] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    status: null,
    privacy: null,
    flagged: null,
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    flagged: 0,
    hidden: 0
  });

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await postsAPI.getAdminPosts(params);
      
      // Axios wraps the response in .data, so backend {success, data} becomes response.data
      const responseData = response.data || response;
      
      if (responseData.success) {
        const posts = responseData.data?.posts || responseData.posts || [];
        console.log('📊 Fetched posts:', posts.length, posts);
        setPosts(posts);
        setPagination(prev => ({
          ...prev,
          total: responseData.data?.pagination?.total || responseData.pagination?.total || posts.length || 0
        }));
      } else {
        console.error('❌ API response not successful:', responseData);
        message.error(responseData.message || 'Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await postsAPI.getAdminPosts({ limit: 1000 }); // Get more posts for accurate stats
      const responseData = response.data || response;
      
      if (responseData.success) {
        const allPosts = responseData.data?.posts || responseData.posts || [];
        setStats({
          total: responseData.data?.pagination?.total || responseData.pagination?.total || allPosts.length,
          published: allPosts.filter(p => p.status === 'published').length,
          pending: allPosts.filter(p => p.status === 'moderation_pending' || p.status === 'processing').length,
          flagged: allPosts.filter(p => (p.flaggedCount || 0) > 0).length,
          hidden: allPosts.filter(p => p.status === 'hidden').length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleModerate = async () => {
    if (!selectedPost || !moderationAction) {
      message.error('Please select an action');
      return;
    }

    try {
      const response = await postsAPI.moderatePost(selectedPost._id, {
        action: moderationAction,
        reason: moderationReason
      });

      if (response.success) {
        message.success(`Post ${moderationAction === 'remove' ? 'removed' : moderationAction === 'hide' ? 'hidden' : 'restored'} successfully`);
        setModerationModalVisible(false);
        setSelectedPost(null);
        setModerationAction(null);
        setModerationReason('');
        fetchPosts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      message.error('Failed to moderate post');
    }
  };

  const handleFeature = async (postId, featured) => {
    try {
      const response = await postsAPI.featurePost(postId, { featured: !featured });
      if (response.success) {
        message.success(`Post ${!featured ? 'featured' : 'unfeatured'} successfully`);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error featuring post:', error);
      message.error('Failed to feature post');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000/api'}/admin/posts/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `posts-export-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Posts exported successfully');
      }
    } catch (error) {
      console.error('Error exporting posts:', error);
      message.error('Failed to export posts');
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      published: 'success',
      processing: 'processing',
      moderation_pending: 'warning',
      hidden: 'default',
      removed: 'error',
      blocked: 'error'
    };
    return statusColors[status] || 'default';
  };

  const getStatusText = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const columns = [
    {
      title: 'Post',
      key: 'post',
      width: 300,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Image
            src={record.cdnUrls?.thumb || record.imageUrl || '/placeholder.png'}
            alt={record.title}
            width={80}
            height={80}
            style={{ objectFit: 'cover', borderRadius: '8px' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ display: 'block', marginBottom: '4px' }}>
              {record.title || 'Untitled Post'}
            </Text>
            <Text type="secondary" ellipsis style={{ fontSize: '12px', display: 'block' }}>
              {record.bio || 'No description'}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
              ID: {record._id?.slice(-8)}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Owner',
      key: 'owner',
      width: 150,
      render: (_, record) => (
        <div>
          <Text strong>{record.userId?.name || 'Unknown'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            @{record.userId?.username || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      )
    },
    {
      title: 'Privacy',
      key: 'privacy',
      width: 100,
      render: (_, record) => (
        <Tag color={record.privacy === 'public' ? 'blue' : record.privacy === 'followers' ? 'orange' : 'red'}>
          {record.privacy || 'public'}
        </Tag>
      )
    },
    {
      title: 'Engagement',
      key: 'engagement',
      width: 150,
      render: (_, record) => (
        <div>
          <Space size="small">
            <Tooltip title="Likes">
              <Text>❤️ {record.likes || 0}</Text>
            </Tooltip>
            <Tooltip title="Views">
              <Text>👁️ {record.views || 0}</Text>
            </Tooltip>
            <Tooltip title="Saves">
              <Text>🔖 {record.saves || 0}</Text>
            </Tooltip>
          </Space>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Score: {record.engagementScore?.toFixed(1) || 0}
          </Text>
        </div>
      )
    },
    {
      title: 'Flags',
      key: 'flags',
      width: 100,
      render: (_, record) => (
        record.flaggedCount > 0 ? (
          <Badge count={record.flaggedCount} showZero>
            <Tag color="red" icon={<FlagOutlined />}>
              {record.flaggedCount}
            </Tag>
          </Badge>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: 'Featured',
      key: 'featured',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={record.featured ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={() => handleFeature(record._id, record.featured)}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedPost(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Moderate">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedPost(record);
                setModerationModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <Title level={2} style={{ margin: 0, marginBottom: '6px', fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>
          Post Management
        </Title>
        <Text style={{ color: '#64748b', fontSize: '13px' }}>
          Manage and moderate user posts
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Total Posts</Text>}
              value={stats.total}
              prefix={<EyeOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />}
              valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Published</Text>}
              value={stats.published}
              valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}
              prefix={<CheckCircleOutlined style={{ color: '#22c55e', fontSize: '18px' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Pending</Text>}
              value={stats.pending}
              valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#f59e0b' }}
              prefix={<ReloadOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: '12px' }}>Flagged</Text>}
              value={stats.flagged}
              valueStyle={{ fontSize: '18px', fontWeight: 600, color: '#ec4899' }}
              prefix={<FlagOutlined style={{ color: '#ec4899', fontSize: '18px' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
        <Space wrap size="small" style={{ width: '100%' }}>
          <Input
            placeholder="Search posts..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 200 }}
            size="small"
            allowClear
          />
          <Select
            placeholder="Status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 130 }}
            size="small"
            allowClear
          >
            <Option value="published">Published</Option>
            <Option value="processing">Processing</Option>
            <Option value="moderation_pending">Pending</Option>
            <Option value="hidden">Hidden</Option>
            <Option value="removed">Removed</Option>
          </Select>
          <Select
            placeholder="Privacy"
            value={filters.privacy}
            onChange={(value) => setFilters({ ...filters, privacy: value })}
            style={{ width: 130 }}
            size="small"
            allowClear
          >
            <Option value="public">Public</Option>
            <Option value="followers">Followers</Option>
            <Option value="private">Private</Option>
          </Select>
          <Select
            placeholder="Flagged"
            value={filters.flagged}
            onChange={(value) => setFilters({ ...filters, flagged: value })}
            style={{ width: 110 }}
            size="small"
            allowClear
          >
            <Option value="true">Yes</Option>
            <Option value="false">No</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setFilters({ status: null, privacy: null, flagged: null, search: '' });
              setPagination({ ...pagination, current: 1 });
            }}
            size="small"
            style={{ fontSize: '12px', height: '28px' }}
          >
            Reset
          </Button>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            size="small"
            style={{ fontSize: '12px', height: '28px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
          >
            Export CSV
          </Button>
        </Space>
      </Card>

      {/* Posts Table */}
      <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} styles={{ body: { padding: '12px' } }}>
        <Table
          columns={columns}
          dataSource={posts}
          loading={loading}
          rowKey={(record) => record._id || record.id || Math.random()}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: loading ? 'Loading posts...' : 'No posts found. Users can create posts from their dashboard.'
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} posts`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            }
          }}
        />
      </Card>

      {/* Post Detail Modal */}
      <Modal
        title="Post Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedPost(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedPost(null);
          }}>
            Close
          </Button>,
          <Button
            key="moderate"
            type="primary"
            onClick={() => {
              setDetailModalVisible(false);
              setModerationModalVisible(true);
            }}
          >
            Moderate
          </Button>
        ]}
        width={800}
      >
        {selectedPost && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Image
                  src={selectedPost.cdnUrls?.feed || selectedPost.imageUrl || '/placeholder.png'}
                  alt={selectedPost.title}
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Col>
              <Col span={12}>
                <Title level={4}>{selectedPost.title || 'Untitled Post'}</Title>
                <Paragraph>{selectedPost.bio || 'No description'}</Paragraph>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Status: </Text>
                    <Tag color={getStatusColor(selectedPost.status)}>
                      {getStatusText(selectedPost.status)}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Privacy: </Text>
                    <Tag color={selectedPost.privacy === 'public' ? 'blue' : 'orange'}>
                      {selectedPost.privacy}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Engagement Score: </Text>
                    <Text>{selectedPost.engagementScore?.toFixed(2) || 0}</Text>
                  </div>
                  <div>
                    <Text strong>Trending Score: </Text>
                    <Text>{selectedPost.trendingScore?.toFixed(2) || 0}</Text>
                  </div>
                  <div>
                    <Text strong>Flags: </Text>
                    <Badge count={selectedPost.flaggedCount} showZero>
                      <Text>{selectedPost.flaggedCount || 0}</Text>
                    </Badge>
                  </div>
                  <div>
                    <Text strong>Created: </Text>
                    <Text>{new Date(selectedPost.createdAt).toLocaleString()}</Text>
                  </div>
                </Space>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Moderation Modal */}
      <Modal
        title="Moderate Post"
        open={moderationModalVisible}
        onOk={handleModerate}
        onCancel={() => {
          setModerationModalVisible(false);
          setSelectedPost(null);
          setModerationAction(null);
          setModerationReason('');
        }}
        okText="Apply Action"
        cancelText="Cancel"
      >
        {selectedPost && (
          <div>
            <Paragraph>
              <Text strong>Post: </Text>
              {selectedPost.title || 'Untitled Post'}
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Action:</Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="Select moderation action"
                  value={moderationAction}
                  onChange={setModerationAction}
                >
                  <Option value="remove">Remove Post</Option>
                  <Option value="hide">Hide Post</Option>
                  <Option value="restore">Restore Post</Option>
                </Select>
              </div>
              <div>
                <Text strong>Reason (optional):</Text>
                <Input.TextArea
                  rows={4}
                  placeholder="Enter moderation reason..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PostManagement;

