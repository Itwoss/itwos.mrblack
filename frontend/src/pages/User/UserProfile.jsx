import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Card,
  Tabs,
  Tag,
  Badge,
  Divider,
  Spin,
  Empty,
  message,
  Grid,
  Dropdown,
  Tooltip
} from 'antd'
import {
  UserOutlined,
  MessageOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  LockOutlined,
  EditOutlined,
  MoreOutlined,
  HeartOutlined,
  BookOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import api, { usersListAPI, threadsAPI, followAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import UserLayout from '../../components/UserLayout'

const { Title, Paragraph, Text } = Typography

const UserProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('posts')
  const [bioExpanded, setBioExpanded] = useState(false)
  const BIO_MAX_LENGTH = 150 // Characters to show before "View More"

  useEffect(() => {
    console.log('UserProfile useEffect - userId:', userId)
    if (userId) {
      setBioExpanded(false) // Reset bio expansion when user changes
      loadUserProfile()
      checkFollowStatus()
      loadStats()
    } else {
      console.error('No userId in params')
      message.error('Invalid user ID')
      navigate('/discover')
    }
  }, [userId])

  // Refresh profile when viewing own profile and currentUser verification status changes
  useEffect(() => {
    const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                         currentUser?.id?.toString() === userId?.toString();
    
    if (isOwnProfile && currentUser && profileUser) {
      // Update profileUser with latest verification status from context
      const currentUserVerified = currentUser.isVerified;
      const currentUserVerifiedTill = currentUser.verifiedTill;
      const profileUserVerified = profileUser.isVerified;
      const profileUserVerifiedTill = profileUser.verifiedTill;
      
      if (currentUserVerified !== profileUserVerified || 
          currentUserVerifiedTill !== profileUserVerifiedTill) {
        console.log('🔄 Updating profile verification status from context:', {
          currentUser: { isVerified: currentUserVerified, verifiedTill: currentUserVerifiedTill },
          profileUser: { isVerified: profileUserVerified, verifiedTill: profileUserVerifiedTill }
        });
        setProfileUser(prev => ({
          ...prev,
          isVerified: currentUserVerified,
          verifiedTill: currentUserVerifiedTill
        }));
      }
    }
  }, [currentUser?.isVerified, currentUser?.verifiedTill, userId, currentUser?._id, profileUser])
  
  // Also reload profile when viewing own profile and user context changes significantly
  useEffect(() => {
    const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                         currentUser?.id?.toString() === userId?.toString();
    
    if (isOwnProfile && currentUser?.isVerified && !profileUser?.isVerified) {
      console.log('🔄 Reloading profile to get verification status');
      loadUserProfile();
    }
  }, [currentUser?.isVerified])

  const loadUserProfile = async () => {
    if (!userId) {
      console.error('No userId provided')
      message.error('Invalid user ID')
      navigate('/discover')
      return
    }

    setLoading(true)
    try {
      console.log('Loading user profile for userId:', userId)
      
      // Try different API endpoints
      let response
      try {
        response = await api.get(`/users/${userId}`)
      } catch (err) {
        // Fallback: try usersListAPI
        console.log('Trying alternative endpoint...')
        const usersResponse = await usersListAPI.getUsers({ userId })
        if (usersResponse.data.success && usersResponse.data.users?.length > 0) {
          setProfileUser(usersResponse.data.users[0])
          setLoading(false)
          return
        }
        throw err
      }

      console.log('API Response:', response.data)
      
      if (response.data.success) {
        // Backend returns response.data.user (from users.js route line 178)
        const userData = response.data.user || response.data.data || response.data
        console.log('✅ Setting profile user:', userData)
        console.log('🔍 Verification fields:', {
          isVerified: userData?.isVerified,
          verifiedTill: userData?.verifiedTill,
          verifiedTillType: typeof userData?.verifiedTill,
          verifiedTillValue: userData?.verifiedTill ? new Date(userData.verifiedTill) : null
        })
        console.log('📋 All user fields:', Object.keys(userData || {}))
        
        if (!userData || (!userData._id && !userData.id)) {
          console.error('Invalid user data received:', userData)
          message.error('Invalid user data received')
          navigate('/discover')
          return
        }
        
        // Ensure bio and verification status are included
        const profileData = {
          ...userData,
          bio: userData.bio || null, // Explicitly set bio
          website: userData.website || null,
          location: userData.location || null,
          company: userData.company || null,
          jobTitle: userData.jobTitle || null,
          isVerified: userData.isVerified !== undefined ? userData.isVerified : false, // Include verification status
          verifiedTill: userData.verifiedTill || null // Include verification expiry
        }
        console.log('✅ Profile data with verification:', {
          isVerified: profileData.isVerified,
          verifiedTill: profileData.verifiedTill,
          verifiedTillDate: profileData.verifiedTill ? new Date(profileData.verifiedTill) : null,
          isCurrentlyVerified: profileData.isVerified && profileData.verifiedTill && new Date(profileData.verifiedTill) > new Date()
        })
        setProfileUser(profileData)
      } else {
        console.error('API returned success=false:', response.data)
        message.error(response.data.message || 'User not found')
        // Don't navigate immediately - let user see error
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Don't navigate away immediately - show error but keep on page
      message.error(error.response?.data?.message || 'Failed to load user profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    try {
      // Use dedicated check endpoint for accurate follow status
      const response = await followAPI.checkFollowStatus(userId)
      if (response.data.success) {
        const isFollowing = response.data.isFollowing || false
        setFollowing(isFollowing)
        console.log('✅ Follow status checked:', { userId, isFollowing, followStatus: response.data.followStatus })
      } else {
        console.warn('Follow status check returned success=false:', response.data)
        setFollowing(false)
      }
    } catch (error) {
      console.error('❌ Error checking follow status:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      // Fallback: try checking following list
      try {
        const fallbackResponse = await followAPI.getFollowing()
        if (fallbackResponse.data.success && fallbackResponse.data.following) {
          const followingList = fallbackResponse.data.following
          const userIdStr = userId?.toString()
          const isFollowing = Array.isArray(followingList) 
            ? followingList.some(user => {
                const useridStr = user._id?.toString() || user._id
                return useridStr === userIdStr || user._id === userId
              })
            : false
          setFollowing(isFollowing)
          console.log('✅ Fallback follow status checked:', { userId, isFollowing })
        }
      } catch (fallbackError) {
        console.error('Fallback check also failed:', fallbackError)
        setFollowing(false) // Default to not following on error
      }
    }
  }

  const loadStats = async () => {
    try {
      // Load followers count
      const followersRes = await api.get(`/follow/followers/${userId}`)
      if (followersRes.data.success) {
        setFollowersCount(followersRes.data.followers?.length || 0)
      }

      // Load following count
      const followingRes = await api.get(`/follow/following/${userId}`)
      if (followingRes.data.success) {
        setFollowingCount(followingRes.data.following?.length || 0)
      }

      // Load posts count (if you have posts/content)
      // const postsRes = await api.get(`/users/${userId}/posts`)
      // setPostsCount(postsRes.data.posts?.length || 0)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFollow = async () => {
    try {
      if (following) {
        // Unfollow user
        console.log('📤 Unfollowing user:', userId)
        const response = await followAPI.unfollow(userId)
        console.log('📤 Unfollow response:', response.data)
        
        if (response.data.success) {
          setFollowing(false)
          setFollowersCount(prev => Math.max(0, prev - 1))
          message.success('Unfollowed successfully')
          // Refresh follow status to ensure consistency
          setTimeout(() => {
            checkFollowStatus()
            loadStats()
          }, 500)
        } else {
          message.error(response.data.message || 'Failed to unfollow user')
        }
      } else {
        // Follow user (send follow request)
        console.log('📤 Sending follow request to user:', userId)
        const response = await followAPI.sendFollowRequest(userId)
        console.log('📤 Follow request response:', response.data)
        
        if (response.data.success) {
          // Check if follow was accepted immediately (public account) or pending (private account)
          const followStatus = response.data.follow?.status
          const isAccepted = followStatus === 'accepted'
          
          if (isAccepted) {
            setFollowing(true)
            setFollowersCount(prev => prev + 1)
            message.success('Following successfully')
          } else {
            // Follow request sent but pending approval
            message.success('Follow request sent! Waiting for approval.')
          }
          // Refresh follow status to ensure consistency across all pages
          setTimeout(() => {
            checkFollowStatus()
            loadStats()
          }, 500)
        } else {
          message.error(response.data.message || 'Failed to send follow request')
        }
      }
    } catch (error) {
      console.error('❌ Error following/unfollowing:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      if (error.response?.status === 401) {
        message.error('Authentication failed. Please login again.')
      } else if (error.response?.status === 403) {
        message.error('Access denied. You do not have permission to perform this action.')
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid request. Please check your input.'
        message.error(errorMessage)
      } else if (error.response?.status === 404) {
        message.error('User not found.')
      } else if (error.response?.status === 500) {
        message.error('Server error. Please try again later.')
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message.error('Cannot connect to server. Please check your connection.')
      } else {
        const errorMsg = error.response?.data?.message || error.message || 'Failed to update follow status. Please try again.'
        message.error(errorMsg)
      }
    }
  }

  const handleStartChat = async () => {
    try {
      const response = await threadsAPI.createThread([userId])
      if (response.data.success) {
        navigate('/chat')
      }
    } catch (error) {
      console.error('Start chat error:', error)
      navigate('/chat')
    }
  }

  const isOwnProfile = currentUser?._id === userId || currentUser?.id === userId || currentUser?._id?.toString() === userId?.toString()

  if (loading) {
    return (
      <UserLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" />
        </div>
      </UserLayout>
    )
  }

  if (!profileUser && !loading) {
    return (
      <UserLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty 
            description={
              <div>
                <Title level={4}>User not found</Title>
                <Paragraph>Unable to load user profile. Please try again.</Paragraph>
                <Button type="primary" onClick={() => navigate('/discover')}>
                  Go to Discover Users
                </Button>
              </div>
            } 
          />
        </div>
      </UserLayout>
    )
  }

  if (!profileUser) {
    return null // Still loading
  }

  console.log('🔍 UserProfile render - profileUser:', profileUser, 'isOwnProfile:', isOwnProfile)

  return (
    <UserLayout>
      <div style={{ maxWidth: '935px', margin: '0 auto', padding: '20px' }}>
        {/* Profile Header - Instagram Style */}
        <div style={{ marginBottom: '44px' }}>
          <Row gutter={[30, 20]}>
            {/* Profile Picture */}
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={150}
                  src={getUserAvatarUrl(profileUser)}
                  icon={<UserOutlined />}
                  style={{ border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.0975)' }}
                >
                  {getUserInitials(profileUser.name)}
                </Avatar>
                {profileUser.isOnline && (
                  <Badge
                    status="success"
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      border: '3px solid #fff',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </div>
            </Col>

            {/* Profile Info */}
            <Col xs={24} sm={16}>
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                {/* Top row with username and 3-dot menu */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between', 
                  marginBottom: '20px', 
                  width: '100%',
                  position: 'relative',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space align="center" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
                      <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 300 }}>
                        {profileUser.name}
                      </Title>
                      {(() => {
                        const isVerified = profileUser.isVerified === true || profileUser.isVerified === 'true';
                        const verifiedTill = profileUser.verifiedTill;
                        
                        // Check if verification is still valid
                        let isCurrentlyVerified = false;
                        if (isVerified) {
                          if (verifiedTill) {
                            try {
                              const expiryDate = new Date(verifiedTill);
                              const now = new Date();
                              isCurrentlyVerified = expiryDate > now;
                            } catch (e) {
                              console.error('Error parsing verifiedTill date:', e);
                              // If date parsing fails but isVerified is true, show badge anyway
                              isCurrentlyVerified = true;
                            }
                          } else {
                            // If isVerified is true but no expiry date, show badge
                            isCurrentlyVerified = true;
                          }
                        }
                        
                        console.log('🔍 Badge check:', {
                          isVerified,
                          verifiedTill,
                          verifiedTillDate: verifiedTill ? new Date(verifiedTill) : null,
                          currentDate: new Date(),
                          isCurrentlyVerified,
                          willShow: isCurrentlyVerified,
                          profileUserKeys: Object.keys(profileUser || {})
                        });
                        
                        return isCurrentlyVerified ? (
                          <Tooltip title="Verified Account">
                            <div style={{ 
                              marginLeft: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              verticalAlign: 'middle'
                            }}>
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(10, 132, 255, 0.4))'
                                }}
                              >
                                <defs>
                                  <linearGradient id={`verifiedBadgeGradient-${profileUser._id || 'default'}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#5AAFFF" />
                                    <stop offset="50%" stopColor="#3A9EFF" />
                                    <stop offset="100%" stopColor="#0A84FF" />
                                  </linearGradient>
                                </defs>
                                {/* 12-pointed badge shape matching the design */}
                                <path 
                                  d="M12 2L13.09 6.26L17.5 6.26L14.21 9.09L15.32 13.5L12 10.68L8.68 13.5L9.79 9.09L6.5 6.26L10.91 6.26L12 2Z" 
                                  fill={`url(#verifiedBadgeGradient-${profileUser._id || 'default'})`}
                                />
                                {/* White checkmark */}
                                <path 
                                  d="M9 12L11 14L15 10" 
                                  stroke="white" 
                                  strokeWidth="2.2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                              </svg>
                            </div>
                          </Tooltip>
                        ) : null;
                      })()}
                      {profileUser.isPrivate && (
                        <LockOutlined style={{ fontSize: '20px', color: '#999' }} />
                      )}
                    </Space>
                  </div>
                  {/* 3-dot menu in top right - Always visible */}
                  <Dropdown
                    menu={{
                      items: [
                        ...(!isOwnProfile ? [
                          {
                            key: 'startChat',
                            label: (
                              <Space>
                                <MessageOutlined />
                                <span>Start Chat</span>
                              </Space>
                            ),
                            onClick: () => {
                              console.log('🔍 Start Chat clicked from dropdown')
                              handleStartChat()
                            }
                          }
                        ] : [
                          {
                            key: 'settings',
                            label: (
                              <Space>
                                <EditOutlined />
                                <span>Settings</span>
                              </Space>
                            ),
                            onClick: () => navigate('/settings')
                          }
                        ]),
                        // Joined date - always show
                        ...(profileUser.createdAt ? [{
                          key: 'joinedDate',
                          label: (
                            <Space>
                              <CalendarOutlined />
                              <span>Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                            </Space>
                          ),
                          disabled: true,
                          style: { cursor: 'default' }
                        }] : [])
                      ]
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="default"
                      shape="circle"
                      icon={<MoreOutlined />}
                      size="large"
                      style={{ 
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        border: '1px solid #d9d9d9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        console.log('🔍 3-dot menu button clicked')
                        e.stopPropagation()
                      }}
                    />
                  </Dropdown>
                </div>
                {/* Action buttons row */}
                <Space align="center" style={{ flexWrap: 'wrap' }}>
                  {!isOwnProfile && (
                    <Button
                      type={following ? 'default' : 'primary'}
                      icon={following ? <UserDeleteOutlined /> : <UserAddOutlined />}
                      onClick={handleFollow}
                      style={{ borderRadius: '4px', fontWeight: 600 }}
                    >
                      {following ? 'Following' : 'Follow'}
                    </Button>
                  )}
                  {isOwnProfile && (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => navigate('/settings')}
                      style={{ borderRadius: '4px', fontWeight: 600 }}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Space>
              </div>

              {/* Stats */}
              <Space size="large" style={{ marginBottom: '20px', fontSize: '16px' }}>
                <div>
                  <Text strong style={{ fontSize: '16px' }}>{postsCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>posts</Text>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${userId}/followers`)}>
                  <Text strong style={{ fontSize: '16px' }}>{followersCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>followers</Text>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${userId}/following`)}>
                  <Text strong style={{ fontSize: '16px' }}>{followingCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>following</Text>
                </div>
              </Space>

              {/* Bio and Details */}
              <div style={{ marginBottom: '12px' }}>
                {/* Bio Section - Always show (Instagram style) */}
                <div style={{ marginBottom: '12px', minHeight: '24px' }}>
                  {profileUser.bio && profileUser.bio.trim() ? (
                    <div>
                      <Paragraph 
                        style={{ 
                          marginBottom: '8px', 
                          fontSize: '16px', 
                          lineHeight: '1.5', 
                          color: '#262626', 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          margin: 0
                        }}
                      >
                        {bioExpanded || profileUser.bio.length <= BIO_MAX_LENGTH 
                          ? profileUser.bio 
                          : `${profileUser.bio.substring(0, BIO_MAX_LENGTH)}...`}
                      </Paragraph>
                      {profileUser.bio.length > BIO_MAX_LENGTH && (
                        <Button
                          type="link"
                          onClick={() => setBioExpanded(!bioExpanded)}
                          style={{ 
                            padding: 0, 
                            height: 'auto', 
                            fontSize: '16px',
                            color: '#8e8e8e',
                            fontWeight: 400
                          }}
                        >
                          {bioExpanded ? 'Show less' : 'View more'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Show placeholder for empty bio (Instagram style)
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: '16px', 
                        lineHeight: '1.5', 
                        color: '#999',
                        fontStyle: 'italic'
                      }}
                    >
                      No bio yet
                    </Text>
                  )}
                </div>
                
                {/* Website */}
                {profileUser.website && (
                  <div style={{ marginBottom: '8px' }}>
                    <a
                      href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00376b', textDecoration: 'none', fontSize: '16px', fontWeight: 500 }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      <GlobalOutlined style={{ marginRight: '4px' }} />
                      {profileUser.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {/* Location */}
                {profileUser.location && (
                  <div style={{ marginBottom: '8px', fontSize: '16px', color: '#262626' }}>
                    <EnvironmentOutlined style={{ marginRight: '4px', color: '#666' }} />
                    {profileUser.location}
                  </div>
                )}
                
                {/* Company and Job Title */}
                {(profileUser.company || profileUser.jobTitle) && (
                  <div style={{ marginBottom: '8px', fontSize: '16px', color: '#262626' }}>
                    {profileUser.company && <span>{profileUser.company}</span>}
                    {profileUser.company && profileUser.jobTitle && <span> • </span>}
                    {profileUser.jobTitle && <span>{profileUser.jobTitle}</span>}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '0 0 0 0' }} />

        {/* Tabs - Instagram Style */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ borderBottom: '1px solid #dbdbdb' }}
          items={[
            {
              key: 'posts',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <BookOutlined style={{ marginRight: '6px' }} />
                  Posts
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No posts yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            },
            {
              key: 'products',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <ShoppingCartOutlined style={{ marginRight: '6px' }} />
                  Products
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No products yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            },
            {
              key: 'saved',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <HeartOutlined style={{ marginRight: '6px' }} />
                  Saved
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No saved items"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            }
          ]}
        />
      </div>
    </UserLayout>
  )
}

export default UserProfile

