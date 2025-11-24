import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, message, Spin, Empty, Row, Col, Typography, Badge, Modal, Select } from 'antd';
import { CrownOutlined, FireOutlined, ThunderboltOutlined, ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './BannerStore.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const BannerStore = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchBanners();
    fetchInventory();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/banners');
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

  const fetchInventory = async () => {
    try {
      const response = await api.get('/banners/user/inventory');
      if (response.data.success) {
        setInventory(response.data.inventory);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const handlePurchase = async (bannerId) => {
    try {
      setPurchasing(bannerId);
      
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = async () => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
          if (!token) {
            message.error('Please login to purchase banners');
            setPurchasing(null);
            return;
          }

          // Get banner details for display
          const banner = banners.find(b => b._id === bannerId);
          if (!banner) {
            message.error('Banner not found');
            setPurchasing(null);
            return;
          }

          // Create payment order
          const orderResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000/api'}/banners/user/purchase/${bannerId}/create-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!orderResponse.ok) {
            const errorData = await orderResponse.json();
            throw new Error(errorData.message || 'Failed to create payment order');
          }

          const orderData = await orderResponse.json();
          
          if (!orderData.success) {
            throw new Error(orderData.message || 'Failed to create payment order');
          }

          // Get user info for prefill
          const userResponse = await api.get('/users/me');
          const user = userResponse.data?.user || userResponse.data;

          // Initialize Razorpay checkout
          const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.data.key || 'rzp_live_RUuZIGTpYBor0z';
          const options = {
            key: RAZORPAY_KEY,
            amount: orderData.data.amount,
            currency: orderData.data.currency,
            name: 'ITWOS AI',
            description: `Banner: ${banner.name}`,
            order_id: orderData.data.order_id,
            handler: async function (response) {
              try {
                // Verify payment
                const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000/api'}/banners/user/purchase/${bannerId}/verify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });

                const verifyData = await verifyResponse.json();

                if (verifyData.success) {
                  message.success('Banner purchased successfully! 🎉');
                  // Redirect to My Banners page with purchase info
                  navigate('/dashboard/banner-inventory', {
                    state: {
                      message: 'Banner purchased successfully!',
                      type: 'success',
                      purchasedBannerId: bannerId,
                      wasAutoEquipped: verifyData.wasAutoEquipped || false,
                      hadEquippedBanner: verifyData.hadEquippedBanner || false,
                      bannerName: banner.name
                    }
                  });
                } else {
                  message.error(verifyData.message || 'Payment verification failed');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                message.error('Payment verification failed. Please contact support.');
              } finally {
                setPurchasing(null);
              }
            },
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone || ''
            },
            theme: {
              color: '#1890ff'
            },
            modal: {
              ondismiss: function() {
                setPurchasing(null);
              }
            }
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (error) {
          console.error('Purchase error:', error);
          message.error(error.message || 'Failed to initiate payment');
          setPurchasing(null);
        }
      };
      
      script.onerror = () => {
        message.error('Failed to load payment gateway');
        setPurchasing(null);
      };
      
      // Check if script already exists
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        script.onload();
      } else {
        document.body.appendChild(script);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      message.error(error.response?.data?.message || 'Failed to purchase banner');
      setPurchasing(null);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      Common: '#95a5a6',
      Rare: '#3498db',
      Epic: '#9b59b6',
      Legendary: '#f39c12',
      Mythic: '#e74c3c'
    };
    return colors[rarity] || '#95a5a6';
  };

  const getRarityIcon = (rarity) => {
    if (rarity === 'Legendary' || rarity === 'Mythic') return <CrownOutlined />;
    if (rarity === 'Epic') return <ThunderboltOutlined />;
    if (rarity === 'Rare') return <FireOutlined />;
    return null;
  };

  const isOwned = (bannerId) => {
    return inventory.some(item => item._id === bannerId);
  };

  const filteredBanners = banners.filter(banner => {
    if (filterRarity !== 'all' && banner.rarity !== filterRarity) return false;
    if (filterCategory !== 'all' && banner.category !== filterCategory) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>
          <Text type="secondary">Loading banners...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#fff'
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: '8px' }}>
          🎨 Banner Store
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '16px' }}>
          Customize your profile with exclusive banners! Choose from Fire, Ice, Thunder, and more.
        </Paragraph>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text strong style={{ marginRight: '8px' }}>Rarity:</Text>
            <Select
              value={filterRarity}
              onChange={setFilterRarity}
              style={{ width: 200 }}
            >
              <Option value="all">All Rarities</Option>
              <Option value="Common">Common</Option>
              <Option value="Rare">Rare</Option>
              <Option value="Epic">Epic</Option>
              <Option value="Legendary">Legendary</Option>
              <Option value="Mythic">Mythic</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text strong style={{ marginRight: '8px' }}>Category:</Text>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 200 }}
            >
              <Option value="all">All Categories</Option>
              <Option value="Fire">Fire</Option>
              <Option value="Ice">Ice</Option>
              <Option value="Thunder">Thunder</Option>
              <Option value="Diamond">Diamond</Option>
              <Option value="Season">Season</Option>
              <Option value="Special">Special</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Banner Grid */}
      {filteredBanners.length === 0 ? (
        <Empty description="No banners available" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredBanners.map((banner) => {
            const owned = isOwned(banner._id);
            const isPurchasing = purchasing === banner._id;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={banner._id}>
                <Badge.Ribbon
                  text={banner.rarity}
                  color={getRarityColor(banner.rarity)}
                  style={{ fontSize: '12px' }}
                >
                  <Card
                    hoverable={!owned}
                    className={`banner-card banner-${banner.effect}`}
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: `2px solid ${getRarityColor(banner.rarity)}`,
                      opacity: owned ? 0.7 : 1
                    }}
                    cover={
                      <div style={{ 
                        height: '200px',
                        background: `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'}${banner.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        {owned && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.7)',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            color: '#fff',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircleOutlined /> Owned
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Title level={5} style={{ margin: '8px 0', fontSize: '16px' }}>
                        {banner.name}
                      </Title>
                      
                      {banner.description && (
                        <Paragraph 
                          type="secondary" 
                          style={{ fontSize: '12px', marginBottom: '12px', minHeight: '36px' }}
                          ellipsis={{ rows: 2 }}
                        >
                          {banner.description}
                        </Paragraph>
                      )}

                      <div style={{ marginBottom: '12px' }}>
                        <Tag color={getRarityColor(banner.rarity)} icon={getRarityIcon(banner.rarity)}>
                          {banner.rarity}
                        </Tag>
                        {banner.category && (
                          <Tag>{banner.category}</Tag>
                        )}
                      </div>

                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        color: getRarityColor(banner.rarity),
                        marginBottom: '12px'
                      }}>
                        ₹{banner.price}
                      </div>

                      {owned ? (
                        <Button
                          type="default"
                          block
                          disabled
                          icon={<CheckCircleOutlined />}
                          style={{ borderRadius: '8px' }}
                        >
                          Already Owned
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          block
                          loading={isPurchasing}
                          onClick={() => handlePurchase(banner._id)}
                          icon={<ShoppingCartOutlined />}
                          style={{
                            borderRadius: '8px',
                            background: getRarityColor(banner.rarity),
                            borderColor: getRarityColor(banner.rarity)
                          }}
                        >
                          Purchase
                        </Button>
                      )}

                      {banner.stock !== -1 && (
                        <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                          Stock: {banner.stock} left
                        </Text>
                      )}
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default BannerStore;

