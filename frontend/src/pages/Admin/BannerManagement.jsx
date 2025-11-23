import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Table, Tag, message, Modal, Form, Input, InputNumber, 
  Select, Upload, Space, Popconfirm, Typography, Row, Col, Statistic 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  EyeOutlined, CheckCircleOutlined, CloseCircleOutlined 
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [stats, setStats] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBanners();
    fetchStats();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/banners/admin/all');
      if (response.data.success) {
        setBanners(response.data.banners);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      message.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/banners/admin/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setFileList([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    form.setFieldsValue({
      name: banner.name,
      description: banner.description,
      price: banner.price,
      rarity: banner.rarity,
      effect: banner.effect,
      effectColor: banner.effectColor,
      category: banner.category,
      season: banner.season,
      stock: banner.stock,
      isActive: banner.isActive
    });
    setFileList([]);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/banners/admin/${id}`);
      if (response.data.success) {
        message.success('Banner deleted successfully');
        fetchBanners();
        fetchStats();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      message.error(error.response?.data?.message || 'Failed to delete banner');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });
      
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }
      
      let response;
      if (editingBanner) {
        response = await api.put(`/banners/admin/${editingBanner._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/banners/admin/create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      if (response.data.success) {
        message.success(`Banner ${editingBanner ? 'updated' : 'created'} successfully`);
        setModalVisible(false);
        fetchBanners();
        fetchStats();
      }
    } catch (error) {
      console.error('Submit failed:', error);
      message.error(error.response?.data?.message || `Failed to ${editingBanner ? 'update' : 'create'} banner`);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      Common: 'default',
      Rare: 'blue',
      Epic: 'purple',
      Legendary: 'gold',
      Mythic: 'red'
    };
    return colors[rarity] || 'default';
  };

  const columns = [
    {
      title: 'Preview',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 100,
      render: (imageUrl) => (
        <img 
          src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'}${imageUrl}`}
          alt="Banner"
          style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
        />
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `₹${price}`,
      sorter: (a, b) => a.price - b.price
    },
    {
      title: 'Rarity',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (rarity) => <Tag color={getRarityColor(rarity)}>{rarity}</Tag>,
      filters: [
        { text: 'Common', value: 'Common' },
        { text: 'Rare', value: 'Rare' },
        { text: 'Epic', value: 'Epic' },
        { text: 'Legendary', value: 'Legendary' },
        { text: 'Mythic', value: 'Mythic' }
      ],
      onFilter: (value, record) => record.rarity === value
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag>{category}</Tag>
    },
    {
      title: 'Effect',
      dataIndex: 'effect',
      key: 'effect',
      render: (effect) => effect !== 'none' ? <Tag color="purple">{effect}</Tag> : <Text type="secondary">None</Text>
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock) => stock === -1 ? <Tag color="green">Unlimited</Tag> : <Text>{stock}</Text>
    },
    {
      title: 'Purchases',
      dataIndex: 'purchaseCount',
      key: 'purchaseCount',
      sorter: (a, b) => a.purchaseCount - b.purchaseCount
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        isActive ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag> : 
          <Tag color="error" icon={<CloseCircleOutlined />}>Inactive</Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value, record) => record.isActive === value
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete banner?"
            description="This will remove the banner from all users' inventories."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>🎨 Banner Management</Title>

      {/* Statistics */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic title="Total Banners" value={stats.totalBanners} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Active Banners" value={stats.activeBanners} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Total Purchases" value={stats.totalPurchases} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Revenue" 
                value={stats.totalPurchases * 100} 
                prefix="₹"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Banners Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>All Banners</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Create Banner
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={banners}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingBanner ? 'Edit Banner' : 'Create New Banner'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText={editingBanner ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Banner Name"
            rules={[{ required: true, message: 'Please enter banner name' }]}
          >
            <Input placeholder="e.g., Fire Dragon Banner" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Banner description..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Price (₹)"
                rules={[{ required: true, message: 'Please enter price' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="Stock (-1 for unlimited)"
                initialValue={-1}
              >
                <InputNumber min={-1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rarity"
                label="Rarity"
                rules={[{ required: true, message: 'Please select rarity' }]}
              >
                <Select>
                  <Option value="Common">Common</Option>
                  <Option value="Rare">Rare</Option>
                  <Option value="Epic">Epic</Option>
                  <Option value="Legendary">Legendary</Option>
                  <Option value="Mythic">Mythic</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select>
                  <Option value="Fire">Fire</Option>
                  <Option value="Ice">Ice</Option>
                  <Option value="Thunder">Thunder</Option>
                  <Option value="Diamond">Diamond</Option>
                  <Option value="Season">Season</Option>
                  <Option value="Special">Special</Option>
                  <Option value="Default">Default</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="effect"
                label="Visual Effect"
                initialValue="none"
              >
                <Select>
                  <Option value="none">No Effect</Option>
                  <Option value="glow">Glow</Option>
                  <Option value="fire">Fire</Option>
                  <Option value="neon">Neon</Option>
                  <Option value="ice">Ice</Option>
                  <Option value="thunder">Thunder</Option>
                  <Option value="sparkle">Sparkle</Option>
                  <Option value="animated">Animated</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="effectColor"
                label="Effect Color"
                initialValue="#FFD700"
              >
                <Input type="color" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="season"
            label="Season (optional)"
          >
            <Input placeholder="e.g., Season 12" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            initialValue={true}
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Banner Image">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
            {!editingBanner && (
              <Text type="secondary">Required for new banners. Recommended: 800x400px</Text>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BannerManagement;

