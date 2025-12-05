import React, { useState, useEffect, useRef } from 'react'
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
  DeleteOutlined,
  SoundOutlined,
  PlayCircleOutlined,
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
  const [followRequestSent, setFollowRequestSent] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('posts')
  const [bioExpanded, setBioExpanded] = useState(false)
  const [userPosts, setUserPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [savedPosts, setSavedPosts] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const BIO_MAX_LENGTH = 150 // Characters to show before "View More"
  
  // Request cancellation refs to prevent duplicate calls
  const abortControllerRef = useRef(null)
  const isInitializingRef = useRef(false)

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    console.log('UserProfile useEffect - userId:', userId)
    console.log('UserProfile useEffect - currentUser:', currentUser)
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // If no userId in params, try to use current user's ID
    if (!userId) {
      const currentUserId = currentUser?._id || currentUser?.id
      if (currentUserId) {
        console.log('No userId in params, using current user ID:', currentUserId)
        navigate(`/profile/${currentUserId}`, { replace: true })
        return
      } else {
        console.error('No userId in params and no current user')
        message.error('Invalid user ID')
        navigate('/discover')
        return
      }
    }
    
    if (userId && !isInitializingRef.current) {
      isInitializingRef.current = true
      setBioExpanded(false) // Reset bio expansion when user changes
      
      // Create new abort controller for this request sequence
      abortControllerRef.current = new AbortController()
      
      // Load data sequentially: profile -> follow status -> stats
      const loadDataSequentially = async () => {
        try {
          // Step 1: Load user profile first
          await loadUserProfile()
          
          // Step 2: Check follow status (only if not own profile)
          const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                               currentUser?.id?.toString() === userId?.toString()
          if (!isOwnProfile) {
            await checkFollowStatus()
          }
          
          // Step 3: Load stats last
          await loadStats()
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error in sequential data loading:', error)
          }
        } finally {
          isInitializingRef.current = false
        }
      }
      
      loadDataSequentially()
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      isInitializingRef.current = false
    }
  }, [userId, currentUser])

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
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      // Try different API endpoints with timeout protection
      let response
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        })
        
        const apiPromise = api.get(`/users/${userId}`, {
          signal: abortControllerRef.current?.signal
        })
        
        response = await Promise.race([apiPromise, timeoutPromise])
      } catch (err) {
        // Check if aborted
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return
        }
        
        // Fallback: try usersListAPI
        console.log('Trying alternative endpoint...')
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 25000)
          })
          
          const usersResponsePromise = usersListAPI.getUsers({ userId })
          const usersResponse = await Promise.race([usersResponsePromise, timeoutPromise])
          
          if (usersResponse.data.success && usersResponse.data.users?.length > 0) {
            setProfileUser(usersResponse.data.users[0])
            setLoading(false)
            return
          }
        } catch (fallbackErr) {
          if (fallbackErr.name !== 'AbortError') {
            throw err // Throw original error
          }
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
        console.log('📊 Follow counts:', {
          followersCount: userData?.followersCount,
          followingCount: userData?.followingCount
        })
        
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
          verifiedTill: userData.verifiedTill || null, // Include verification expiry
          followersCount: userData.followersCount || 0, // Include followers count
          followingCount: userData.followingCount || 0 // Include following count
        }
        console.log('✅ Profile data with verification:', {
          isVerified: profileData.isVerified,
          verifiedTill: profileData.verifiedTill,
          verifiedTillDate: profileData.verifiedTill ? new Date(profileData.verifiedTill) : null,
          isCurrentlyVerified: profileData.isVerified && profileData.verifiedTill && new Date(profileData.verifiedTill) > new Date(),
          followersCount: profileData.followersCount,
          followingCount: profileData.followingCount
        })
        setProfileUser(profileData)
        
        // Update counts immediately from profile data
        setFollowersCount(profileData.followersCount || 0)
        setFollowingCount(profileData.followingCount || 0)
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
    // Don't check if viewing own profile
    const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                         currentUser?.id?.toString() === userId?.toString()
    if (isOwnProfile) {
      return
    }
    
    // Check if request was aborted
    if (abortControllerRef.current?.signal.aborted) {
      return
    }
    
    try {
      // Use dedicated check endpoint for accurate follow status with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 25000)
      })
      
      const apiPromise = followAPI.checkFollowStatus(userId)
      const response = await Promise.race([apiPromise, timeoutPromise])
      
      if (response.data.success) {
        const status = response.data.status || response.data.followStatus
        const isFollowing = response.data.isFollowing || false
        
        if (status === 'accepted' || isFollowing) {
          setFollowing(true)
          setFollowRequestSent(false)
        } else if (status === 'pending') {
          setFollowing(false)
          setFollowRequestSent(true)
        } else {
          setFollowing(false)
          setFollowRequestSent(false)
        }
        console.log('✅ Follow status checked:', { userId, status, isFollowing, followRequestSent: status === 'pending' })
      } else {
        console.warn('Follow status check returned success=false:', response.data)
        setFollowing(false)
        setFollowRequestSent(false)
      }
    } catch (error) {
      // Check if aborted
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return
      }
      
      // Don't log timeout errors as errors - they're expected if backend is slow
      if (error.message === 'Request timeout') {
        console.warn('⚠️ Follow status check timed out, using default values')
        setFollowing(false)
        setFollowRequestSent(false)
        return
      }
      
      console.error('❌ Error checking follow status:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Fallback: try checking following list (only if not aborted)
      if (!abortControllerRef.current?.signal.aborted) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 25000)
          })
          
          const fallbackResponsePromise = followAPI.getFollowing()
          const fallbackResponse = await Promise.race([fallbackResponsePromise, timeoutPromise])
          
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
            setFollowRequestSent(false)
            console.log('✅ Fallback follow status checked:', { userId, isFollowing })
          }
        } catch (fallbackError) {
          if (fallbackError.name !== 'AbortError') {
            console.warn('Fallback check also failed:', fallbackError.message)
          }
          setFollowing(false) // Default to not following on error
          setFollowRequestSent(false)
        }
      }
    }
  }

  const loadStats = async () => {
    // Check if request was aborted
    if (abortControllerRef.current?.signal.aborted) {
      return
    }
    
    try {
      // First try to get counts from user profile data (already loaded)
      if (profileUser) {
        if (profileUser.followersCount !== undefined) {
          setFollowersCount(profileUser.followersCount || 0)
        }
        if (profileUser.followingCount !== undefined) {
          setFollowingCount(profileUser.followingCount || 0)
        }
      }

      // Also try to get from follow endpoints (with timeout)
      try {
        // Load followers count
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        })
        
        const followersResPromise = api.get(`/follow/followers/${userId}`, {
          signal: abortControllerRef.current?.signal
        })
        const followersRes = await Promise.race([followersResPromise, timeoutPromise])
        
        if (followersRes.data.success) {
          const count = followersRes.data.followers?.length || followersRes.data.count || 0
          setFollowersCount(count)
        }
      } catch (err) {
        // Check if aborted
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return
        }
        
        // Don't log timeout errors - use profileUser data as fallback
        if (err.message !== 'Request timeout') {
          console.warn('Error loading followers:', err.message)
        }
        // Fallback: use profileUser data if available
        if (profileUser?.followersCount !== undefined) {
          setFollowersCount(profileUser.followersCount || 0)
        }
      }

      // Check if aborted before next request
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      try {
        // Load following count
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        })
        
        const followingResPromise = api.get(`/follow/following/${userId}`, {
          signal: abortControllerRef.current?.signal
        })
        const followingRes = await Promise.race([followingResPromise, timeoutPromise])
        
        if (followingRes.data.success) {
          const count = followingRes.data.following?.length || followingRes.data.count || 0
          setFollowingCount(count)
        }
      } catch (err) {
        // Check if aborted
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return
        }
        
        // Don't log timeout errors - use profileUser data as fallback
        if (err.message !== 'Request timeout') {
          console.warn('Error loading following:', err.message)
        }
        // Fallback: use profileUser data if available
        if (profileUser?.followingCount !== undefined) {
          setFollowingCount(profileUser.followingCount || 0)
        }
      }

      // Check if aborted before posts request
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      // Load posts count
      const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                           currentUser?.id?.toString() === userId?.toString();
      
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        })
        
        let postsResPromise
        if (isOwnProfile) {
          // For own profile, use my-posts endpoint
          postsResPromise = api.get('/posts/my-posts?limit=1', {
            signal: abortControllerRef.current?.signal
          })
        } else {
          // For other users, try to get public posts count
          postsResPromise = api.get(`/posts/user/${userId}?limit=1`, {
            signal: abortControllerRef.current?.signal
          })
        }
        
        const postsRes = await Promise.race([postsResPromise, timeoutPromise])
        if (postsRes.data.success) {
          setPostsCount(postsRes.data.pagination?.total || 0)
        }
      } catch (err) {
        // Check if aborted
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return
        }
        
        // Don't log errors for posts count - it's optional
        if (err.message !== 'Request timeout' && !err.response?.status === 404) {
          console.warn('Error loading posts count:', err.message)
        }
      }
    } catch (error) {
      // Check if aborted
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return
      }
      console.error('Error loading stats:', error)
    }
  }

  const loadUserPosts = async () => {
    if (!userId) return;
    
    setLoadingPosts(true);
    try {
      const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                           currentUser?.id?.toString() === userId?.toString();
      
      let response;
      if (isOwnProfile) {
        // Load own posts
        response = await api.get('/posts/my-posts?limit=100')
      } else {
        // Load other user's public posts
        response = await api.get(`/posts/user/${userId}?limit=100`)
      }
      
      if (response.data?.success) {
        const posts = response.data.data || response.data.posts || [];
        setUserPosts(posts);
        setPostsCount(posts.length);
        setPostsLoaded(true);
        if (posts.length > 0) {
          setPostsCount(response.data.pagination?.total || posts.length);
        }
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
      setUserPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/posts/${postId}`);
      
      if (response.data?.success) {
        message.success('Post deleted successfully');
        // Remove post from local state
        setUserPosts(prev => prev.filter(post => post._id !== postId));
        setPostsCount(prev => Math.max(0, prev - 1));
      } else {
        message.error(response.data?.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      if (error.response?.status === 403) {
        message.error('You can only delete your own posts');
      } else if (error.response?.status === 404) {
        message.error('Post not found');
      } else {
        message.error(error.response?.data?.message || 'Failed to delete post');
      }
    }
  }

  const loadSavedPosts = async () => {
    if (!userId) return;
    
    setLoadingSaved(true);
    try {
      // Only load saved posts for own profile
      const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                           currentUser?.id?.toString() === userId?.toString();
      
      if (!isOwnProfile) {
        setSavedPosts([]);
        return;
      }
      
      // Get saved posts
      const response = await api.get('/posts/saved?limit=100');
      
      if (response.data?.success) {
        const posts = response.data.data || response.data.posts || [];
        setSavedPosts(posts);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  }

  // Load posts when posts tab is active or when profile loads
  useEffect(() => {
    if (userId && profileUser) {
      if (activeTab === 'posts' && !postsLoaded) {
        loadUserPosts();
      } else if (activeTab === 'saved') {
        loadSavedPosts();
      }
    }
  }, [activeTab, userId, profileUser, postsLoaded])

  // Auto-load posts when profile first loads
  useEffect(() => {
    if (userId && profileUser && activeTab === 'posts' && !postsLoaded && !loadingPosts) {
      loadUserPosts();
    }
  }, [userId, profileUser, postsLoaded, loadingPosts, activeTab])

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
          const isPending = followStatus === 'pending'
          
          if (isAccepted) {
            setFollowing(true)
            setFollowRequestSent(false)
            setFollowersCount(prev => prev + 1)
            message.success('Following successfully')
          } else if (isPending) {
            setFollowing(false)
            setFollowRequestSent(true)
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

  const loadPosts = async () => {
    if (!userId) return
    
    setPostsLoading(true)
    try {
      const response = await api.get(`/posts/user/${userId}?limit=100`)
      console.log('📸 Posts response:', response.data)
      
      if (response.data.success) {
        const postsData = response.data.data || response.data.posts || []
        setPosts(postsData)
        setPostsCount(postsData.length)
        console.log('✅ Loaded posts:', postsData.length)
      } else {
        console.error('Failed to load posts:', response.data.message)
        setPosts([])
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error)
      setPosts([])
      // Don't show error message if it's a privacy issue (expected behavior)
      if (error.response?.status !== 403 && error.response?.status !== 404) {
        message.error('Failed to load posts')
      }
    } finally {
      setPostsLoading(false)
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
      <div style={{ 
        maxWidth: '935px', 
        margin: '0 auto', 
        padding: isMobile ? '10px' : '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Profile Header - Instagram Style */}
        <div style={{ marginBottom: isMobile ? '20px' : '44px' }}>
          <Row gutter={[isMobile ? 16 : 30, isMobile ? 16 : 20]}>
            {/* Profile Picture */}
            <Col xs={24} sm={8} style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : 0 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={isMobile ? 100 : 150}
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
                      <Title level={2} style={{ 
                        margin: 0, 
                        fontSize: isMobile ? '20px' : '28px', 
                        fontWeight: 300 
                      }}>
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
                <Space 
                  align="center" 
                  direction={isMobile ? 'vertical' : 'horizontal'}
                  style={{ 
                    flexWrap: 'wrap', 
                    width: isMobile ? '100%' : 'auto' 
                  }}
                  size={isMobile ? 'small' : 'middle'}
                >
                  {!isOwnProfile && (
                    <>
                      {following ? (
                        <Button
                          type="default"
                          icon={<UserDeleteOutlined />}
                          onClick={handleFollow}
                          style={{ borderRadius: '4px', fontWeight: 600 }}
                        >
                          Following
                        </Button>
                      ) : followRequestSent ? (
                        <Button
                          disabled
                          icon={<UserAddOutlined />}
                          style={{ borderRadius: '4px', fontWeight: 600 }}
                        >
                          Request Sent
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          icon={<UserAddOutlined />}
                          onClick={handleFollow}
                          style={{ borderRadius: '4px', fontWeight: 600 }}
                        >
                          Follow
                        </Button>
                      )}
                    </>
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
              <Space 
                size={isMobile ? 'middle' : 'large'} 
                style={{ 
                  marginBottom: isMobile ? '16px' : '20px', 
                  fontSize: isMobile ? '14px' : '16px',
                  width: '100%',
                  justifyContent: isMobile ? 'space-around' : 'flex-start'
                }}
              >
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
          style={{ 
            borderBottom: '1px solid #dbdbdb',
            fontSize: isMobile ? '12px' : '14px'
          }}
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
                  {loadingPosts ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Spin size="large" />
                    </div>
                  ) : userPosts.length > 0 ? (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                      gap: isMobile ? '4px' : '8px', 
                      marginTop: isMobile ? '10px' : '20px' 
                    }}>
                      {userPosts.map((post) => {
                        const isOwnPost = isOwnProfile || (post.userId?.toString() === currentUser?._id?.toString() || post.userId?.toString() === currentUser?.id?.toString());
                        
                        return (
                        <div
                          key={post._id}
                          style={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '100%',
                            backgroundColor: '#000',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}
                          onClick={() => {
                            console.log('Post clicked:', post._id)
                          }}
                        >
                          {/* Delete button - only show for own posts */}
                          {isOwnPost && (
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                zIndex: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent post click
                                handleDeletePost(post._id);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                              }}
                            />
                          )}
                          {/* Image Post */}
                          {post.imageUrl && (
                            <img
                              src={
                                post.imageUrl.startsWith('http')
                                  ? post.imageUrl
                                  : `${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${post.imageUrl}`
                              }
                              alt={post.title || 'Post'}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          )}
                          
                          {/* Audio Post Indicator - Audio Only */}
                          {post.audioUrl && !post.imageUrl && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#1a1a1a',
                              padding: '20px',
                              color: '#fff'
                            }}>
                              <SoundOutlined style={{ fontSize: '48px', marginBottom: '12px', color: '#fff' }} />
                              {post.title && (
                                <Text style={{ color: '#fff', fontSize: '14px', textAlign: 'center', marginBottom: '8px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {post.title}
                                </Text>
                              )}
                              <PlayCircleOutlined style={{ fontSize: '32px', color: '#fff', opacity: 0.8 }} />
                            </div>
                          )}
                          
                          {/* Audio + Image Overlay */}
                          {post.audioUrl && post.imageUrl && (
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              borderRadius: '50%',
                              width: '40px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 5
                            }}>
                              <SoundOutlined style={{ fontSize: '20px', color: '#fff' }} />
                            </div>
                          )}
                          
                          {/* Hover overlay for engagement stats */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              backgroundColor: 'rgba(0, 0, 0, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              color: '#fff',
                              fontSize: '16px',
                              fontWeight: 600,
                              zIndex: 3
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0'
                            }}
                          >
                            <Space size="large">
                              <span>
                                <HeartOutlined style={{ marginRight: '4px' }} />
                                {post.likesCount || post.likes || 0}
                              </span>
                              <span>
                                <MessageOutlined style={{ marginRight: '4px' }} />
                                {post.commentsCount || post.comments || 0}
                              </span>
                            </Space>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      description="No posts yet"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
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
                  {(() => {
                    const isOwnProfile = currentUser?._id?.toString() === userId?.toString() || 
                                         currentUser?.id?.toString() === userId?.toString();
                    
                    if (!isOwnProfile) {
                      return (
                        <Empty
                          description="Only you can see your saved posts"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      );
                    }
                    
                    if (loadingSaved) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <Spin size="large" />
                        </div>
                      );
                    }
                    
                    if (savedPosts.length === 0) {
                      return (
                        <Empty
                          description="No saved posts yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      );
                    }
                    
                    return (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                        gap: isMobile ? '4px' : '8px', 
                        marginTop: isMobile ? '10px' : '20px' 
                      }}>
                        {savedPosts.map((post) => (
                          <div
                            key={post._id}
                            style={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '100%',
                              backgroundColor: '#000',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}
                            onClick={() => {
                              console.log('Saved post clicked:', post._id)
                            }}
                          >
                            {post.imageUrl && (
                              <img
                                src={
                                  post.imageUrl.startsWith('http')
                                    ? post.imageUrl
                                    : `${(import.meta.env.VITE_API_URL || 'http://localhost:7000').replace('/api', '')}${post.imageUrl}`
                                }
                                alt={post.title || 'Post'}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            )}
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: 600
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0'
                              }}
                            >
                              <Space size="large">
                                <span>❤️ {post.likesCount || post.likes || 0}</span>
                                <span>💬 {post.commentsCount || post.comments || 0}</span>
                              </Space>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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

