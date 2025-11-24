import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Empty, Row, Col, Typography, Badge, Tag, Avatar, Divider, Modal } from 'antd';
import { CheckCircleOutlined, CrownOutlined, UserOutlined, MessageOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContextOptimized';
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils';
import './BannerStore.css';

const { Title, Text, Paragraph } = Typography;

const BannerInventory = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [equippedBanner, setEquippedBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [equipModalVisible, setEquipModalVisible] = useState(false);
  const [purchasedBannerInfo, setPurchasedBannerInfo] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    // Check if redirected from purchase
    if (location.state?.purchasedBannerId) {
      const { purchasedBannerId, wasAutoEquipped, hadEquippedBanner, bannerName } = location.state;
      setPurchasedBannerInfo({
        bannerId: purchasedBannerId,
        wasAutoEquipped: wasAutoEquipped,
        hadEquippedBanner: hadEquippedBanner,
        bannerName: bannerName
      });
      
      // Show equip modal if banner was auto-equipped
      if (wasAutoEquipped) {
        setEquipModalVisible(true);
      }
      
      // Clear location state to prevent showing modal again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/banners/user/inventory');
      if (response.data.success) {
        setInventory(response.data.inventory);
        const equipped = response.data.equippedBanner;
        setEquippedBanner(equipped);
        // Auto-show preview of equipped banner
        if (equipped) {
          setPreviewBanner(null); // Clear any preview first
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      message.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (bannerId) => {
    try {
      setEquipping(bannerId);
      const response = await api.post(`/banners/user/equip/${bannerId}`);
      
      if (response.data.success) {
        message.success('Banner equipped successfully! 🎉');
        await fetchInventory();
        // Set preview to the newly equipped banner
        const banner = inventory.find(b => b._id === bannerId) || response.data.equippedBanner;
        if (banner) {
          setPreviewBanner(banner);
        }
        // Close equip modal if open
        setEquipModalVisible(false);
        setPurchasedBannerInfo(null);
      }
    } catch (error) {
      console.error('Equip failed:', error);
      message.error(error.response?.data?.message || 'Failed to equip banner');
    } finally {
      setEquipping(null);
    }
  };

  const handleEquipLater = () => {
    setEquipModalVisible(false);
    setPurchasedBannerInfo(null);
    message.info('You can equip this banner anytime from your inventory');
  };

  const handlePreviewBanner = (banner) => {
    setPreviewBanner(banner);
  };

  const handleUnequip = async () => {
    try {
      const response = await api.post('/banners/user/unequip');
      
      if (response.data.success) {
        message.success('Banner unequipped');
        fetchInventory();
      }
    } catch (error) {
      console.error('Unequip failed:', error);
      message.error('Failed to unequip banner');
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>
          <Text type="secondary">Loading inventory...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '32px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#fff'
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: '8px' }}>
          🎒 My Banner Inventory
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '16px' }}>
          Manage your banners and customize your profile
        </Paragraph>
      </div>

      {/* Currently Equipped Banner with Preview */}
      {equippedBanner && (
        <Card 
          style={{ 
            marginBottom: '32px',
            borderRadius: '16px',
            border: `3px solid ${getRarityColor(equippedBanner.rarity)}`,
            overflow: 'hidden'
          }}
        >
          <Title level={4} style={{ marginBottom: '16px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
            Currently Equipped
          </Title>
          <Row gutter={16} align="middle">
            <Col xs={24} md={8}>
              <div
                style={{
                  height: '200px',
                  borderRadius: '12px',
                  background: `url(${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${equippedBanner.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `2px solid ${getRarityColor(equippedBanner.rarity)}`
                }}
              />
            </Col>
            <Col xs={24} md={16}>
              <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
                {equippedBanner.name}
              </Title>
              <div style={{ marginBottom: '12px' }}>
                <Tag color={getRarityColor(equippedBanner.rarity)}>
                  {equippedBanner.rarity}
                </Tag>
                {equippedBanner.category && (
                  <Tag>{equippedBanner.category}</Tag>
                )}
                {equippedBanner.effect !== 'none' && (
                  <Tag color="purple">{equippedBanner.effect} effect</Tag>
                )}
              </div>
              {equippedBanner.description && (
                <Paragraph type="secondary">{equippedBanner.description}</Paragraph>
              )}
              <Button danger onClick={handleUnequip} style={{ marginTop: '12px' }}>
                Unequip Banner
              </Button>
            </Col>
          </Row>
          
          <Divider>Live Preview</Divider>
          
          {/* Chat Header Preview */}
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              <MessageOutlined style={{ marginRight: '8px' }} />
              Chat Header Preview
            </Text>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: `url(${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${equippedBanner.imageUrl}) center/cover no-repeat`,
                backgroundSize: 'cover',
                minHeight: '60px',
                position: 'relative',
                overflow: 'hidden',
                border: `2px solid ${getRarityColor(equippedBanner.rarity)}`
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.1) 100%)',
                zIndex: 1
              }} />
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <Avatar
                  src={getUserAvatarUrl(currentUser)}
                  icon={<UserOutlined />}
                  size={32}
                >
                  {getUserInitials(currentUser?.name)}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ 
                    fontSize: '14px', 
                    display: 'block',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    {currentUser?.name || 'User Name'}
                  </Text>
                  <Text type="secondary" style={{ 
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.9)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    Active now
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Preview Banner (when hovering or selecting) */}
      {previewBanner && previewBanner._id !== equippedBanner?._id && (
        <Card 
          style={{ 
            marginBottom: '32px',
            borderRadius: '16px',
            border: `2px dashed ${getRarityColor(previewBanner.rarity)}`,
            overflow: 'hidden',
            background: '#fafafa'
          }}
        >
          <Title level={4} style={{ marginBottom: '16px' }}>
            Preview: {previewBanner.name}
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div
                style={{
                  height: '200px',
                  borderRadius: '12px',
                  background: `url(${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${previewBanner.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `2px solid ${getRarityColor(previewBanner.rarity)}`
                }}
              />
            </Col>
            <Col xs={24} md={12}>
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: `url(${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${previewBanner.imageUrl}) center/cover no-repeat`,
                  backgroundSize: 'cover',
                  minHeight: '60px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `2px solid ${getRarityColor(previewBanner.rarity)}`
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.1) 100%)',
                  zIndex: 1
                }} />
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <Avatar
                    src={getUserAvatarUrl(currentUser)}
                    icon={<UserOutlined />}
                    size={32}
                  >
                    {getUserInitials(currentUser?.name)}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ 
                      fontSize: '14px', 
                      display: 'block',
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {currentUser?.name || 'User Name'}
                    </Text>
                  </div>
                </div>
              </div>
              <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
                This is how it will look in chat header
              </Text>
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              block
              onClick={() => handleEquip(previewBanner._id)}
              loading={equipping === previewBanner._id}
              style={{
                background: getRarityColor(previewBanner.rarity),
                borderColor: getRarityColor(previewBanner.rarity)
              }}
            >
              Equip This Banner
            </Button>
            <Button 
              type="text" 
              block
              onClick={() => setPreviewBanner(null)}
              style={{ marginTop: '8px' }}
            >
              Close Preview
            </Button>
          </div>
        </Card>
      )}

      {/* Inventory Grid */}
      <Title level={4} style={{ marginBottom: '16px' }}>
        All Banners ({inventory.length})
      </Title>

      {inventory.length === 0 ? (
        <Empty 
          description="No banners in inventory"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" href="/dashboard/store">
            Visit Store
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {inventory.map((banner) => {
            const isEquipped = equippedBanner && equippedBanner._id === banner._id;
            const isEquipping = equipping === banner._id;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={banner._id}>
                <Badge.Ribbon
                  text={banner.rarity}
                  color={getRarityColor(banner.rarity)}
                  style={{ fontSize: '12px' }}
                >
                  <Card
                    hoverable={!isEquipped}
                    className={`banner-card banner-${banner.effect}`}
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isEquipped 
                        ? `3px solid ${getRarityColor(banner.rarity)}` 
                        : `2px solid ${getRarityColor(banner.rarity)}`,
                      opacity: isEquipped ? 1 : 0.9
                    }}
                    cover={
                      <div style={{ 
                        height: '200px',
                        background: `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'}${banner.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        {isEquipped && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(82, 196, 26, 0.9)',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircleOutlined /> EQUIPPED
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Title level={5} style={{ margin: '8px 0', fontSize: '16px' }}>
                        {banner.name}
                      </Title>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <Tag color={getRarityColor(banner.rarity)}>
                          {banner.rarity}
                        </Tag>
                        {banner.category && (
                          <Tag>{banner.category}</Tag>
                        )}
                      </div>

                      {banner.purchasedAt && (
                        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '12px' }}>
                          Purchased: {new Date(banner.purchasedAt).toLocaleDateString()}
                        </Text>
                      )}

                      {isEquipped ? (
                        <Button
                          type="default"
                          block
                          disabled
                          icon={<CheckCircleOutlined />}
                          style={{ 
                            borderRadius: '8px',
                            background: '#f6ffed',
                            borderColor: '#52c41a',
                            color: '#52c41a'
                          }}
                        >
                          Currently Equipped
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="default"
                            block
                            onClick={() => handlePreviewBanner(banner)}
                            style={{
                              borderRadius: '8px',
                              marginBottom: '8px'
                            }}
                          >
                            Preview
                          </Button>
                          <Button
                            type="primary"
                            block
                            loading={isEquipping}
                            onClick={() => handleEquip(banner._id)}
                            style={{
                              borderRadius: '8px',
                              background: getRarityColor(banner.rarity),
                              borderColor: getRarityColor(banner.rarity)
                            }}
                          >
                            Equip Banner
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Equip Confirmation Modal - Shown after purchase */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
            <span>Banner Purchased Successfully! 🎉</span>
          </div>
        }
        open={equipModalVisible}
        onCancel={handleEquipLater}
        footer={[
          <Button key="later" onClick={handleEquipLater} icon={<ClockCircleOutlined />}>
            Equip Later
          </Button>,
          <Button
            key="equip"
            type="primary"
            onClick={() => {
              if (purchasedBannerInfo?.bannerId) {
                handleEquip(purchasedBannerInfo.bannerId);
              }
            }}
            loading={equipping === purchasedBannerInfo?.bannerId}
            icon={<CheckOutlined />}
            style={{
              background: purchasedBannerInfo ? getRarityColor(
                inventory.find(b => b._id === purchasedBannerInfo.bannerId)?.rarity || 'Common'
              ) : undefined
            }}
          >
            Keep Equipped
          </Button>
        ]}
        width={500}
      >
        {purchasedBannerInfo && (
          <div>
            <Paragraph>
              Your banner <Text strong>"{purchasedBannerInfo.bannerName}"</Text> has been automatically equipped!
            </Paragraph>
            <Paragraph>
              Would you like to keep it equipped or equip it later?
            </Paragraph>
            {purchasedBannerInfo.hadEquippedBanner && (
              <div style={{
                padding: '12px',
                background: '#fff7e6',
                borderRadius: '8px',
                marginTop: '16px',
                border: '1px solid #ffd591'
              }}>
                <Text type="warning">
                  ⚠️ Note: Your previous equipped banner has been replaced.
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BannerInventory;

