import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Tag,
  Select,
  DatePicker,
  Popconfirm,
  Tooltip,
  Badge
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  PushpinOutlined,
  UserOutlined,
  ExportOutlined,
  SettingOutlined,
  UserDeleteOutlined,
  SoundOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import AdminDesignSystem from '../../styles/admin-design-system';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;
const { Option } = Select;

const GlobalChatModeration = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    startDate: null,
    endDate: null,
    isDeleted: undefined
  });
  const [settings, setSettings] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => {
    fetchMessages();
    fetchSettings();
  }, [pagination.page, filters]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        endDate: filters.endDate ? filters.endDate.toISOString() : undefined
      };
      
      const response = await api.get('/admin/global-chat/messages', { params });
      if (response.data.success) {
        setMessages(response.data.data.messages);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      message.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/global-chat/settings');
      if (response.data.success) {
        setSettings(response.data.data);
        setSettingsForm(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await api.delete(`/admin/global-chat/messages/${messageId}`);
      if (response.data.success) {
        message.success('Message deleted successfully');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      message.error('Failed to delete message');
    }
  };

  const handlePinMessage = async (messageId, pin) => {
    try {
      const response = await api.post(`/admin/global-chat/messages/${messageId}/pin`, { pin });
      if (response.data.success) {
        message.success(pin ? 'Message pinned successfully' : 'Message unpinned successfully');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error pinning message:', error);
      message.error('Failed to pin/unpin message');
    }
  };

  const handleMuteUser = async (userId, duration, reason) => {
    try {
      const response = await api.post(`/admin/global-chat/users/${userId}/mute`, {
        duration,
        reason
      });
      if (response.data.success) {
        message.success(`User muted ${duration ? `for ${duration} minutes` : 'permanently'}`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
      message.error('Failed to mute user');
    }
  };

  const handleBanUser = async (userId, duration, reason) => {
    try {
      const response = await api.post(`/admin/global-chat/users/${userId}/ban`, {
        duration,
        reason
      });
      if (response.data.success) {
        message.success(`User banned ${duration ? `for ${duration} minutes` : 'permanently'}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      message.error('Failed to ban user');
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const params = {
        format,
        startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        endDate: filters.endDate ? filters.endDate.toISOString() : undefined
      };
      
      const response = await api.get('/admin/global-chat/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `global-chat-export-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Chat logs exported successfully');
    } catch (error) {
      console.error('Error exporting chat logs:', error);
      message.error('Failed to export chat logs');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await api.put('/admin/global-chat/settings', settingsForm);
      if (response.data.success) {
        message.success('Settings updated successfully');
        setSettingsModalVisible(false);
        fetchSettings();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      message.error('Failed to update settings');
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'User',
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
      render: (user) => user?.name || user?.username || 'Unknown'
    },
    {
      title: 'Message',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text, record) => (
        <div>
          {record.isPinned && <Tag color="blue" icon={<PushpinOutlined />}>Pinned</Tag>}
          {record.isDeleted && <Tag color="red">Deleted</Tag>}
          <Text>{text}</Text>
        </div>
      )
    },
    {
      title: 'Reactions',
      dataIndex: 'reactions',
      key: 'reactions',
      width: 100,
      render: (reactions) => reactions?.length || 0
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          {!record.isDeleted && (
            <Popconfirm
              title="Delete this message?"
              onConfirm={() => handleDeleteMessage(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          )}
          {!record.isDeleted && (
            <Tooltip title={record.isPinned ? 'Unpin' : 'Pin'}>
              <Button
                type="text"
                icon={<PushpinOutlined />}
                size="small"
                onClick={() => handlePinMessage(record._id, !record.isPinned)}
                style={{ color: record.isPinned ? '#1890ff' : undefined }}
              />
            </Tooltip>
          )}
          <Button
            type="text"
            icon={<UserOutlined />}
            size="small"
            onClick={() => {
              Modal.info({
                title: 'User Actions',
                content: (
                  <div>
                    <Button
                      type="primary"
                      icon={<SoundOutlined />}
                      onClick={() => {
                        const duration = prompt('Mute duration (minutes, 0 for permanent):');
                        const reason = prompt('Reason:');
                        if (duration !== null) {
                          handleMuteUser(record.userId?._id || record.userId, parseInt(duration) || null, reason);
                        }
                      }}
                      style={{ marginRight: 8 }}
                    >
                      Mute User
                    </Button>
                    <Button
                      danger
                      icon={<UserDeleteOutlined />}
                      onClick={() => {
                        const duration = prompt('Ban duration (minutes, 0 for permanent):');
                        const reason = prompt('Reason:');
                        if (duration !== null) {
                          handleBanUser(record.userId?._id || record.userId, parseInt(duration) || null, reason);
                        }
                      }}
                    >
                      Ban User
                    </Button>
                  </div>
                )
              });
            }}
          />
        </Space>
      )
    }
  ];

  return (
    <AdminLayout>
      <div style={{ padding: AdminDesignSystem.spacing.lg }}>
        {/* Header */}
        <Card
          style={{
            marginBottom: AdminDesignSystem.spacing.md,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.border}`,
            background: AdminDesignSystem.colors.background
          }}
          styles={{ body: { padding: AdminDesignSystem.spacing.md } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0, fontSize: AdminDesignSystem.typography.fontSize.h4 }}>
              Global Chat Moderation
            </Title>
            <Space>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsModalVisible(true)}
              >
                Settings
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => handleExport('json')}
              >
                Export JSON
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => handleExport('csv')}
              >
                Export CSV
              </Button>
            </Space>
          </div>
        </Card>

        {/* Filters */}
        <Card
          style={{
            marginBottom: AdminDesignSystem.spacing.md,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.border}`,
            background: AdminDesignSystem.colors.background
          }}
          styles={{ body: { padding: AdminDesignSystem.spacing.md } }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
              <Search
                placeholder="Search messages..."
                allowClear
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onSearch={fetchMessages}
                style={{ width: 300 }}
              />
              <Input
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                style={{ width: 200 }}
              />
              <RangePicker
                value={filters.startDate && filters.endDate ? [filters.startDate, filters.endDate] : null}
                onChange={(dates) => {
                  setFilters(prev => ({
                    ...prev,
                    startDate: dates?.[0] || null,
                    endDate: dates?.[1] || null
                  }));
                }}
              />
              <Select
                placeholder="Filter by status"
                allowClear
                value={filters.isDeleted}
                onChange={(value) => setFilters(prev => ({ ...prev, isDeleted: value }))}
                style={{ width: 150 }}
              >
                <Option value={undefined}>All</Option>
                <Option value={false}>Active</Option>
                <Option value={true}>Deleted</Option>
              </Select>
              <Button type="primary" onClick={fetchMessages}>
                Apply Filters
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Messages Table */}
        <Card
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.border}`,
            background: AdminDesignSystem.colors.background
          }}
          styles={{ body: { padding: AdminDesignSystem.spacing.md } }}
        >
          <Table
            columns={columns}
            dataSource={messages}
            loading={loading}
            rowKey="_id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} messages`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, page, limit: pageSize }));
              }
            }}
          />
        </Card>

        {/* Settings Modal */}
        <Modal
          title="Global Chat Settings"
          open={settingsModalVisible}
          onOk={handleUpdateSettings}
          onCancel={() => setSettingsModalVisible(false)}
          width={600}
        >
          {settings && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Slow Mode (seconds):</Text>
                <Input
                  type="number"
                  value={settingsForm.slowModeSeconds}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, slowModeSeconds: parseInt(e.target.value) }))}
                  style={{ marginTop: 8 }}
                />
              </div>
              <div>
                <Text strong>Max Message Length:</Text>
                <Input
                  type="number"
                  value={settingsForm.maxMessageLength}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, maxMessageLength: parseInt(e.target.value) }))}
                  style={{ marginTop: 8 }}
                />
              </div>
              <div>
                <Text strong>Max Duplicate Check:</Text>
                <Input
                  type="number"
                  value={settingsForm.maxDuplicateCheck}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, maxDuplicateCheck: parseInt(e.target.value) }))}
                  style={{ marginTop: 8 }}
                />
              </div>
              <div>
                <Space>
                  <Text strong>Allow Reactions:</Text>
                  <Select
                    value={settingsForm.allowReactions}
                    onChange={(value) => setSettingsForm(prev => ({ ...prev, allowReactions: value }))}
                    style={{ width: 100 }}
                  >
                    <Option value={true}>Yes</Option>
                    <Option value={false}>No</Option>
                  </Select>
                </Space>
              </div>
              <div>
                <Space>
                  <Text strong>Allow Replies:</Text>
                  <Select
                    value={settingsForm.allowReplies}
                    onChange={(value) => setSettingsForm(prev => ({ ...prev, allowReplies: value }))}
                    style={{ width: 100 }}
                  >
                    <Option value={true}>Yes</Option>
                    <Option value={false}>No</Option>
                  </Select>
                </Space>
              </div>
              <div>
                <Space>
                  <Text strong>Allow Mentions:</Text>
                  <Select
                    value={settingsForm.allowMentions}
                    onChange={(value) => setSettingsForm(prev => ({ ...prev, allowMentions: value }))}
                    style={{ width: 100 }}
                  >
                    <Option value={true}>Yes</Option>
                    <Option value={false}>No</Option>
                  </Select>
                </Space>
              </div>
            </Space>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default GlobalChatModeration;

