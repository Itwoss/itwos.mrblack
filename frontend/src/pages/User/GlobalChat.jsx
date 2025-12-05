import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
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
  Popover,
  Dropdown
} from 'antd';
import { 
  SendOutlined,
  UserOutlined,
  SmileOutlined,
  MessageOutlined,
  DollarOutlined,
  HeartOutlined,
  MoreOutlined,
  CrownOutlined,
  SettingOutlined,
  CloseOutlined,
  DownOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContextOptimized';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils';
import UserLayout from '../../components/UserLayout';
import VerifiedBadgeIcon from '../../components/VerifiedBadgeIcon';

const { Text } = Typography;
const { TextArea } = Input;

const GlobalChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatFilter, setChatFilter] = useState('all'); // 'all', 'top', 'mentions'
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const cooldownIntervalRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    if (!user?._id) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000';
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    if (!token) return;

    socketRef.current = io(serverUrl, {
      transports: ['polling', 'websocket'],
      auth: { token, userId: user._id }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('💬 Global chat connected');
      socket.emit('join-global-chat', { userId: user._id });
    });

    socket.on('new-message', (data) => {
      setMessages(prev => [...prev, data.message]);
      scrollToBottom();
    });

    socket.on('message-deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    });

    socket.on('message-updated', (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    socket.on('user-count-update', (data) => {
      setUserCount(data.userCount);
    });

    socket.on('user-joined', (data) => {
      setUserCount(data.userCount);
    });

    socket.on('user-left', (data) => {
      setUserCount(data.userCount);
    });

    socket.on('pinned-message', (data) => {
      setPinnedMessage(data.message);
    });

    socket.on('pinned-message-removed', () => {
      setPinnedMessage(null);
    });

    socket.on('user-typing', (data) => {
      setTypingUsers(prev => new Set([...prev, data.userId]));
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }, 3000);
    });

    socket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socket.on('mention', (data) => {
      message.info(`You were mentioned by ${data.mentionedBy.name} in global chat`);
    });

    return () => {
      if (socket) {
        socket.emit('leave-global-chat', { userId: user._id });
        socket.disconnect();
      }
    };
  }, [user, scrollToBottom]);

  // Fetch message history
  useEffect(() => {
    fetchMessages();
    fetchPinnedMessage();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/global-chat/messages', {
        params: { page: 1, limit: 50 }
      });
      if (response.data.success) {
        setMessages(response.data.data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      message.error('Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchPinnedMessage = async () => {
    try {
      const response = await api.get('/global-chat/pinned');
      if (response.data.success && response.data.data.message) {
        setPinnedMessage(response.data.data.message);
      }
    } catch (error) {
      console.error('Error fetching pinned message:', error);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('global-chat-typing', {
        userId: user._id,
        username: user.name || user.username
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('global-chat-stop-typing', {
            userId: user._id
          });
        }
      }, 3000);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || rateLimitCooldown > 0) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const payload = {
        text: messageText,
        replyToMessageId: replyingTo?._id || null,
        mentions: replyingTo ? [replyingTo.userId] : []
      };

      const response = await api.post('/global-chat/messages', payload);

      if (response.data.success) {
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.response?.data?.error === 'RATE_LIMIT') {
        const retryAfter = error.response.data.retryAfter || 30;
        setRateLimitCooldown(retryAfter);
        
        cooldownIntervalRef.current = setInterval(() => {
          setRateLimitCooldown(prev => {
            if (prev <= 1) {
              clearInterval(cooldownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        message.error(error.response.data.message || 'You\'re sending messages too fast. Please wait a few seconds.');
      } else if (error.response?.data?.error === 'DUPLICATE_MESSAGE') {
        message.error('You\'ve already sent this message. Try something different.');
        setNewMessage(messageText);
      } else if (error.response?.data?.error === 'USER_MUTED') {
        message.error(error.response.data.message || 'You are muted from global chat.');
      } else if (error.response?.data?.error === 'USER_BANNED') {
        message.error('You are banned from global chat.');
      } else {
        message.error('Failed to send message');
      }
    } finally {
      setSending(false);
    }
  };

  // Handle reaction
  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/global-chat/messages/${messageId}/reactions`, { emoji });
    } catch (error) {
      console.error('Error adding reaction:', error);
      message.error('Failed to add reaction');
    }
  };

  // Format reaction counts
  const getReactionCounts = (message) => {
    const counts = {};
    if (message.reactions && Array.isArray(message.reactions)) {
      message.reactions.forEach(reaction => {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      });
    }
    return counts;
  };

  // Get user badge (moderator, VIP, verified, etc.)
  const getUserBadges = (messageUser) => {
    const badges = [];
    
    // Check if user is verified
    if (messageUser?.isVerified === true || messageUser?.isVerified === 'true') {
      const verifiedTill = messageUser?.verifiedTill;
      let isCurrentlyVerified = false;
      
      if (verifiedTill) {
        try {
          const expiryDate = new Date(verifiedTill);
          const now = new Date();
          isCurrentlyVerified = expiryDate > now;
        } catch (e) {
          isCurrentlyVerified = true; // If date parsing fails but isVerified is true, show badge
        }
      } else {
        isCurrentlyVerified = true; // If isVerified is true but no expiry date, show badge
      }
      
      if (isCurrentlyVerified) {
        badges.push({ 
          type: 'verified', 
          icon: <VerifiedBadgeIcon size={16} color="#0aa2ee" /> 
        });
      }
    }
    
    // Check if user is admin/moderator
    if (messageUser?.role === 'admin') {
      badges.push({ type: 'moderator', icon: <SettingOutlined style={{ color: '#3b82f6', fontSize: '14px' }} /> });
    }
    
    return badges;
  };

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    if (chatFilter === 'mentions') {
      return msg.mentions?.some(m => m._id === user._id || m === user._id);
    }
    return true;
  });

  return (
    <UserLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        background: '#0e0e10',
        color: '#efeff1',
        position: 'relative'
      }}>
        {/* Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#18181b',
          borderBottom: '1px solid #26262c',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Dropdown
              menu={{
                items: [
                  { key: 'all', label: 'All Chat' },
                  { key: 'top', label: 'Top Chat' },
                  { key: 'mentions', label: 'Mentions' }
                ],
                onClick: ({ key }) => setChatFilter(key)
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                style={{
                  color: '#efeff1',
                  padding: '4px 8px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Text style={{ color: '#efeff1', fontSize: '14px', fontWeight: 600 }}>
                  {chatFilter === 'all' ? 'All Chat' : chatFilter === 'top' ? 'Top Chat' : 'Mentions'}
                </Text>
                <DownOutlined style={{ fontSize: '12px' }} />
              </Button>
            </Dropdown>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: '#26262c',
              borderRadius: '4px'
            }}>
              <CrownOutlined style={{ color: '#9147ff', fontSize: '14px' }} />
              <Text style={{ color: '#efeff1', fontSize: '12px' }}>0XP</Text>
            </div>
          </div>
          <Space>
            <Text style={{ color: '#adadb8', fontSize: '12px' }}>
              💬 {userCount} {userCount === 1 ? 'person' : 'people'}
            </Text>
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{ color: '#efeff1' }}
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              style={{ color: '#efeff1' }}
              onClick={() => window.history.back()}
            />
          </Space>
        </div>

        {/* Messages List */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            background: '#0e0e10',
            scrollbarWidth: 'thin',
            scrollbarColor: '#3a3a3d #0e0e10'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Empty 
              description="No messages yet. Be the first to chat!" 
              style={{ color: '#adadb8' }}
            />
          ) : (
            <>
              {filteredMessages.map((msg) => {
                const isOwnMessage = msg.userId?._id === user._id || msg.userId === user._id;
                const reactionCounts = getReactionCounts(msg);
                const badges = getUserBadges(msg.userId);
                const username = msg.username || msg.userId?.name || msg.userId?.username || 'Unknown';

                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '8px 0',
                      transition: 'background 0.2s',
                      borderRadius: '4px',
                      paddingLeft: '8px',
                      paddingRight: '8px',
                      marginLeft: '-8px',
                      marginRight: '-8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#27272a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Avatar */}
                    <Avatar
                      src={msg.userId?.avatarUrl ? getUserAvatarUrl(msg.userId) : null}
                      icon={<UserOutlined />}
                      size={36}
                      style={{
                        flexShrink: 0,
                        background: msg.userId?.avatarUrl ? 'transparent' : '#9147ff'
                      }}
                    >
                      {msg.userId?.name ? getUserInitials(msg.userId.name) : 'U'}
                    </Avatar>

                    {/* Message Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Username and Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <Text
                          style={{
                            color: isOwnMessage ? '#9147ff' : '#efeff1',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            // Navigate to user profile
                            const userId = msg.userId?._id || msg.userId;
                            if (userId) {
                              window.location.href = `/profile/${userId}`;
                            }
                          }}
                        >
                          @{username}
                        </Text>
                        {badges.map((badge, idx) => (
                          <span 
                            key={idx} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center',
                              marginLeft: '4px'
                            }}
                          >
                            {badge.icon}
                          </span>
                        ))}
                      </div>

                      {/* Message Text */}
                      <div style={{ marginBottom: '4px' }}>
                        <Text
                          style={{
                            color: '#efeff1',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.text.split(' ').map((word, idx) => {
                            if (word.startsWith('@')) {
                              return (
                                <span
                                  key={idx}
                                  style={{
                                    color: '#9147ff',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  {word}{' '}
                                </span>
                              );
                            }
                            return <span key={idx}>{word} </span>;
                          })}
                        </Text>
                      </div>

                      {/* Reactions */}
                      {Object.keys(reactionCounts).length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <Button
                              key={emoji}
                              type="text"
                              size="small"
                              onClick={() => handleReaction(msg._id, emoji)}
                              style={{
                                fontSize: '12px',
                                padding: '2px 6px',
                                height: 'auto',
                                background: '#26262c',
                                border: '1px solid #3a3a3d',
                                borderRadius: '12px',
                                color: '#efeff1'
                              }}
                            >
                              {emoji} {count}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Actions Menu */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="message-actions">
                        <Popover
                          content={
                            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                              {['👍', '❤️', '😂', '😮', '🎉', '🔥'].map(emoji => (
                                <Button
                                  key={emoji}
                                  type="text"
                                  size="small"
                                  onClick={() => {
                                    handleReaction(msg._id, emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  style={{ fontSize: '16px', padding: '4px 8px', textAlign: 'left' }}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          }
                          trigger="click"
                          open={showEmojiPicker}
                          onOpenChange={setShowEmojiPicker}
                        >
                          <Button
                            type="text"
                            size="small"
                            style={{ color: '#adadb8', fontSize: '12px', padding: '2px 4px' }}
                          >
                            React
                          </Button>
                        </Popover>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => setReplyingTo(msg)}
                          style={{ color: '#adadb8', fontSize: '12px', padding: '2px 4px' }}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>

                    {/* Message Menu */}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'reply', label: 'Reply', icon: <MessageOutlined /> },
                          { key: 'react', label: 'React', icon: <SmileOutlined /> },
                          { type: 'divider' },
                          { key: 'report', label: 'Report', danger: true }
                        ]
                      }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        style={{
                          color: '#adadb8',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          flexShrink: 0
                        }}
                        className="message-menu-btn"
                      />
                    </Dropdown>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div style={{ padding: '8px 0', fontSize: '12px', color: '#adadb8', fontStyle: 'italic' }}>
              {Array.from(typingUsers).length} {typingUsers.size === 1 ? 'user is' : 'users are'} typing...
            </div>
          )}
        </div>

        {/* Bottom Input Bar */}
        <div style={{
          padding: '12px 16px',
          background: '#18181b',
          borderTop: '1px solid #26262c',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onPressEnter={(e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              handleSendMessage();
            }}
            placeholder={rateLimitCooldown > 0 
              ? `Wait ${rateLimitCooldown}s before sending...` 
              : "Chat..."}
            disabled={sending || rateLimitCooldown > 0}
            style={{
              flex: 1,
              background: '#26262c',
              border: '1px solid #3a3a3d',
              color: '#efeff1',
              fontSize: '14px',
              padding: '8px 12px',
              borderRadius: '4px'
            }}
            styles={{
              input: {
                color: '#efeff1',
                background: 'transparent'
              }
            }}
          />
          <Button
            type="text"
            icon={<SmileOutlined />}
            style={{ color: '#efeff1', fontSize: '18px' }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          />
          <Button
            type="text"
            icon={<DollarOutlined />}
            style={{ color: '#efeff1', fontSize: '18px' }}
            onClick={() => message.info('Super Chat feature coming soon!')}
          />
          <Button
            type="primary"
            icon={<HeartOutlined />}
            onClick={() => {
              // Send a heart reaction or like
              message.success('❤️ Sent!');
            }}
            style={{
              background: '#9147ff',
              borderColor: '#9147ff',
              fontSize: '18px',
              height: '36px',
              width: '36px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </div>

        {/* CSS for hover effects */}
        <style>{`
          .message-actions {
            opacity: 0;
          }
          div:hover .message-actions {
            opacity: 1;
          }
          .message-menu-btn {
            opacity: 0;
          }
          div:hover .message-menu-btn {
            opacity: 1;
          }
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #0e0e10;
          }
          ::-webkit-scrollbar-thumb {
            background: #3a3a3d;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #4a4a4d;
          }
        `}</style>
      </div>
    </UserLayout>
  );
};

export default GlobalChat;
