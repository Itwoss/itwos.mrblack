import React, { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  List, 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Space, 
  message, 
  Spin,
  Empty,
  Badge,
  Tooltip,
  Modal,
  Select
} from 'antd'
import { 
  SendOutlined,
  UserOutlined, 
  MessageOutlined,
  PlusOutlined,
  TeamOutlined,
  SearchOutlined,
  MoreOutlined,
  SmileOutlined,
  PaperClipOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const UserChat = () => {
  const { user: currentUser, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [createRoomModal, setCreateRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [initialized, setInitialized] = useState(false)
  
  const messagesEndRef = useRef(null)

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await api.get('/health')
      if (response.data.status === 'OK') {
        setBackendStatus('online')
      } else {
        setBackendStatus('offline')
      }
    } catch (error) {
      console.log('Backend health check failed:', error)
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    let isMounted = true
    
    const initializeChat = async () => {
      if (!isMounted || initialized) return
      
      try {
        if (isAuthenticated && currentUser) {
          console.log('UserChat: Loading chat rooms...')
          await loadChatRooms()
          if (isMounted) {
            setInitialized(true)
          }
        } else {
          console.log('User not authenticated, clearing chat data')
          if (isMounted) {
            setRooms([])
            setMessages([])
            setSelectedRoom(null)
            setInitialized(true)
          }
        }
      } catch (error) {
        console.error('Error in UserChat useEffect:', error)
        if (isMounted) {
          setError('Failed to initialize chat')
          setRooms([])
          setInitialized(true)
        }
      }
    }
    
    initializeChat()
    
    return () => {
      isMounted = false
    }
  }, [isAuthenticated, currentUser, initialized])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom._id)
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatRooms = async () => {
    // Don't make API calls if not authenticated
    if (!isAuthenticated || !currentUser) {
      console.log('Not authenticated, skipping API call')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get('/chat/rooms')
      if (response.data.success) {
        setRooms(response.data.rooms || [])
        // Only set selected room if we don't have one and there are rooms available
        if (response.data.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(response.data.rooms[0])
        }
      } else {
        setRooms([])
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error)
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.log('Authentication error in chat')
        return
      }
      
      // Handle other errors gracefully
      setRooms([])
      if (error.code !== 'ERR_NETWORK') {
        message.error('Failed to load chat rooms')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (roomId) => {
    // Don't make API calls if not authenticated
    if (!isAuthenticated || !currentUser) {
      console.log('Not authenticated, skipping messages API call')
      return
    }
    
    try {
      const response = await api.get(`/chat/rooms/${roomId}/messages`)
      if (response.data.success) {
        setMessages(response.data.messages?.reverse() || [])
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.log('Authentication error loading messages')
        return
      }
      
      // Handle other errors gracefully
      setMessages([])
      if (error.code !== 'ERR_NETWORK') {
        message.error('Failed to load messages')
      }
    }
  }

  const loadAvailableUsers = async (query = '') => {
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=20`)
      if (response.data.success) {
        // Filter out current user and already selected users
        const filteredUsers = response.data.users.filter(u => 
          u._id !== currentUser._id && 
          !selectedParticipants.includes(u._id)
        )
        setAvailableUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return

    setSending(true)
    try {
      // For now, we'll send plain text. In a real implementation, you'd encrypt this
      const response = await api.post(`/chat/rooms/${selectedRoom._id}/messages`, {
        ciphertext: newMessage, // In real app, this would be encrypted
        iv: 'dummy-iv', // In real app, this would be the actual IV
        messageType: 'text'
      })

      if (response.data.success) {
        setNewMessage('')
        // Reload messages to get the new one
        loadMessages(selectedRoom._id)
        message.success('Message sent successfully!')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Don't show demo mode for backend issues
      message.error('Failed to send message. Please check your connection.')
    } finally {
      setSending(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || selectedParticipants.length === 0) {
      message.error('Please provide a room name and select participants')
      return
    }

    try {
      const response = await api.post('/chat/rooms', {
        participants: selectedParticipants,
        isGroup: true,
        name: newRoomName,
        description: newRoomDescription
      })

      if (response.data.success) {
        message.success('Chat room created successfully')
        setCreateRoomModal(false)
        setNewRoomName('')
        setNewRoomDescription('')
        setSelectedParticipants([])
        loadChatRooms()
      }
    } catch (error) {
      console.error('Error creating room:', error)
      
      // Don't show demo mode for backend issues
      message.error('Failed to create chat room. Please check your connection.')
    }
  }

  const getRoomDisplayName = (room) => {
    if (room.isGroup) {
      return room.name || `Group Chat (${room.participants.length})`
    } else {
      // For direct messages, show the other participant's name
      const otherParticipant = room.participants.find(p => p._id !== currentUser._id)
      return otherParticipant ? otherParticipant.name : 'Direct Message'
    }
  }

  const getRoomAvatar = (room) => {
    if (room.isGroup) {
      return room.avatar || null
    } else {
      // For direct messages, show the other participant's avatar
      const otherParticipant = room.participants.find(p => p._id !== currentUser._id)
      return otherParticipant ? otherParticipant.avatarUrl : null
    }
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Show error state if there's a critical error
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Title level={3} style={{ color: '#ff4d4f' }}>
          Chat Error
        </Title>
        <Paragraph>
          {error}
        </Paragraph>
        <Button 
          type="primary" 
          onClick={() => {
            setError(null)
            window.location.reload()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  // Show loading state during initial load
  if (!initialized || (loading && rooms.length === 0)) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <Spin size="large" />
        <Title level={3} style={{ marginTop: '1rem' }}>
          Loading Chat...
        </Title>
        <Paragraph style={{ color: '#666' }}>
          Please wait while we load your chat rooms
        </Paragraph>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: window.innerWidth < 768 ? '8px' : '16px',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
        {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            <MessageOutlined style={{ marginRight: '8px' }} />
            Chat
          </Title>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            Connect and chat with other users
          </Paragraph>
      </div>

        <Row gutter={[16, 16]} style={{ 
          height: window.innerWidth < 768 ? '60vh' : '70vh',
          minHeight: '400px'
        }}>
          {/* Chat Rooms Sidebar */}
          <Col xs={24} sm={24} md={8} lg={8} xl={6}>
        <Card 
              title="Chat Rooms"
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setCreateRoomModal(true)}
                  size="small"
                >
                  New Room
                </Button>
              }
              style={{ height: '100%' }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spin />
                </div>
              ) : rooms.length === 0 ? (
                <Empty
                  description="No chat rooms yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
          <List
                  dataSource={rooms}
                  renderItem={(room) => (
              <List.Item
                style={{ 
                  cursor: 'pointer',
                        backgroundColor: selectedRoom?._id === room._id ? '#f0f0f0' : 'transparent',
                        borderRadius: '8px',
                        padding: '12px',
                        margin: '4px 0'
                      }}
                      onClick={() => setSelectedRoom(room)}
              >
                <List.Item.Meta
                  avatar={
                          <Avatar
                            src={getRoomAvatar(room)}
                            icon={<UserOutlined />}
                          />
                        }
                        title={getRoomDisplayName(room)}
                  description={
                          <Space direction="vertical" size="small">
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatMessageTime(room.lastMessageAt)}
                            </Text>
                          </Space>
                  }
                />
              </List.Item>
            )}
          />
              )}
        </Card>
          </Col>

        {/* Chat Messages */}
          <Col xs={24} sm={24} md={16} lg={16} xl={18}>
        <Card 
              title={selectedRoom ? getRoomDisplayName(selectedRoom) : 'Select a chat room'}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {selectedRoom ? (
                <>
          {/* Messages Area */}
                  <div 
                    style={{ 
            flex: 1, 
                      overflowY: 'auto', 
            padding: '16px', 
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      marginBottom: '16px',
            maxHeight: '400px'
                    }}
                  >
                    {messages.length === 0 ? (
                      <Empty
                        description="No messages yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
            <List
              dataSource={messages}
                        renderItem={(message) => (
                <List.Item
                  style={{ 
                              justifyContent: message.sender._id === currentUser._id ? 'flex-end' : 'flex-start',
                    border: 'none',
                              padding: '8px 0'
                  }}
                >
                            <div
                              style={{
                    maxWidth: '70%',
                                backgroundColor: message.sender._id === currentUser._id ? '#1890ff' : '#f0f0f0',
                                color: message.sender._id === currentUser._id ? 'white' : 'black',
                    padding: '8px 12px',
                    borderRadius: '12px',
                                wordWrap: 'break-word'
                              }}
                            >
                              <div style={{ marginBottom: '4px' }}>
                                <Text 
                                  strong 
                                  style={{ 
                                    color: message.sender._id === currentUser._id ? 'white' : '#1890ff',
                                    fontSize: '12px'
                                  }}
                                >
                                  {message.sender.name}
                                </Text>
                              </div>
                              <div>{message.ciphertext}</div>
                              <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                                {formatMessageTime(message.createdAt)}
                    </div>
                  </div>
                </List.Item>
              )}
            />
                    )}
                    <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <TextArea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                      loading={sending}
                      disabled={!newMessage.trim()}
              >
                Send
              </Button>
            </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <MessageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <Title level={4} type="secondary">Select a chat room to start messaging</Title>
          </div>
              )}
        </Card>
          </Col>
        </Row>

        {/* Create Room Modal */}
        <Modal
          title="Create New Chat Room"
          open={createRoomModal}
          onCancel={() => setCreateRoomModal(false)}
          onOk={handleCreateRoom}
          okText="Create Room"
          cancelText="Cancel"
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Room Name</Text>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name"
                style={{ marginTop: '8px' }}
              />
            </div>
            
            <div>
              <Text strong>Description (Optional)</Text>
              <TextArea
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="Enter room description"
                style={{ marginTop: '8px' }}
                rows={3}
              />
            </div>

            <div>
              <Text strong>Add Participants</Text>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    loadAvailableUsers(e.target.value)
                  }}
                  style={{ flex: 1 }}
                />
                <Button 
                  icon={<SearchOutlined />}
                  onClick={() => loadAvailableUsers(searchQuery)}
                />
      </div>

              {availableUsers.length > 0 && (
                <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {availableUsers.map(user => (
                    <div
                      key={user._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '4px',
                        margin: '4px 0',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (!selectedParticipants.includes(user._id)) {
                          setSelectedParticipants([...selectedParticipants, user._id])
                        }
                      }}
                    >
                      <Avatar src={getUserAvatarUrl(user)} icon={<UserOutlined />} size="small">
                        {getUserInitials(user.name)}
                      </Avatar>
                      <div style={{ marginLeft: '8px', flex: 1 }}>
                        <Text strong>{user.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{user.email}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedParticipants.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <Text strong>Selected Participants:</Text>
                  <div style={{ marginTop: '4px' }}>
                    {selectedParticipants.map(participantId => {
                      const user = availableUsers.find(u => u._id === participantId)
                      return user ? (
                        <Tag
                          key={participantId}
                          closable
                          onClose={() => setSelectedParticipants(prev => 
                            prev.filter(id => id !== participantId)
                          )}
                          style={{ margin: '2px' }}
                        >
                          {user.name}
                        </Tag>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </Space>
        </Modal>
        </div>
  )
}

export default UserChat