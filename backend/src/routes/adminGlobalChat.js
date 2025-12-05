const express = require('express');
const GlobalChatMessage = require('../models/GlobalChatMessage');
const GlobalChatUserState = require('../models/GlobalChatUserState');
const GlobalChatSettings = require('../models/GlobalChatSettings');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/admin/global-chat/messages
 * Get all messages with filters (admin only)
 */
router.get('/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const { userId, search, startDate, endDate, isDeleted, sortBy } = req.query;

    const query = {};

    if (userId) {
      query.userId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    }

    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (isDeleted !== undefined) {
      query.isDeleted = isDeleted === 'true';
    }

    const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    const sortOrder = -1;

    const messages = await GlobalChatMessage.find(query)
      .populate('userId', 'name username email avatarUrl')
      .populate('replyToMessageId', 'username text')
      .populate('deletedBy', 'name username')
      .populate('pinnedBy', 'name username')
      .sort({ [sortField]: sortOrder })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await GlobalChatMessage.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/admin/global-chat/messages/:messageId
 * Soft delete a message (admin only)
 */
router.delete('/messages/:messageId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const adminId = req.user._id;

    const message = await GlobalChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = adminId;

    // If message was pinned, unpin it
    if (message.isPinned) {
      message.isPinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
    }

    await message.save();

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('global-chat').emit('message-deleted', {
        messageId: message._id
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/global-chat/messages/:messageId/pin
 * Pin/unpin a message (admin only)
 */
router.post('/messages/:messageId/pin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pin } = req.body;
    const adminId = req.user._id;

    const message = await GlobalChatMessage.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (pin) {
      // Unpin any existing pinned message
      await GlobalChatMessage.updateMany(
        { isPinned: true },
        { isPinned: false, pinnedAt: null, pinnedBy: null }
      );

      // Pin this message
      message.isPinned = true;
      message.pinnedAt = new Date();
      message.pinnedBy = adminId;
    } else {
      // Unpin
      message.isPinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
    }

    await message.save();

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      if (pin) {
        await message.populate('userId', 'name username avatarUrl');
        await message.populate('pinnedBy', 'name username');
        io.to('global-chat').emit('pinned-message', {
          message: message.toObject()
        });
      } else {
        io.to('global-chat').emit('pinned-message-removed', {});
      }
    }

    res.json({
      success: true,
      message: pin ? 'Message pinned successfully' : 'Message unpinned successfully',
      data: {
        message: message.toObject()
      }
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pin/unpin message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/global-chat/users/:userId/mute
 * Mute a user (admin only)
 */
router.post('/users/:userId/mute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { duration, reason } = req.body; // duration in minutes
    const adminId = req.user._id;

    let userState = await GlobalChatUserState.findOne({ userId });
    if (!userState) {
      userState = new GlobalChatUserState({ userId });
    }

    const mutedUntil = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    userState.isMuted = true;
    userState.mutedUntil = mutedUntil;
    userState.mutedBy = adminId;
    userState.muteReason = reason || 'No reason provided';

    await userState.save();

    res.json({
      success: true,
      message: `User muted ${duration ? `for ${duration} minutes` : 'permanently'}`,
      data: {
        userId,
        mutedUntil,
        reason: userState.muteReason
      }
    });
  } catch (error) {
    console.error('Error muting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mute user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/global-chat/users/:userId/unmute
 * Unmute a user (admin only)
 */
router.post('/users/:userId/unmute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const userState = await GlobalChatUserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({
        success: false,
        message: 'User state not found'
      });
    }

    userState.isMuted = false;
    userState.mutedUntil = null;
    userState.mutedBy = null;
    userState.muteReason = null;

    await userState.save();

    res.json({
      success: true,
      message: 'User unmuted successfully'
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unmute user'
    });
  }
});

/**
 * POST /api/admin/global-chat/users/:userId/ban
 * Ban a user (admin only)
 */
router.post('/users/:userId/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { duration, reason } = req.body; // duration in minutes, null for permanent
    const adminId = req.user._id;

    let userState = await GlobalChatUserState.findOne({ userId });
    if (!userState) {
      userState = new GlobalChatUserState({ userId });
    }

    const bannedUntil = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    userState.isBanned = true;
    userState.bannedUntil = bannedUntil;
    userState.bannedBy = adminId;
    userState.banReason = reason || 'No reason provided';

    await userState.save();

    res.json({
      success: true,
      message: `User banned ${duration ? `for ${duration} minutes` : 'permanently'}`,
      data: {
        userId,
        bannedUntil,
        reason: userState.banReason
      }
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ban user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/global-chat/users/:userId/unban
 * Unban a user (admin only)
 */
router.post('/users/:userId/unban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const userState = await GlobalChatUserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({
        success: false,
        message: 'User state not found'
      });
    }

    userState.isBanned = false;
    userState.bannedUntil = null;
    userState.bannedBy = null;
    userState.banReason = null;

    await userState.save();

    res.json({
      success: true,
      message: 'User unbanned successfully'
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unban user'
    });
  }
});

/**
 * GET /api/admin/global-chat/users/:userId/history
 * Get user's chat history (admin only)
 */
router.get('/users/:userId/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const messages = await GlobalChatMessage.find({ userId })
      .populate('replyToMessageId', 'username text')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await GlobalChatMessage.countDocuments({ userId });

    const userState = await GlobalChatUserState.findOne({ userId });
    const user = await User.findById(userId).select('name username email avatarUrl');

    res.json({
      success: true,
      data: {
        user: user ? user.toObject() : null,
        userState: userState ? userState.toObject() : null,
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/global-chat/export
 * Export chat logs (admin only)
 */
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const messages = await GlobalChatMessage.find(query)
      .populate('userId', 'name username email')
      .sort({ createdAt: 1 });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Date,User,Message,Reactions,Is Deleted\n';
      const csvRows = messages.map(msg => {
        const date = new Date(msg.createdAt).toISOString();
        const user = msg.username || 'Unknown';
        const text = `"${(msg.text || '').replace(/"/g, '""')}"`;
        const reactions = msg.reactions.length;
        const isDeleted = msg.isDeleted ? 'Yes' : 'No';
        return `${date},${user},${text},${reactions},${isDeleted}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=global-chat-${Date.now()}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=global-chat-${Date.now()}.json`);
      res.json({
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages.map(msg => ({
          id: msg._id,
          date: msg.createdAt,
          user: {
            id: msg.userId._id,
            name: msg.username
          },
          text: msg.text,
          reactions: msg.reactions.length,
          isDeleted: msg.isDeleted,
          replyTo: msg.replyToMessageId ? msg.replyToMessageId._id : null
        }))
      });
    }
  } catch (error) {
    console.error('Error exporting chat logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export chat logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/global-chat/settings
 * Get global chat settings (admin only)
 */
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await GlobalChatSettings.getSettings();
    res.json({
      success: true,
      data: settings.toObject()
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/admin/global-chat/settings
 * Update global chat settings (admin only)
 */
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      slowModeSeconds,
      maxMessageLength,
      allowReactions,
      allowReplies,
      allowMentions,
      maxDuplicateCheck
    } = req.body;

    const settings = await GlobalChatSettings.getSettings();
    const adminId = req.user._id;

    if (slowModeSeconds !== undefined) settings.slowModeSeconds = slowModeSeconds;
    if (maxMessageLength !== undefined) settings.maxMessageLength = maxMessageLength;
    if (allowReactions !== undefined) settings.allowReactions = allowReactions;
    if (allowReplies !== undefined) settings.allowReplies = allowReplies;
    if (allowMentions !== undefined) settings.allowMentions = allowMentions;
    if (maxDuplicateCheck !== undefined) settings.maxDuplicateCheck = maxDuplicateCheck;

    settings.updatedBy = adminId;
    await settings.save();

    // Emit settings update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('global-chat').emit('settings-updated', {
        settings: settings.toObject()
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings.toObject()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;









