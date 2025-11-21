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
    const mongoose = require('mongoose');
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    
    // Get actual MongoDB user ID for current user
    let currentUserId = authenticatedUserId;
    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      const currentUser = await User.findOne({ 
        $or: [
          { googleId: authenticatedUserId },
          { _id: authenticatedUserId }
        ]
      });
      if (currentUser) {
        currentUserId = currentUser._id.toString();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Current user not found'
        });
      }
    }
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'memberIds must be an array with at least 1 user ID'
      });
    }
    
    // Ensure current user is included (for direct messages, we only need 1 other user)
    const allMemberIds = [...new Set([currentUserId, ...memberIds.map(id => id.toString())])];
    
    // Validate all members exist - handle both ObjectIds and Google IDs
    const memberQueries = allMemberIds.map(id => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        return { _id: id };
      } else {
        return { googleId: id };
      }
    });
    
    const members = await User.find({ $or: memberQueries });
    if (members.length !== allMemberIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more member IDs are invalid'
      });
    }
    
    // Use MongoDB ObjectIds for participants
    const allMembers = members.map(m => m._id.toString());
    
    // For direct messages (2 members), find existing thread
    if (allMembers.length === 2) {
      const existingThread = await ChatRoom.findOne({
        participants: { $all: allMembers },
        isGroup: false,
        isActive: true
      }).populate('participants', 'name username email avatarUrl profilePic isVerified verifiedTill isOnline lastSeen');
      
      if (existingThread) {
        // Initialize unread counts if not present
        let unreadCount = 0;
        try {
          unreadCount = existingThread.getUnreadCount(currentUserId);
        } catch (err) {
          console.error('Error getting unread count:', err);
        }
        
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
    
    await thread.populate('participants', 'name username email avatarUrl profilePic isVerified verifiedTill isOnline lastSeen');
    
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
    const mongoose = require('mongoose');
    
    // Get the authenticated user's ID (could be ObjectId or Google ID)
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    const authenticatedGoogleId = req.user.googleId || null;
    
    // Determine which user ID to use
    let currentUserId;
    if (userId) {
      currentUserId = userId;
    } else {
      // Use authenticated user's ID
      currentUserId = authenticatedUserId || authenticatedGoogleId;
    }
    
    console.log('📨 GET /api/threads:', {
      userId: userId,
      currentUserId: currentUserId,
      authenticatedUserId: authenticatedUserId,
      authenticatedGoogleId: authenticatedGoogleId,
      reqUserGoogleId: req.user.googleId,
      page,
      limit
    });
    
    // Only allow users to see their own threads (unless admin)
    // Check both ObjectId and Google ID for comparison
    const isOwnThread = userId === authenticatedUserId || 
                        userId === authenticatedGoogleId ||
                        (!userId && authenticatedUserId) ||
                        (!userId && authenticatedGoogleId);
    
    if (userId && !isOwnThread && req.user.role !== 'admin') {
      console.log('❌ Access denied - userId mismatch:', {
        requestedUserId: userId,
        authenticatedUserId: authenticatedUserId,
        authenticatedGoogleId: authenticatedGoogleId
      });
      return res.status(403).json({
        success: false,
        message: 'You can only view your own threads'
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Handle both ObjectId and string user IDs (for Google users)
    let participantQuery;
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      participantQuery = { participants: currentUserId };
    } else {
      // For non-ObjectId user IDs (like Google user IDs), find user first
      const user = await User.findOne({ 
        $or: [
          { googleId: currentUserId },
          { _id: currentUserId }
        ]
      });
      if (user) {
        participantQuery = { participants: user._id };
      } else {
        // If user not found, return empty threads
        return res.json({
          success: true,
          threads: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    }
    
    // Find all threads for this user
    const threads = await ChatRoom.find({
      ...participantQuery,
      isActive: true
    })
    .populate('participants', 'name username email avatarUrl profilePic isOnline lastSeen isVerified verifiedTill')
    .populate('lastMessage', 'text messageType createdAt sender')
    .sort({ lastMessageAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);
    
    // Get the actual MongoDB user ID for unread count and total count
    let actualUserId = currentUserId;
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      const user = await User.findOne({ 
        $or: [
          { googleId: currentUserId },
          { _id: currentUserId }
        ]
      });
      if (user) {
        actualUserId = user._id;
      }
    }
    
    // Add unread counts to each thread
    const threadsWithUnread = threads.map(thread => {
      const threadObj = thread.toObject();
      try {
        threadObj.unreadCount = thread.getUnreadCount(actualUserId);
      } catch (err) {
        console.error('Error getting unread count:', err);
        threadObj.unreadCount = 0;
      }
      return threadObj;
    });
    
    // Get total count using the same query as threads
    const total = await ChatRoom.countDocuments({
      ...participantQuery,
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
    const { skip = 0, limit = 50, page = 1 } = req.query;
    const mongoose = require('mongoose');
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    
    // Get the actual MongoDB user ID (handle Google users)
    let currentUserId = authenticatedUserId;
    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      const user = await User.findOne({ 
        $or: [
          { googleId: authenticatedUserId },
          { _id: authenticatedUserId }
        ]
      });
      if (user) {
        currentUserId = user._id.toString();
      }
    }
    
    // Check if user has access to this thread
    const thread = await ChatRoom.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
    }
    
    // Check participant access using actual MongoDB ID
    if (!thread.isParticipant(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Calculate skip from page if provided
    const actualSkip = skip ? parseInt(skip) : (parseInt(page) - 1) * parseInt(limit || 50);
    
    // Fetch messages
    const messages = await Message.find({
      chatRoom: threadId,
      isDeleted: false
    })
    .populate('sender', 'name username email avatarUrl profilePic isVerified verifiedTill')
    .populate('readBy.userId', 'name username avatarUrl')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit || 50))
    .skip(actualSkip);
    
    // Mark messages as read for current user
    const messageIds = messages
      .filter(msg => {
        if (!msg.sender || !msg.sender._id) return false;
        return msg.sender._id.toString() !== currentUserId;
      })
      .map(msg => msg._id);
    
    if (messageIds.length > 0) {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, 'readBy.userId': { $ne: currentUserId } },
          { $push: { readBy: { userId: currentUserId, readAt: new Date() } } }
        );
        
        // Reset unread count for this thread
        await thread.resetUnread(currentUserId);
      } catch (readError) {
        console.error('Error marking messages as read:', readError);
        // Continue even if read marking fails
      }
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

// PUT /api/threads/:threadId/messages/:messageId - Edit a message (MUST come before POST route)
router.put('/:threadId/messages/:messageId', authenticateToken, requireUser, validateObjectId('threadId'), validateObjectId('messageId'), async (req, res) => {
  try {
    const { threadId, messageId } = req.params;
    const { text, ciphertext, iv } = req.body;
    const mongoose = require('mongoose');
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    
    // Get the actual MongoDB user ID (handle Google users)
    let currentUserId = authenticatedUserId;
    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      const user = await User.findOne({ 
        $or: [
          { googleId: authenticatedUserId },
          { _id: authenticatedUserId }
        ]
      });
      if (user) {
        currentUserId = user._id.toString();
      } else {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }
    }
    
    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Verify message belongs to thread
    if (message.chatRoom.toString() !== threadId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this thread'
      });
    }
    
    // Only allow editing text messages
    if (message.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited'
      });
    }
    
    // Check if user is the sender
    const messageSenderId = message.sender.toString();
    if (messageSenderId !== currentUserId && messageSenderId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }
    
    // Check if message is deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit deleted message'
      });
    }
    
    // Update message
    if (text !== undefined) {
      message.text = text;
      message.ciphertext = ciphertext || text;
      if (iv !== undefined) message.iv = iv || '';
    } else if (ciphertext !== undefined) {
      message.ciphertext = ciphertext;
      message.text = text || '';
      if (iv !== undefined) message.iv = iv || '';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Text or ciphertext is required'
      });
    }
    
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    
    // Populate sender
    await message.populate('sender', 'name username email avatarUrl profilePic isVerified verifiedTill');
    
    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(threadId).emit('message_edited', {
        threadId: threadId,
        messageId: messageId,
        message: message.toObject()
      });
    }
    
    res.json({
      success: true,
      message: 'Message edited successfully',
      data: message.toObject()
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/threads/:threadId/messages/:messageId - Delete (unsend) a message (MUST come before POST route)
router.delete('/:threadId/messages/:messageId', authenticateToken, requireUser, validateObjectId('threadId'), validateObjectId('messageId'), async (req, res) => {
  try {
    const { threadId, messageId } = req.params;
    const mongoose = require('mongoose');
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    
    // Get the actual MongoDB user ID (handle Google users)
    let currentUserId = authenticatedUserId;
    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      const user = await User.findOne({ 
        $or: [
          { googleId: authenticatedUserId },
          { _id: authenticatedUserId }
        ]
      });
      if (user) {
        currentUserId = user._id.toString();
      } else {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }
    }
    
    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Verify message belongs to thread
    if (message.chatRoom.toString() !== threadId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this thread'
      });
    }
    
    // Check if user is the sender
    const messageSenderId = message.sender.toString();
    if (messageSenderId !== currentUserId && messageSenderId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }
    
    // Soft delete message
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(threadId).emit('message_deleted', {
        threadId: threadId,
        messageId: messageId
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/threads/:threadId/messages - Send a message
router.post('/:threadId/messages', authenticateToken, requireUser, validateObjectId('threadId'), async (req, res) => {
  try {
    const { threadId } = req.params;
    const { 
      senderId, 
      text, 
      ciphertext, 
      iv, 
      messageType = 'text',
      imageUrl,
      audioUrl,
      audioTitle,
      audioDuration
    } = req.body;
    const mongoose = require('mongoose');
    const authenticatedUserId = req.user._id ? req.user._id.toString() : null;
    
    // Get the actual MongoDB user ID (handle Google users)
    let currentUserId = authenticatedUserId;
    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      const user = await User.findOne({ 
        $or: [
          { googleId: authenticatedUserId },
          { _id: authenticatedUserId }
        ]
      });
      if (user) {
        currentUserId = user._id.toString();
      } else {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }
    }
    
    // Use current user as sender if not specified
    const actualSenderId = senderId || currentUserId;
    
    // Validate sender matches authenticated user
    if (actualSenderId !== currentUserId && actualSenderId !== authenticatedUserId) {
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
    
    // Check participant access using actual MongoDB ID
    if (!thread.isParticipant(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // For sticker and audio messages, text/ciphertext is optional
    // For image messages, imageUrl is required
    // For audio messages, audioUrl is required
    if (messageType === 'image' && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required for image messages'
      });
    }
    
    if (messageType === 'audio' && !audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'audioUrl is required for audio messages'
      });
    }
    
    // For text/sticker messages, text is required
    if ((messageType === 'text' || messageType === 'sticker') && !ciphertext && !text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for text/sticker messages'
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
    
    // Handle text content
    // For image/audio messages, text/ciphertext is optional but we need to set ciphertext for validation
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
    } else if (text) {
      // Fallback: use text as ciphertext
      messageData.text = text;
      messageData.ciphertext = text;
      messageData.iv = '';
    } else {
      // For image/audio/sticker messages without text, set empty ciphertext
      // The validation allows ciphertext to be empty if text is provided, but we need to set it
      messageData.text = text || '';
      messageData.ciphertext = text || ''; // Set empty string for media messages
      messageData.iv = '';
    }
    
    // Handle image messages
    if (messageType === 'image' && imageUrl) {
      messageData.imageUrl = imageUrl;
    }
    
    // Handle audio messages
    if (messageType === 'audio' && audioUrl) {
      messageData.audioUrl = audioUrl;
      if (audioTitle) messageData.audioTitle = audioTitle;
      if (audioDuration !== undefined) messageData.audioDuration = audioDuration;
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
    await message.populate('sender', 'name username email avatarUrl profilePic isVerified verifiedTill');
    
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

