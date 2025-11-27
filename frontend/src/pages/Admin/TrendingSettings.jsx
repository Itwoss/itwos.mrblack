import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  App,
  Alert,
  Spin,
  Tooltip,
  Switch,
  message
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContextOptimized';
import AdminDesignSystem from '../../styles/admin-design-system';
import { trendingSettingsAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const TrendingSettings = () => {
  const { user } = useAuth();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await trendingSettingsAPI.getSettings();
      if (response.data?.success) {
        setSettings(response.data.data);
        form.setFieldsValue(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching trending settings:', error);
      messageApi.error(error.response?.data?.message || error.message || 'Failed to load trending settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const response = await trendingSettingsAPI.updateSettings(values);
      if (response.data?.success) {
        setSettings(response.data.data);
        messageApi.success('Trending settings updated successfully!');
      } else {
        throw new Error(response.data?.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving trending settings:', error);
      messageApi.error(error.response?.data?.message || error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await trendingSettingsAPI.resetSettings();
      if (response.data?.success) {
        setSettings(response.data.data);
        form.setFieldsValue(response.data.data);
        messageApi.success('Settings reset to defaults successfully!');
      } else {
        throw new Error(response.data?.message || 'Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting trending settings:', error);
      messageApi.error(error.response?.data?.message || error.message || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: AdminDesignSystem.spacing.xl,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      padding: AdminDesignSystem.layout.content.padding,
      background: AdminDesignSystem.colors.background,
      minHeight: '100vh',
      fontFamily: AdminDesignSystem.typography.fontFamily,
    }}>
      {/* Header */}
      <div style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
        <Title 
          level={2} 
          style={{ 
            marginBottom: AdminDesignSystem.spacing.sm,
            color: AdminDesignSystem.colors.text.primary,
            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
          }}
        >
          <FireOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
          Trending Settings
        </Title>
        <Paragraph style={{ 
          color: AdminDesignSystem.colors.text.secondary,
        }}>
          Configure trending algorithm parameters, delay times, and engagement thresholds.
        </Paragraph>
      </div>

      {/* Info Alert */}
      <Alert
        message="Trending Delay Rule"
        description={
          <div>
            <p>Posts become eligible for trending after a delay period (1-3 hours) from creation.</p>
            <p>Only posts that meet the minimum engagement threshold will be considered for trending.</p>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: AdminDesignSystem.spacing.xl }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={settings}
      >
        {/* Trending Delay Section */}
        <Card
          title={
            <span style={{ color: AdminDesignSystem.colors.text.primary, fontWeight: 600 }}>
              <SettingOutlined style={{ marginRight: 8 }} />
              Trending Delay Configuration
            </span>
          }
          style={{ marginBottom: AdminDesignSystem.spacing.lg }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <Space>
                    <Text>Trending Delay (Hours)</Text>
                    <Tooltip title="Time delay before a post becomes eligible for trending (1-3 hours)">
                      <InfoCircleOutlined style={{ color: AdminDesignSystem.colors.text.secondary }} />
                    </Tooltip>
                  </Space>
                }
                name="trendingDelayHours"
                rules={[
                  { required: true, message: 'Please enter delay hours' },
                  { type: 'number', min: 1, max: 3, message: 'Delay must be between 1 and 3 hours' }
                ]}
              >
                <InputNumber
                  min={1}
                  max={3}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="hours"
                />
              </Form.Item>
              <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: -16 }}>
                Posts become eligible for trending after this delay period from creation.
              </Paragraph>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <Space>
                    <Text>Minimum Trending Score</Text>
                    <Tooltip title="Minimum engagement score required for a post to become trending">
                      <InfoCircleOutlined style={{ color: AdminDesignSystem.colors.text.secondary }} />
                    </Tooltip>
                  </Space>
                }
                name="minTrendingScore"
                rules={[
                  { required: true, message: 'Please enter minimum score' },
                  { type: 'number', min: 0, message: 'Score must be >= 0' }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: -16 }}>
                Posts must achieve this score to be considered for trending.
              </Paragraph>
            </Col>
          </Row>
        </Card>

        {/* Algorithm Weights Section */}
        <Card
          title={
            <span style={{ color: AdminDesignSystem.colors.text.primary, fontWeight: 600 }}>
              Algorithm Weights
            </span>
          }
          style={{ marginBottom: AdminDesignSystem.spacing.lg }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Views Weight"
                name={['weights', 'views']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Likes Weight"
                name={['weights', 'likes']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Comments Weight"
                name={['weights', 'comments']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Saves Weight"
                name={['weights', 'saves']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Shares Weight"
                name={['weights', 'shares']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Follower Normalization"
                name={['weights', 'followerNorm']}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Advanced Settings */}
        <Card
          title={
            <span style={{ color: AdminDesignSystem.colors.text.primary, fontWeight: 600 }}>
              Advanced Settings
            </span>
          }
          style={{ marginBottom: AdminDesignSystem.spacing.lg }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Time Decay Constant (Hours)"
                name="decayConstant"
                tooltip="Score halves every N hours"
              >
                <InputNumber min={1} step={1} style={{ width: '100%' }} addonAfter="hours" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Trending Top Percent (%)"
                name="trendingTopPercent"
                tooltip="Top X% of posts become trending"
              >
                <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Trending Top Count"
                name="trendingTopCount"
                tooltip="Maximum number of trending posts"
              >
                <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Action Buttons */}
        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size="large"
            >
              Save Settings
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              loading={saving}
              size="large"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={fetchSettings}
              size="large"
            >
              Reload
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default TrendingSettings;

