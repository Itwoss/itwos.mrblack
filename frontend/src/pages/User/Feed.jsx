import React, { useState, useEffect, useRef } from 'react'
import { Card, Empty, Spin, Typography, Space, Avatar, Button, Alert, Tag, message, Modal, Input, List, Divider } from 'antd'
import { MessageOutlined, HeartOutlined, HeartFilled, ShareAltOutlined, HomeOutlined, EyeOutlined, BookOutlined, BookFilled, SendOutlined, SoundOutlined, PlayCircleOutlined, PauseCircleOutlined, AudioMutedOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import TrendingBadge from '../../components/TrendingBadge'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const Feed = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [likingPosts, setLikingPosts] = useState(new Set()) // Track which posts are being liked
  const [savingPosts, setSavingPosts] = useState(new Set()) // Track which posts are being saved
  const [commentModalVisible, setCommentModalVisible] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [expandedComments, setExpandedComments] = useState(new Set()) // Track which posts have comments expanded
  const [postComments, setPostComments] = useState({}) // Store comments for each post
  const [postCommentTexts, setPostCommentTexts] = useState({}) // Store comment text for each post
  const [submittingPostComments, setSubmittingPostComments] = useState(new Set()) // Track which posts are submitting comments
  const [likingComments, setLikingComments] = useState(new Set()) // Track which comments are being liked (format: "postId-commentId")
  const viewedPostsRef = useRef(new Set()) // Track which posts have been viewed
  const [playingAudio, setPlayingAudio] = useState(null) // Track which post's audio is playing
  const [mutedAudios, setMutedAudios] = useState(new Set()) // Track which posts' audio are muted
  const audioRefs = useRef({}) // Store audio element refs for each post
  const postRefs = useRef({}) // Store post element refs for intersection observer
  const [visiblePost, setVisiblePost] = useState(null) // Track which post is currently most visible
  const autoPlayEnabled = useRef(true) // Track if auto-play is enabled (user can disable by manually controlling)

  useEffect(() => {
    if (user) {
      loadFeed()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
  
  // Cleanup: Pause all audio when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
      })
    }
  }, [])
  
  // Update progress bar in real-time when audio is playing
  useEffect(() => {
    if (!playingAudio) return
    
    const audioElement = audioRefs.current[playingAudio]
    if (!audioElement) return
    
    const updateProgress = () => {
      // Force re-render to update progress bar by updating posts state
      setPosts(prevPosts => [...prevPosts])
    }
    
    audioElement.addEventListener('timeupdate', updateProgress)
    
    return () => {
      audioElement.removeEventListener('timeupdate', updateProgress)
    }
  }, [playingAudio])
  
  // Intersection Observer for auto-play on scroll (Instagram-like)
  useEffect(() => {
    if (!posts.length) return
    
    // Track intersection ratios for all posts
    const intersectionRatios = new Map()
    
    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '0px', // No margin, use full viewport
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] // Many thresholds for smooth detection
    }
    
    const observerCallback = (entries) => {
      // Update intersection ratios for all entries
      entries.forEach(entry => {
        const postId = entry.target.dataset.postId
        if (postId) {
          intersectionRatios.set(postId, entry.intersectionRatio)
        }
      })
      
      // Find the post with the highest intersection ratio (most visible)
      let mostVisiblePostId = null
      let maxRatio = 0
      
      intersectionRatios.forEach((ratio, postId) => {
        if (ratio > maxRatio && ratio > 0.5) { // Must be at least 50% visible
          maxRatio = ratio
          mostVisiblePostId = postId
        }
      })
      
      // If we have a most visible post with audio, play it
      if (mostVisiblePostId) {
        const post = posts.find(p => p._id === mostVisiblePostId)
        
        if (post && post.audioUrl && autoPlayEnabled.current) {
          // Only auto-play if not manually muted
          if (!mutedAudios.has(mostVisiblePostId)) {
            // Pause current audio if different
            if (playingAudio && playingAudio !== mostVisiblePostId) {
              const currentAudio = audioRefs.current[playingAudio]
              if (currentAudio) {
                currentAudio.pause()
              }
            }
            
            // Play new audio if not already playing
            if (playingAudio !== mostVisiblePostId) {
              const audioElement = audioRefs.current[mostVisiblePostId]
              if (audioElement) {
                // Ensure audio is not muted for auto-play
                audioElement.muted = false
                
                audioElement.play().catch(err => {
                  console.error('Auto-play prevented:', err)
                  // Auto-play was prevented (browser policy), disable auto-play
                  autoPlayEnabled.current = false
                })
                setPlayingAudio(mostVisiblePostId)
                setVisiblePost(mostVisiblePostId)
              }
            }
          }
        }
      } else {
        // No post is sufficiently visible, pause current audio
        if (playingAudio && autoPlayEnabled.current) {
          const currentAudio = audioRefs.current[playingAudio]
          if (currentAudio) {
            currentAudio.pause()
            setPlayingAudio(null)
            setVisiblePost(null)
          }
        }
      }
    }
    
    const observer = new IntersectionObserver(observerCallback, observerOptions)
    
    // Observe all posts with audio
    const postsWithAudio = posts.filter(post => post.audioUrl)
    postsWithAudio.forEach(post => {
      const postElement = postRefs.current[post._id]
      if (postElement) {
        observer.observe(postElement)
      }
    })
    
    return () => {
      observer.disconnect()
      intersectionRatios.clear()
    }
  }, [posts, playingAudio, mutedAudios])
  
  // Handle manual play/pause (disable auto-play temporarily)
  const handleManualPlayPause = (postId) => {
    const audioElement = audioRefs.current[postId]
    if (!audioElement) return
    
    // Disable auto-play when user manually controls
    autoPlayEnabled.current = false
    
    if (playingAudio === postId) {
      // Pause current audio
      audioElement.pause()
      setPlayingAudio(null)
    } else {
      // Pause any other playing audio
      if (playingAudio) {
        const prevAudio = audioRefs.current[playingAudio]
        if (prevAudio) prevAudio.pause()
      }
      // Unmute if muted
      if (mutedAudios.has(postId)) {
        audioElement.muted = false
        setMutedAudios(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      }
      // Play this audio
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err)
        message.error('Failed to play audio')
      })
      setPlayingAudio(postId)
    }
    
    // Re-enable auto-play after 3 seconds of no manual interaction
    setTimeout(() => {
      autoPlayEnabled.current = true
    }, 3000)
  }

  const loadFeed = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Loading feed from /posts/feed...')
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      })
      
      const apiPromise = api.get('/posts/feed')
      const response = await Promise.race([apiPromise, timeoutPromise])
      console.log('📥 Feed API response:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasPosts: !!response.data?.data?.posts,
        postsCount: response.data?.data?.posts?.length || 0
      })
      
      if (response.data?.success && response.data?.data?.posts) {
        const posts = response.data.data.posts
        console.log('📸 Feed posts loaded:', posts.map(p => ({
          id: p._id,
          imageUrl: p.imageUrl,
          hasImage: !!p.imageUrl,
          likes: p.likes,
          views: p.views,
          status: p.status,
          postType: p.instagramRedirectUrl ? 'URL & Image Match' : 'Direct Upload'
        })))
        
        if (posts.length === 0) {
          console.warn('⚠️ Feed API returned success but posts array is empty. Check backend logs for filtering reasons.')
        }
        
        setPosts(posts)
        
        // Initialize post comments if they exist
        const commentsMap = {}
        posts.forEach(post => {
          if (post._id && post.commentsArray && post.commentsArray.length > 0) {
            const sortedComments = [...post.commentsArray].sort((a, b) => {
              const dateA = new Date(a.createdAt || 0)
              const dateB = new Date(b.createdAt || 0)
              return dateB - dateA // Newest first
            })
            commentsMap[post._id] = sortedComments
          }
        })
        setPostComments(prev => ({ ...prev, ...commentsMap }))
        
        // Track views for posts that are visible
        posts.forEach(post => {
          if (post._id && !viewedPostsRef.current.has(post._id)) {
            trackView(post._id)
            viewedPostsRef.current.add(post._id)
          }
        })
      } else {
        console.warn('⚠️ Feed API response structure unexpected:', {
          hasSuccess: !!response.data?.success,
          hasData: !!response.data?.data,
          hasPosts: !!response.data?.data?.posts,
          responseKeys: Object.keys(response.data || {})
        })
        setPosts([])
      }
    } catch (apiError) {
      console.error('❌ Error loading feed:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        url: apiError.config?.url
      })
      if (apiError.response?.status === 404) {
        setPosts([])
        setError('Feed endpoint not found. Please check backend server.')
      } else if (apiError.response?.status === 401) {
        setError('Authentication required. Please log in again.')
      } else {
        setError(`Failed to load feed: ${apiError.response?.data?.message || apiError.message || 'Unknown error'}`)
        setPosts([])
      }
    } finally {
      setLoading(false)
    }
  }

  const trackView = async (postId) => {
    try {
      await api.post(`/posts/${postId}/view`)
    } catch (error) {
      console.error('Error tracking view:', error)
      // Don't show error to user, just log it
    }
  }

  const handleLike = async (e, postId, currentLikes, isLiked) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!postId) {
      console.error('Post ID is missing')
      message.error('Post ID is missing')
      return
    }

    // Prevent double-clicks
    if (likingPosts.has(postId)) {
      console.log('Already liking this post, ignoring click')
      return
    }

    try {
      // Add to liking set
      setLikingPosts(prev => new Set(prev).add(postId))
      
      console.log('🔄 Liking post:', postId, 'Current likes:', currentLikes, 'Is liked:', isLiked)
      
      const response = await api.post(`/posts/${postId}/like`)
      
      console.log('✅ Like response:', response.data)
      
      if (response.data?.success) {
        // Update the post in the local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  likes: response.data.data.likes,
                  isLiked: response.data.data.isLiked
                }
              : post
          )
        )
      } else {
        console.error('Like failed:', response.data?.message)
        message.error(response.data?.message || 'Failed to like post')
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error)
      if (error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
        message.error(error.response.data?.message || 'Failed to like post. Please try again.')
      } else if (error.request) {
        message.error('Network error. Please check your connection.')
      } else {
        message.error('Failed to like post. Please try again.')
      }
    } finally {
      // Remove from liking set
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleSave = async (e, postId, currentSaves, isSaved) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!postId) {
      console.error('Post ID is missing')
      message.error('Post ID is missing')
      return
    }

    // Prevent double-clicks
    if (savingPosts.has(postId)) {
      console.log('Already saving this post, ignoring click')
      return
    }

    try {
      // Add to saving set
      setSavingPosts(prev => new Set(prev).add(postId))
      
      console.log('🔖 Saving post:', postId, 'Current saves:', currentSaves, 'Is saved:', isSaved)
      
      const response = await api.post(`/posts/${postId}/save`)
      
      console.log('✅ Save response:', response.data)
      
      if (response.data?.success) {
        // Update the post in the local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  saves: response.data.data.saves,
                  isSaved: !isSaved // Toggle saved state
                }
              : post
          )
        )
        message.success(response.data.message || (isSaved ? 'Post unsaved' : 'Post saved'))
      } else {
        console.error('Save failed:', response.data?.message)
        message.error(response.data?.message || 'Failed to save post')
      }
    } catch (error) {
      console.error('❌ Error toggling save:', error)
      if (error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
        message.error(error.response.data?.message || 'Failed to save post. Please try again.')
      } else if (error.request) {
        message.error('Network error. Please check your connection.')
      } else {
        message.error('Failed to save post. Please try again.')
      }
    } finally {
      // Remove from saving set
      setSavingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleOpenComments = async (e, post) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!post || !post._id) {
      message.error('Post not found')
      return
    }

    setSelectedPost(post)
    setCommentModalVisible(true)
    setCommentText('')
    setComments([])
    
    // Fetch comments for this post
    await loadComments(post._id)
  }

  const loadComments = async (postId) => {
    try {
      setLoadingComments(true)
      const response = await api.get(`/posts/${postId}`)
      if (response.data?.success && response.data?.data) {
        const postData = response.data.data
        // Get comments array and sort by newest first
        const commentsList = postData.commentsArray || []
        // Sort comments by createdAt (newest first)
        const sortedComments = [...commentsList].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA // Newest first
        })
        setComments(sortedComments)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.warning('Please enter a comment')
      return
    }

    if (!selectedPost || !selectedPost._id) {
      message.error('Post not found')
      return
    }

    try {
      setSubmittingComment(true)
      const response = await api.post(`/posts/${selectedPost._id}/comments`, {
        text: commentText.trim()
      })

      if (response.data?.success) {
        message.success('Comment added successfully')
        setCommentText('')
        
        // Update comment count in the post
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === selectedPost._id 
              ? { 
                  ...post, 
                  comments: response.data.data.comments || (post.comments || 0) + 1
                }
              : post
          )
        )

        // Add the new comment to the list immediately (optimistic update)
        if (response.data.data.commentsArray && response.data.data.commentsArray.length > 0) {
          // Get the last comment (newest)
          const newComment = response.data.data.commentsArray[response.data.data.commentsArray.length - 1]
          setComments(prevComments => [newComment, ...prevComments])
        } else {
          // Reload comments if not in response
          await loadComments(selectedPost._id)
        }
      } else {
        message.error(response.data?.message || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      message.error(error.response?.data?.message || 'Failed to add comment. Please try again.')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleCloseComments = () => {
    setCommentModalVisible(false)
    setSelectedPost(null)
    setComments([])
    setCommentText('')
  }

  const togglePostComments = (postId) => {
    console.log('🔄 Toggling comments for post:', postId)
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
        console.log('📕 Comments collapsed for post:', postId)
      } else {
        newSet.add(postId)
        console.log('📖 Comments expanded for post:', postId)
        // Check if post already has comments in the feed data
        const post = posts.find(p => p._id === postId)
        console.log('📋 Post data:', { 
          postId, 
          hasPost: !!post, 
          hasCommentsArray: !!(post?.commentsArray), 
          commentsCount: post?.commentsArray?.length || 0,
          hasPostComments: !!(postComments[postId]),
          postCommentsCount: postComments[postId]?.length || 0
        })
        
        if (post && post.commentsArray && post.commentsArray.length > 0) {
          // Use existing comments from feed
          const sortedComments = [...post.commentsArray].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0)
            const dateB = new Date(b.createdAt || 0)
            return dateB - dateA // Newest first
          })
          console.log('✅ Using comments from feed data:', sortedComments.length)
          setPostComments(prevComments => ({
            ...prevComments,
            [postId]: sortedComments
          }))
        } else if (!postComments[postId]) {
          // Load comments if not already loaded
          console.log('📥 Loading comments from API for post:', postId)
          loadPostComments(postId)
        } else {
          console.log('✅ Using cached comments for post:', postId)
        }
      }
      return newSet
    })
  }

  const loadPostComments = async (postId) => {
    try {
      console.log('📥 Loading comments for post:', postId)
      console.log('📥 API baseURL:', api.defaults.baseURL)
      console.log('📥 Full URL will be:', `${api.defaults.baseURL}/posts/${postId}`)
      const response = await api.get(`/posts/${postId}`)
      console.log('📥 Response status:', response.status)
      console.log('📥 Response data:', response.data)
      console.log('✅ Comments API response:', response.status, response.data?.success)
      if (response.data?.success && response.data?.data) {
        const postData = response.data.data
        const commentsList = postData.commentsArray || []
        console.log('📋 Comments loaded:', commentsList.length)
        const sortedComments = [...commentsList].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA // Newest first
        })
        setPostComments(prev => ({
          ...prev,
          [postId]: sortedComments
        }))
        console.log('✅ Comments set in state for post:', postId, sortedComments.length)
      } else {
        console.warn('⚠️ No comments data in response for post:', postId)
      }
    } catch (error) {
      console.error('❌ Error loading post comments:', error)
    }
  }

  const handleSubmitPostComment = async (postId) => {
    const commentText = postCommentTexts[postId] || ''
    if (!commentText.trim()) {
      message.warning('Please enter a comment')
      return
    }

    try {
      setSubmittingPostComments(prev => new Set(prev).add(postId))
      const response = await api.post(`/posts/${postId}/comments`, {
        text: commentText.trim()
      })

      if (response.data?.success) {
        // Clear comment text
        setPostCommentTexts(prev => {
          const newTexts = { ...prev }
          delete newTexts[postId]
          return newTexts
        })

        // Update comment count in the post
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  comments: response.data.data.comments || (post.comments || 0) + 1,
                  commentsArray: response.data.data.commentsArray || post.commentsArray || []
                }
              : post
          )
        )

        // Update post comments
        if (response.data.data.commentsArray && response.data.data.commentsArray.length > 0) {
          // Get the newest comment (last in array)
          const allComments = response.data.data.commentsArray
          const sortedComments = [...allComments].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0)
            const dateB = new Date(b.createdAt || 0)
            return dateB - dateA // Newest first
          })
          setPostComments(prev => ({
            ...prev,
            [postId]: sortedComments
          }))
        } else {
          // Reload comments if not in response
          await loadPostComments(postId)
        }
      } else {
        message.error(response.data?.message || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      message.error(error.response?.data?.message || 'Failed to add comment. Please try again.')
    } finally {
      setSubmittingPostComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <Alert
          message="Authentication Required"
          description="Please log in to view your feed."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/login')}>
              Login
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Title level={2} style={{ margin: 0 }}>
          Feed
        </Title>
        <Space>
          <Button 
            type="primary"
            onClick={() => navigate('/post/create')}
          >
            Create Post
          </Button>
          <Button 
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {posts.length === 0 && !loading ? (
        <Card>
          <Empty
            description="No posts yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              Your feed will show posts from users you follow
            </Text>
            <br />
            <Button 
              type="link" 
              onClick={() => navigate('/discover')}
              style={{ marginTop: '1rem' }}
            >
              Discover users to follow
            </Button>
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {posts.map((post) => (
            <Card 
              key={post._id} 
              ref={(el) => {
                if (el && post.audioUrl) {
                  postRefs.current[post._id] = el
                }
              }}
              data-post-id={post._id}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Avatar src={post.author?.avatarUrl} icon={<MessageOutlined />} />
                    <div>
                      <Text strong>{post.author?.name || 'Anonymous'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                  </Space>
                  <TrendingBadge 
                    trendingStatus={post.trendingStatus}
                    trendingRank={post.trendingRank}
                    trendingScore={post.trendingScore}
                  />
                </Space>
                
                {post.title && (
                  <Title level={4} style={{ margin: 0 }}>
                    {post.title}
                  </Title>
                )}
                
                {post.bio && (
                  <Paragraph style={{ marginBottom: post.tags?.length > 0 ? '8px' : '0' }}>
                    {post.bio}
                  </Paragraph>
                )}
                
                {post.tags && post.tags.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {post.tags.map((tag, index) => (
                      <Tag key={index} style={{ marginBottom: '4px' }}>
                        #{tag}
                      </Tag>
                    ))}
                  </div>
                )}
                
                {post.imageUrl && (
                  <div style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={
                        post.imageUrl.startsWith('http') 
                          ? post.imageUrl 
                          : `${(import.meta.env.VITE_API_URL || 'http://localhost:7000/api').replace('/api', '')}${post.imageUrl.startsWith('/') ? post.imageUrl : '/' + post.imageUrl}`
                      }
                      alt="Post" 
                      style={{ 
                        width: '100%',
                        maxWidth: '614px', // Instagram max width
                        height: 'auto',
                        display: 'block',
                        cursor: 'pointer',
                        objectFit: 'contain' // Show full image without cropping
                      }}
                      onError={(e) => {
                        console.error('Failed to load post image:', post.imageUrl)
                        // Show placeholder instead of hiding
                        e.target.src = '/placeholder-image.svg'
                        e.target.style.opacity = '0.5'
                      }}
                      onClick={() => {
                        if (post.instagramRedirectUrl) {
                          window.open(post.instagramRedirectUrl, '_blank')
                        }
                      }}
                    />
                  </div>
                )}
                
                {post.audioUrl && (
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    marginTop: post.imageUrl ? '12px' : '0',
                    marginBottom: '12px'
                  }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Button
                          type="text"
                          icon={playingAudio === post._id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          onClick={() => handleManualPlayPause(post._id)}
                          style={{ padding: '4px 8px' }}
                        />
                        <SoundOutlined style={{ fontSize: '16px', color: '#666' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Audio
                        </Text>
                      </Space>
                      <Button
                        type="text"
                        icon={<AudioMutedOutlined />}
                        onClick={() => {
                          const audioElement = audioRefs.current[post._id]
                          if (!audioElement) return
                          
                          // Disable auto-play when user manually controls
                          autoPlayEnabled.current = false
                          
                          if (mutedAudios.has(post._id)) {
                            // Unmute and play if not already playing
                            audioElement.muted = false
                            setMutedAudios(prev => {
                              const newSet = new Set(prev)
                              newSet.delete(post._id)
                              return newSet
                            })
                            
                            // If audio is not playing, start it manually
                            if (playingAudio !== post._id) {
                              // Pause any other playing audio
                              if (playingAudio) {
                                const prevAudio = audioRefs.current[playingAudio]
                                if (prevAudio) prevAudio.pause()
                              }
                              // Play this audio
                              audioElement.play().catch(err => {
                                console.error('Error playing audio:', err)
                                message.error('Failed to play audio')
                              })
                              setPlayingAudio(post._id)
                            }
                          } else {
                            // Mute and pause
                            audioElement.muted = true
                            if (playingAudio === post._id) {
                              audioElement.pause()
                              setPlayingAudio(null)
                            }
                            setMutedAudios(prev => new Set(prev).add(post._id))
                          }
                          
                          // Re-enable auto-play after 3 seconds
                          setTimeout(() => {
                            autoPlayEnabled.current = true
                          }, 3000)
                        }}
                        style={{ 
                          padding: '4px 8px',
                          color: mutedAudios.has(post._id) ? '#ff4d4f' : '#666'
                        }}
                        title={mutedAudios.has(post._id) ? 'Unmute & Play' : 'Mute'}
                      />
                    </Space>
                    <audio
                      ref={(el) => {
                        if (el) audioRefs.current[post._id] = el
                      }}
                      src={
                        post.audioUrl.startsWith('http')
                          ? post.audioUrl
                          : `${(import.meta.env.VITE_API_URL || 'http://localhost:7000/api').replace('/api', '')}${post.audioUrl.startsWith('/') ? post.audioUrl : '/' + post.audioUrl}`
                      }
                      muted={mutedAudios.has(post._id)}
                      onEnded={() => {
                        setPlayingAudio(null)
                      }}
                      onPause={() => {
                        if (playingAudio === post._id) {
                          setPlayingAudio(null)
                        }
                      }}
                      onPlay={() => {
                        // Pause any other playing audio
                        if (playingAudio && playingAudio !== post._id) {
                          const prevAudio = audioRefs.current[playingAudio]
                          if (prevAudio) prevAudio.pause()
                        }
                        setPlayingAudio(post._id)
                      }}
                      onError={(e) => {
                        console.error('Failed to load audio:', post.audioUrl, e)
                        message.error('Failed to load audio file')
                        setPlayingAudio(prev => prev === post._id ? null : prev)
                      }}
                      preload="metadata"
                      style={{
                        display: 'none' // Hide default controls, we use custom buttons
                      }}
                    />
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      backgroundColor: '#d9d9d9', 
                      borderRadius: '2px',
                      marginTop: '8px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={(e) => {
                      const audioElement = audioRefs.current[post._id]
                      if (!audioElement) return
                      
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickX = e.clientX - rect.left
                      const percentage = clickX / rect.width
                      audioElement.currentTime = percentage * audioElement.duration
                    }}
                    >
                      <div
                        style={{
                          width: audioRefs.current[post._id]?.duration
                            ? `${((audioRefs.current[post._id].currentTime || 0) / audioRefs.current[post._id].duration) * 100}%`
                            : '0%',
                          height: '100%',
                          backgroundColor: '#1890ff',
                          borderRadius: '2px',
                          transition: 'width 0.1s linear'
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <Space>
                  <Button 
                    type="text" 
                    icon={post.isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                    onClick={(e) => handleLike(e, post._id, post.likes, post.isLiked)}
                    style={{ color: post.isLiked ? '#ff4d4f' : undefined }}
                    disabled={!post._id || likingPosts.has(post._id)}
                    loading={likingPosts.has(post._id)}
                  >
                    {post.likes || 0}
                  </Button>
                  <Button 
                    type="text" 
                    icon={<MessageOutlined />}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      togglePostComments(post._id)
                    }}
                  >
                    {post.comments || 0}
                  </Button>
                  <Button 
                    type="text" 
                    icon={post.isSaved ? <BookFilled style={{ color: '#1890ff' }} /> : <BookOutlined />}
                    onClick={(e) => handleSave(e, post._id, post.saves, post.isSaved)}
                    style={{ color: post.isSaved ? '#1890ff' : undefined }}
                    disabled={!post._id || savingPosts.has(post._id)}
                    loading={savingPosts.has(post._id)}
                  >
                    {post.saves || 0}
                  </Button>
                  <Button type="text" icon={<EyeOutlined />}>
                    {post.views || 0}
                  </Button>
                  <Button type="text" icon={<ShareAltOutlined />}>
                    Share
                  </Button>
                </Space>

                {/* Comments Section - Instagram Style */}
                {expandedComments.has(post._id) && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    {/* Show existing comments */}
                    {(() => {
                      // Get comments from postComments state or from post data
                      const commentsToShow = postComments[post._id] || post.commentsArray || [];
                      
                      return commentsToShow.length > 0 ? (
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                          {commentsToShow.map((comment, index) => {
                          const commentUser = comment.userId || comment.user;
                          const userName = commentUser?.name || commentUser?.username || 'Anonymous';
                          const userAvatar = commentUser?.avatarUrl;
                          
                          return (
                            <div key={comment._id || index} style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                              <Avatar 
                                src={userAvatar} 
                                icon={<MessageOutlined />}
                                size="small"
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <Text strong style={{ fontSize: '14px' }}>{userName}</Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {comment.createdAt 
                                      ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : ''
                                    }
                                  </Text>
                                </div>
                                <Text style={{ fontSize: '14px', lineHeight: '1.5' }}>
                                  {comment.text}
                                </Text>
                                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={comment.isLiked ? <HeartFilled style={{ color: '#ff4d4f', fontSize: '14px' }} /> : <HeartOutlined style={{ fontSize: '14px' }} />}
                                    onClick={(e) => handleCommentLike(e, post._id, comment._id || comment._id?.toString(), comment.likes || 0, comment.isLiked || false)}
                                    style={{ 
                                      color: comment.isLiked ? '#ff4d4f' : undefined,
                                      padding: '0 4px',
                                      height: 'auto',
                                      fontSize: '12px'
                                    }}
                                    disabled={likingComments.has(`${post._id}-${comment._id || comment._id?.toString()}`)}
                                    loading={likingComments.has(`${post._id}-${comment._id || comment._id?.toString()}`)}
                                  >
                                    {comment.likes || 0}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      ) : (
                        <div style={{ marginBottom: '12px', textAlign: 'center', padding: '20px' }}>
                          <Text type="secondary">No comments yet</Text>
                        </div>
                      );
                    })()}

                    {/* Comment Input */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <Avatar 
                        src={user?.avatarUrl} 
                        icon={<MessageOutlined />}
                        size="small"
                      />
                      <div style={{ flex: 1 }}>
                        <TextArea
                          placeholder="Add a comment..."
                          value={postCommentTexts[post._id] || ''}
                          onChange={(e) => {
                            setPostCommentTexts(prev => ({
                              ...prev,
                              [post._id]: e.target.value
                            }))
                          }}
                          rows={1}
                          maxLength={500}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          onPressEnter={(e) => {
                            if (e.shiftKey) return
                            e.preventDefault()
                            handleSubmitPostComment(post._id)
                          }}
                          style={{ marginBottom: '8px' }}
                        />
                        <Button
                          type="primary"
                          size="small"
                          icon={<SendOutlined />}
                          onClick={() => handleSubmitPostComment(post._id)}
                          loading={submittingPostComments.has(post._id)}
                          disabled={!postCommentTexts[post._id]?.trim() || submittingPostComments.has(post._id)}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show comments button if there are comments */}
                {post.comments > 0 && !expandedComments.has(post._id) && (
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      type="link"
                      onClick={() => togglePostComments(post._id)}
                      style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                    >
                      View all {post.comments} {post.comments === 1 ? 'comment' : 'comments'}
                    </Button>
                  </div>
                )}
              </Space>
            </Card>
          ))}
        </Space>
      )}

      {/* Comment Modal */}
      <Modal
        title={`Comments (${selectedPost?.comments || 0})`}
        open={commentModalVisible}
        onCancel={handleCloseComments}
        footer={null}
        width={600}
        style={{ top: 20 }}
      >
        {selectedPost && (
          <div>
            {/* Post Preview */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <Avatar src={selectedPost.author?.avatarUrl} icon={<MessageOutlined />} />
                <div>
                  <Text strong>{selectedPost.author?.name || 'Anonymous'}</Text>
                  <br />
                  {selectedPost.title && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {selectedPost.title}
                    </Text>
                  )}
                </div>
              </Space>
            </Card>

            <Divider style={{ margin: '12px 0' }} />

            {/* Comments List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: 16 }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin />
                </div>
              ) : comments.length > 0 ? (
                <List
                  dataSource={comments}
                  renderItem={(comment, index) => {
                    // Handle both populated and unpopulated userId
                    const commentUser = comment.userId || comment.user;
                    const userName = commentUser?.name || commentUser?.username || 'Anonymous';
                    const userAvatar = commentUser?.avatarUrl;
                    
                    return (
                      <List.Item 
                        key={comment._id || index}
                        style={{ 
                          border: 'none', 
                          padding: '12px 0',
                          borderBottom: index < comments.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              src={userAvatar} 
                              icon={<MessageOutlined />}
                              size="default"
                            />
                          }
                          title={
                            <Space>
                              <Text strong style={{ fontSize: '14px' }}>{userName}</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {comment.createdAt 
                                  ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Just now'
                                }
                              </Text>
                            </Space>
                          }
                          description={
                            <Text 
                              style={{ 
                                whiteSpace: 'pre-wrap', 
                                wordBreak: 'break-word',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                marginTop: '4px'
                              }}
                            >
                              {comment.text}
                            </Text>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty
                  description="No comments yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '20px' }}
                />
              )}
            </div>

            {/* Comment Input */}
            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                maxLength={500}
                showCount
                onPressEnter={(e) => {
                  if (e.shiftKey) return
                  e.preventDefault()
                  handleSubmitComment()
                }}
                style={{ marginBottom: 8 }}
              />
            </Space.Compact>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitComment}
              loading={submittingComment}
              disabled={!commentText.trim() || submittingComment}
              block
            >
              Post Comment
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Feed

