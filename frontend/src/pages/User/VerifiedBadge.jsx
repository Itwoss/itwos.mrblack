import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, message, Spin, Badge, Tag, Empty, Modal } from 'antd';
import { CheckCircleOutlined, CrownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContextOptimized';
import { useNavigate } from 'react-router-dom';
import api, { userAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const VerifiedBadge = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    fetchUserSubscriptions();
  }, []);

  useEffect(() => {
    // Refetch subscriptions when user verification status changes
    if (user?.isVerified || user?.verifiedTill) {
      fetchUserSubscriptions();
    }
  }, [user?.isVerified, user?.verifiedTill]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/plans');
      if (response.data.success) {
        setPlans(response.data.plans);
        console.log('✅ Subscription plans loaded:', response.data.plans);
      } else {
        message.error('Failed to load subscription plans');
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      message.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/current');
      if (response.data.success && response.data.subscription) {
        setCurrentSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch current subscription:', error);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions/my-subscriptions');
      if (response.data.success && response.data.subscriptions) {
        setUserSubscriptions(response.data.subscriptions);
      }
    } catch (error) {
      console.error('Failed to fetch user subscriptions:', error);
    }
  };

  const handleBuyPlan = async (planMonths) => {
    setSelectedPlan(planMonths);
    setProcessing(true);

    try {
      // Create Razorpay order
      const orderResponse = await api.post('/subscriptions/create-order', {
        planMonths: planMonths
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const { order_id, key, amount, planName, price } = orderResponse.data.data;

      // Initialize Razorpay
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: key,
          amount: amount,
          currency: 'INR',
          name: 'Verified Badge Subscription',
          description: `${planName} - Verified Blue Checkmark`,
          order_id: order_id,
          handler: async function (response) {
            try {
              // Verify payment on backend
              const verifyResponse = await api.post('/subscriptions/verify', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planMonths: planMonths
              });

              if (verifyResponse.data.success) {
                message.success('Subscription activated successfully! Your verified badge is now active.');
                
                // Show payment details
                const paymentDetails = verifyResponse.data.paymentDetails;
                if (paymentDetails) {
                  Modal.success({
                    title: '✅ Payment Successful!',
                    width: 600,
                    content: (
                      <div style={{ padding: '20px 0' }}>
                        <div style={{ marginBottom: '16px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#0369a1' }}>
                            Payment Details
                          </div>
                          <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Payment ID:</span>
                              <Text code copyable style={{ fontWeight: 'bold' }}>
                                {paymentDetails.paymentId}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Order ID:</span>
                              <Text code copyable style={{ fontWeight: 'bold' }}>
                                {paymentDetails.orderId}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Amount:</span>
                              <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                                ₹{paymentDetails.amount}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Plan:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {paymentDetails.planMonths} Month{paymentDetails.planMonths > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Expiry Date:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {new Date(paymentDetails.expiryDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Purchase Date:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {new Date(paymentDetails.purchaseDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                          A receipt has been sent to your email. Your verified badge is now active!
                        </div>
                      </div>
                    ),
                    okText: 'Got it!'
                  });
                }
                
                // Fetch updated user data from backend
                try {
                  const userResponse = await api.get('/users/me');
                  if (userResponse.data.success) {
                    // Backend returns user in response.data.user
                    const updatedUser = userResponse.data.user || userResponse.data.data;
                    if (updatedUser) {
                      // Update user context with fresh data including verification status
                      updateUser({
                        isVerified: updatedUser.isVerified,
                        verifiedTill: updatedUser.verifiedTill
                      });
                      console.log('✅ User verification status updated:', {
                        isVerified: updatedUser.isVerified,
                        verifiedTill: updatedUser.verifiedTill
                      });
                    }
                  }
                } catch (userError) {
                  console.error('Failed to fetch updated user data:', userError);
                  // Still update with data from verification response
                  if (verifyResponse.data.user) {
                    updateUser({
                      isVerified: verifyResponse.data.user.isVerified,
                      verifiedTill: verifyResponse.data.user.verifiedTill
                    });
                  }
                }
                
                await fetchCurrentSubscription();
                await fetchUserSubscriptions();
                setSelectedPlan(null);
                
                // Fetch updated user data from backend
                try {
                  const refreshedUser = await api.get('/users/me');
                  if (refreshedUser.data.success && refreshedUser.data.user) {
                    const updatedUserData = refreshedUser.data.user;
                    // Update user context with full user data
                    updateUser(updatedUserData);
                    console.log('✅ User context updated with verification:', {
                      isVerified: updatedUserData.isVerified,
                      verifiedTill: updatedUserData.verifiedTill
                    });
                    
                    // Navigate to user's profile to see the badge
                    if (updatedUserData._id || updatedUserData.id) {
                      const userId = updatedUserData._id || updatedUserData.id;
                      setTimeout(() => {
                        navigate(`/profile/${userId}`);
                        // Force reload after navigation to ensure badge shows
                        setTimeout(() => {
                          window.location.reload();
                        }, 500);
                      }, 1000);
                    }
                  }
                } catch (refreshError) {
                  console.error('Failed to refresh user data:', refreshError);
                }
              } else {
                throw new Error(verifyResponse.data.message || 'Payment verification failed');
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              message.error(error.response?.data?.message || 'Failed to verify payment. Please contact support.');
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          theme: {
            color: '#0A84FF'
          },
          modal: {
            ondismiss: function() {
              setProcessing(false);
              setSelectedPlan(null);
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response);
          message.error('Payment failed. Please try again.');
          setProcessing(false);
          setSelectedPlan(null);
        });
      };
      script.onerror = () => {
        message.error('Failed to load payment gateway');
        setProcessing(false);
        setSelectedPlan(null);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error creating order:', error);
      message.error(error.response?.data?.message || 'Failed to create payment order');
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const isVerified = user?.isVerified && user?.verifiedTill && new Date(user.verifiedTill) > new Date();

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
    }}>
      {/* Product Card */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginBottom: '32px',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff'
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            <CheckCircleOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>
              Blue Checkmark – Verified Badge
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              Get authenticity & priority status
            </Text>
          </div>
        </div>
        {isVerified && (
          <Tag 
            color="success" 
            style={{ 
              fontSize: '14px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff'
            }}
          >
            ✓ You are currently verified until {new Date(user.verifiedTill).toLocaleDateString()}
          </Tag>
        )}
      </Card>

      {/* Current Subscription Info */}
      {currentSubscription && (
        <Card
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e0e0e0'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '16px' }}>Current Subscription</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text>{currentSubscription.planMonths} Month Plan</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Expires: {new Date(currentSubscription.expiryDate).toLocaleDateString()}
                </Text>
              </div>
              <Tag color={currentSubscription.status === 'active' ? 'success' : 'default'}>
                {currentSubscription.status}
              </Tag>
            </div>
          </Space>
        </Card>
      )}

      {/* Plan Selector */}
      <Card
        title={
          <Title level={3} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            Choose Your Plan
          </Title>
        }
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: 'none'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">Loading subscription plans...</Text>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">No subscription plans available at the moment.</Text>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            {plans.map((plan) => {
            const isBestValue = plan.months === 6;
            const isSelected = selectedPlan === plan.id;
            const isProcessing = processing && selectedPlan === plan.id;
            
            // Check if user has purchased this plan
            // plan.id is the planMonths (1, 2, 3, 4, 5, 6)
            const planMonths = plan.id || plan.months;
            const hasPurchasedPlan = userSubscriptions.some(sub => 
              sub.planMonths === planMonths && 
              (sub.status === 'active' || (sub.expiryDate && new Date(sub.expiryDate) > new Date()))
            );
            const purchasedSubscription = userSubscriptions.find(sub => 
              sub.planMonths === planMonths && 
              (sub.status === 'active' || (sub.expiryDate && new Date(sub.expiryDate) > new Date()))
            );
            const isActive = purchasedSubscription && purchasedSubscription.status === 'active' && 
                             purchasedSubscription.expiryDate && 
                             new Date(purchasedSubscription.expiryDate) > new Date();

            return (
              <Card
                key={plan.id}
                hoverable
                style={{
                  borderRadius: '12px',
                  border: isBestValue ? '2px solid #0A84FF' : '1px solid #e0e0e0',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isBestValue ? '0 4px 12px rgba(10, 132, 255, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                {isBestValue && (
                  <Badge.Ribbon text="Best Value" color="#0A84FF" style={{ fontSize: '12px' }}>
                    <div />
                  </Badge.Ribbon>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '24px', color: '#0A84FF' }}>
                      ₹{plan.price}
                    </Text>
                  </div>
                  <Title level={4} style={{ margin: '8px 0', fontSize: '18px' }}>
                    {plan.name}
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: '14px', marginBottom: '20px' }}>
                    {plan.description || (plan.months === 1 && plan.price === 1 
                      ? 'Perfect for trying out - Special ₹1 offer!' 
                      : plan.months === 1 
                        ? 'Perfect for trying out' 
                        : `Get ${plan.months} months of verification`)}
                  </Paragraph>
                  {isActive ? (
                    <Button
                      type="default"
                      size="large"
                      block
                      disabled
                      style={{
                        borderRadius: '8px',
                        height: '44px',
                        fontSize: '16px',
                        fontWeight: 600,
                        background: '#f0f0f0',
                        border: '1px solid #d9d9d9',
                        color: '#666',
                        cursor: 'not-allowed'
                      }}
                    >
                      ✓ Active until {new Date(purchasedSubscription.expiryDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Button>
                  ) : hasPurchasedPlan ? (
                    <Button
                      type="default"
                      size="large"
                      block
                      disabled
                      style={{
                        borderRadius: '8px',
                        height: '44px',
                        fontSize: '16px',
                        fontWeight: 600,
                        background: '#f0f0f0',
                        border: '1px solid #d9d9d9',
                        color: '#666',
                        cursor: 'not-allowed'
                      }}
                    >
                      Purchased
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={isProcessing}
                      disabled={processing}
                      onClick={() => handleBuyPlan(plan.id)}
                      style={{
                        borderRadius: '8px',
                        height: '44px',
                        fontSize: '16px',
                        fontWeight: 600,
                        background: isBestValue ? 'linear-gradient(135deg, #0A84FF 0%, #147BFF 100%)' : '#0A84FF',
                        border: 'none',
                        boxShadow: isBestValue ? '0 4px 12px rgba(10, 132, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {isProcessing ? 'Processing...' : 'Buy Subscription'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          </div>
        )}
      </Card>

      {/* Features */}
      <Card
        style={{
          borderRadius: '12px',
          marginTop: '24px',
          border: 'none',
          background: '#f8f9fa'
        }}
      >
        <Title level={4} style={{ marginBottom: '16px' }}>What You Get</Title>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ color: '#0A84FF', fontSize: '20px' }} />
            <Text>Blue verified checkmark badge next to your username</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ color: '#0A84FF', fontSize: '20px' }} />
            <Text>Increased authenticity and trust</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ color: '#0A84FF', fontSize: '20px' }} />
            <Text>Priority status in search results</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ color: '#0A84FF', fontSize: '20px' }} />
            <Text>Automatic renewal reminder before expiry</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default VerifiedBadge;

