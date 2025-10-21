const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken, requireUser, requireChatRoomAccess } = require('../middleware/auth');
const { validateChatRoomCreation, validateMessageCreation, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Create chat room
router.post('/rooms', authenticateToken, requireUser, validateChatRoomCreation, async (req, res) => {
  try {
    const { participants, isGroup = false, name, description } = req.body;

    // Add current user to participants if not already included
    if (!participants.includes(req.user._id.toString())) {
      participants.push(req.user._id.toString());
    }

    // For direct messages, check if room already exists
    if (!isGroup && participants.length === 2) {
      const existingRoom = await ChatRoom.findOne({
        participants: { $all: participants },
        isGroup: false,
        isActive: true
      });

      if (existingRoom) {
        return res.json({
          success: true,
          message: 'Chat room already exists',
          room: existingRoom.getPublicData()
        });
      }
    }

    // Validate participants exist
    const participantUsers = await User.find({ _id: { $in: participants } });
    if (participantUsers.length !== participants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found'
      });
    }

    // Create chat room
    const room = new ChatRoom({
      participants: participants,
      isGroup: isGroup,
      name: isGroup ? name : undefined,
      description: description,
      createdBy: req.user._id,
      admins: isGroup ? [req.user._id] : []
    });

    await room.save();

    // Populate participants
    await room.populate('participants', 'name email avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      room: room.getPublicData()
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user's chat rooms
router.get('/rooms', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const rooms = await ChatRoom.findForUser(req.user._id);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRooms = rooms.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      rooms: paginatedRooms.map(room => room.getPublicData()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rooms.length,
        pages: Math.ceil(rooms.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get chat room by ID
router.get('/rooms/:id', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, async (req, res) => {
  try {
    res.json({
      success: true,
      room: req.chatRoom.getFullData()
    });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update chat room
router.put('/rooms/:id', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, async (req, res) => {
  try {
    const { name, description } = req.body;
    const room = req.chatRoom;

    // Check if user is admin or creator
    if (room.createdBy.toString() !== req.user._id.toString() && !room.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only room admins can update room details'
      });
    }

    if (name !== undefined) room.name = name;
    if (description !== undefined) room.description = description;

    await room.save();

    res.json({
      success: true,
      message: 'Chat room updated successfully',
      room: room.getFullData()
    });
  } catch (error) {
    console.error('Update chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Add participant to room
router.post('/rooms/:id/participants', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = req.chatRoom;

    // Check if user is admin or creator
    if (room.createdBy.toString() !== req.user._id.toString() && !room.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only room admins can add participants'
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add participant
    await room.addParticipant(userId);

    res.json({
      success: true,
      message: 'Participant added successfully',
      room: room.getFullData()
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Remove participant from room
router.delete('/rooms/:id/participants/:userId', authenticateToken, requireUser, validateObjectId('id'), validateObjectId('userId'), requireChatRoomAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const room = req.chatRoom;

    // Check if user is admin, creator, or removing themselves
    if (room.createdBy.toString() !== req.user._id.toString() && 
        !room.isAdmin(req.user._id) && 
        userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only room admins can remove other participants'
      });
    }

    // Remove participant
    await room.removeParticipant(userId);

    res.json({
      success: true,
      message: 'Participant removed successfully',
      room: room.getFullData()
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get messages for room
router.get('/rooms/:id/messages', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, validatePagination, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const roomId = req.params.id;

    const messages = await Message.findForRoom(roomId, parseInt(limit), parseInt(skip));

    res.json({
      success: true,
      messages: messages.map(message => message.getPublicData())
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

// Send message (handled via Socket.IO, but this endpoint for fallback)
router.post('/rooms/:id/messages', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, validateMessageCreation, async (req, res) => {
  try {
    const { ciphertext, iv, messageType = 'text', fileName, fileSize, fileUrl, replyTo } = req.body;
    const roomId = req.params.id;

    // Create message
    const message = new Message({
      chatRoom: roomId,
      sender: req.user._id,
      ciphertext,
      iv,
      messageType,
      fileName,
      fileSize,
      fileUrl,
      replyTo
    });

    await message.save();

    // Update room's last message
    const room = await ChatRoom.findById(roomId);
    room.lastMessage = message._id;
    room.lastMessageAt = message.createdAt;
    await room.save();

    // Emit message via Socket.IO
    const io = req.app.get('io');
    io.to(roomId).emit('new-message', {
      message: message.getPublicData(),
      roomId: roomId
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      message: message.getPublicData()
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

// Add reaction to message
router.post('/messages/:id/reactions', authenticateToken, requireUser, validateObjectId('id'), async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message
    const room = await ChatRoom.findById(message.chatRoom);
    if (!room.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add reaction
    await message.addReaction(req.user._id, emoji);

    res.json({
      success: true,
      message: 'Reaction added successfully',
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Remove reaction from message
router.delete('/messages/:id/reactions', authenticateToken, requireUser, validateObjectId('id'), async (req, res) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message
    const room = await ChatRoom.findById(message.chatRoom);
    if (!room.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove reaction
    await message.removeReaction(req.user._id);

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, requireUser, validateObjectId('id'), async (req, res) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is sender or admin
    const room = await ChatRoom.findById(message.chatRoom);
    if (message.sender.toString() !== req.user._id.toString() && 
        !room.isAdmin(req.user._id) && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete message
    await message.softDelete();

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

// Mark messages as read
router.patch('/rooms/:id/read', authenticateToken, requireUser, validateObjectId('id'), requireChatRoomAccess, async (req, res) => {
  try {
    const roomId = req.params.id;

    // Mark all unread messages in this room as read
    await Message.updateMany(
      {
        chatRoom: roomId,
        sender: { $ne: req.user._id },
        status: { $in: ['sent', 'delivered'] }
      },
      { status: 'read' }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, requireUser, async (req, res) => {
  try {
    const unreadMessages = await Message.findUnreadForUser(req.user._id);
    
    // Group by room
    const unreadByRoom = {};
    unreadMessages.forEach(message => {
      const roomId = message.chatRoom.toString();
      if (!unreadByRoom[roomId]) {
        unreadByRoom[roomId] = 0;
      }
      unreadByRoom[roomId]++;
    });

    res.json({
      success: true,
      unreadCount: unreadMessages.length,
      unreadByRoom: unreadByRoom
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
