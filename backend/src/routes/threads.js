const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// POST /api/threads - Create a thread
router.post('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { memberIds } = req.body;
    const currentUserId = req.user._id.toString();
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'memberIds must be an array with at least 1 user ID'
      });
    }
    
    // Ensure current user is included (for direct messages, we only need 1 other user)
    const allMembers = [...new Set([currentUserId, ...memberIds.map(id => id.toString())])];
    
    // Validate all members exist
    const members = await User.find({ _id: { $in: allMembers } });
    if (members.length !== allMembers.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more member IDs are invalid'
      });
    }
    
    // For direct messages (2 members), find existing thread
    if (allMembers.length === 2) {
      const existingThread = await ChatRoom.findOne({
        participants: { $all: allMembers },
        isGroup: false,
        isActive: true
      }).populate('participants', 'name username email avatarUrl profilePic');
      
      if (existingThread) {
        // Initialize unread counts if not present
        const unreadCount = existingThread.getUnreadCount(currentUserId);
        
        return res.json({
          success: true,
          message: 'Thread already exists',
          thread: {
            ...existingThread.toObject(),
            unreadCount: unreadCount
          }
        });
      }
    }
    
    // Create new thread
    const thread = new ChatRoom({
      participants: allMembers,
      isGroup: allMembers.length > 2,
      createdBy: currentUserId,
      lastMessageAt: new Date()
    });
    
    await thread.save();
    
    // Initialize unread counts for all participants
    for (const memberId of allMembers) {
      await thread.resetUnread(memberId);
    }
    
    await thread.populate('participants', 'name username email avatarUrl profilePic');
    
    res.status(201).json({
      success: true,
      message: 'Thread created successfully',
      thread: {
        ...thread.toObject(),
        unreadCount: 0
      }
    });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create thread',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/threads - List threads for a user
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const currentUserId = userId || req.user._id.toString();
    
    // Only allow users to see their own threads (unless admin)
    if (userId && userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own threads'
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find all threads for this user
    const threads = await ChatRoom.find({
      participants: currentUserId,
      isActive: true
    })
    .populate('participants', 'name username email avatarUrl profilePic isOnline lastSeen')
    .populate('lastMessage', 'text messageType createdAt sender')
    .sort({ lastMessageAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);
    
    // Add unread counts to each thread
    const threadsWithUnread = threads.map(thread => {
      const threadObj = thread.toObject();
      threadObj.unreadCount = thread.getUnreadCount(currentUserId);
      return threadObj;
    });
    
    // Get total count
    const total = await ChatRoom.countDocuments({
      participants: currentUserId,
      isActive: true
    });
    
    res.json({
      success: true,
      threads: threadsWithUnread,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List threads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list threads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/threads/:threadId/messages - Get messages in a thread
router.get('/:threadId/messages', authenticateToken, requireUser, validateObjectId('threadId'), validatePagination, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { skip = 0, limit = 50 } = req.query;
    const currentUserId = req.user._id.toString();
    
    // Check if user has access to this thread
    const thread = await ChatRoom.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
    }
    
    if (!thread.isParticipant(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Fetch messages
    const messages = await Message.find({
      chatRoom: threadId,
      isDeleted: false
    })
    .populate('sender', 'name username email avatarUrl profilePic')
    .populate('readBy.userId', 'name username avatarUrl')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));
    
    // Mark messages as read for current user
    const messageIds = messages
      .filter(msg => msg.sender._id.toString() !== currentUserId)
      .map(msg => msg._id);
    
    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds }, 'readBy.userId': { $ne: currentUserId } },
        { $push: { readBy: { userId: currentUserId, readAt: new Date() } } }
      );
      
      // Reset unread count for this thread
      await thread.resetUnread(currentUserId);
    }
    
    res.json({
      success: true,
      messages: messages.reverse().map(msg => ({
        ...msg.toObject(),
        isRead: msg.readBy.some(r => r.userId._id.toString() === currentUserId)
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/threads/:threadId/messages - Send a message
router.post('/:threadId/messages', authenticateToken, requireUser, validateObjectId('threadId'), async (req, res) => {
  try {
    const { threadId } = req.params;
    const { senderId, text, ciphertext, iv, messageType = 'text' } = req.body;
    const currentUserId = req.user._id.toString();
    
    // Use current user as sender if not specified
    const actualSenderId = senderId || currentUserId;
    
    if (actualSenderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only send messages as yourself'
      });
    }
    
    // Check if user has access to this thread
    const thread = await ChatRoom.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
    }
    
    if (!thread.isParticipant(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // For E2EE, ciphertext and iv are required
    // For plain text messages, text is required
    if (!ciphertext && !text) {
      return res.status(400).json({
        success: false,
        message: 'Either text or ciphertext is required'
      });
    }
    
    // Create message
    // For plain text messages, use text field
    // For E2EE messages, use ciphertext and iv
    const messageData = {
      chatRoom: threadId,
      sender: actualSenderId,
      messageType: messageType,
      status: 'sent'
    };
    
    if (text && !ciphertext) {
      // Plain text message
      messageData.text = text;
      messageData.ciphertext = text; // Store as plain text in ciphertext field for compatibility
      messageData.iv = ''; // Empty IV for plain text
    } else if (ciphertext) {
      // E2EE message
      messageData.ciphertext = ciphertext;
      messageData.iv = iv || '';
      messageData.text = text || ''; // Store plain text preview if available
    } else {
      // Fallback: use text as ciphertext
      messageData.text = text || '';
      messageData.ciphertext = text || '';
      messageData.iv = '';
    }
    
    const message = new Message(messageData);
    
    await message.save();
    
    // Update thread's last message
    thread.lastMessage = message._id;
    thread.lastMessageAt = message.createdAt;
    thread.lastMessageText = text || '';
    await thread.save();
    
    // Increment unread counts for all participants except sender
    const otherParticipants = thread.participants.filter(
      p => p.toString() !== currentUserId
    );
    
    for (const participantId of otherParticipants) {
      await thread.incrementUnread(participantId);
    }
    
    // Populate sender
    await message.populate('sender', 'name username email avatarUrl profilePic');
    
    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(threadId).emit('new_message', {
        threadId: threadId,
        message: {
          ...message.toObject(),
          isRead: false
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...message.toObject(),
        isRead: false
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

