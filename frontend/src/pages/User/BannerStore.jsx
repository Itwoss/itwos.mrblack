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
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 16px',
        background: '#f5f7fa',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '12px' }}>
          <Text style={{ color: '#64748b', fontSize: '13px' }}>Loading banners...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      background: '#f5f7fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '16px',
        background: '#fff',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <Title level={2} style={{ 
          color: '#1e293b', 
          margin: 0, 
          marginBottom: '6px',
          fontSize: '20px',
          fontWeight: 600
        }}>
          🎨 Banner Store
        </Title>
        <Text style={{ color: '#64748b', fontSize: '13px', display: 'block' }}>
          Customize your profile with exclusive banners! Choose from Fire, Ice, Thunder, and more.
        </Text>
      </div>

      {/* Filters */}
      <Card 
        style={{ 
          marginBottom: '16px', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}
        styles={{ body: { padding: '12px' } }}
      >
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Text strong style={{ color: '#1e293b', fontSize: '13px' }}>Rarity:</Text>
              <Select
                value={filterRarity}
                onChange={setFilterRarity}
                style={{ flex: 1, maxWidth: '180px' }}
                size="small"
              >
                <Option value="all">All Rarities</Option>
                <Option value="Common">Common</Option>
                <Option value="Rare">Rare</Option>
                <Option value="Epic">Epic</Option>
                <Option value="Legendary">Legendary</Option>
                <Option value="Mythic">Mythic</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Text strong style={{ color: '#1e293b', fontSize: '13px' }}>Category:</Text>
              <Select
                value={filterCategory}
                onChange={setFilterCategory}
                style={{ flex: 1, maxWidth: '180px' }}
                size="small"
              >
                <Option value="all">All Categories</Option>
                <Option value="Fire">Fire</Option>
                <Option value="Ice">Ice</Option>
                <Option value="Thunder">Thunder</Option>
                <Option value="Diamond">Diamond</Option>
                <Option value="Season">Season</Option>
                <Option value="Special">Special</Option>
              </Select>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Banner Grid */}
      {filteredBanners.length === 0 ? (
        <Card style={{ 
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <Empty description={<Text style={{ color: '#64748b', fontSize: '13px' }}>No banners available</Text>} />
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {filteredBanners.map((banner) => {
            const owned = isOwned(banner._id);
            const isPurchasing = purchasing === banner._id;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={banner._id}>
                <Badge.Ribbon
                  text={banner.rarity}
                  color={getRarityColor(banner.rarity)}
                  style={{ fontSize: '11px', padding: '0 8px' }}
                >
                  <Card
                    hoverable={!owned}
                    className={`banner-card banner-${banner.effect}`}
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: `1px solid ${owned ? '#e2e8f0' : getRarityColor(banner.rarity)}`,
                      opacity: owned ? 0.85 : 1,
                      background: '#fff'
                    }}
                    styles={{ body: { padding: '12px' } }}
                    cover={
                      <div style={{ 
                        height: '160px',
                        background: `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'}${banner.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        {owned && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(34, 197, 94, 0.9)',
                            borderRadius: '12px',
                            padding: '3px 10px',
                            color: '#fff',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500
                          }}>
                            <CheckCircleOutlined style={{ fontSize: '11px' }} /> Owned
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Title level={5} style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}>
                        {banner.name}
                      </Title>
                      
                      {banner.description && (
                        <Paragraph 
                          style={{ 
                            fontSize: '12px', 
                            marginBottom: '10px', 
                            minHeight: '32px',
                            color: '#64748b'
                          }}
                          ellipsis={{ rows: 2 }}
                        >
                          {banner.description}
                        </Paragraph>
                      )}

                      <div style={{ 
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '6px',
                        flexWrap: 'wrap'
                      }}>
                        <Tag 
                          color={getRarityColor(banner.rarity)} 
                          icon={getRarityIcon(banner.rarity)}
                          style={{ 
                            fontSize: '11px',
                            padding: '2px 8px',
                            margin: 0
                          }}
                        >
                          {banner.rarity}
                        </Tag>
                        {banner.category && (
                          <Tag style={{ 
                            fontSize: '11px',
                            padding: '2px 8px',
                            margin: 0,
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #e2e8f0'
                          }}>
                            {banner.category}
                          </Tag>
                        )}
                      </div>

                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 700,
                        color: getRarityColor(banner.rarity),
                        marginBottom: '10px'
                      }}>
                        ₹{banner.price}
                      </div>

                      {owned ? (
                        <Button
                          type="default"
                          block
                          disabled
                          icon={<CheckCircleOutlined style={{ fontSize: '12px' }} />}
                          style={{ 
                            borderRadius: '6px',
                            fontSize: '12px',
                            height: '32px',
                            background: '#f1f5f9',
                            borderColor: '#e2e8f0',
                            color: '#64748b'
                          }}
                        >
                          Already Owned
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          block
                          loading={isPurchasing}
                          onClick={() => handlePurchase(banner._id)}
                          icon={<ShoppingCartOutlined style={{ fontSize: '12px' }} />}
                          style={{
                            borderRadius: '6px',
                            fontSize: '12px',
                            height: '32px',
                            background: getRarityColor(banner.rarity),
                            borderColor: getRarityColor(banner.rarity)
                          }}
                        >
                          Purchase
                        </Button>
                      )}

                      {banner.stock !== -1 && (
                        <Text style={{ 
                          fontSize: '11px', 
                          marginTop: '8px', 
                          display: 'block',
                          color: '#64748b'
                        }}>
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

