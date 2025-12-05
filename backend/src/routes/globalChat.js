const express = require('express');
const GlobalChatMessage = require('../models/GlobalChatMessage');
const GlobalChatUserState = require('../models/GlobalChatUserState');
const GlobalChatSettings = require('../models/GlobalChatSettings');
const User = require('../models/User');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/global-chat/messages
 * Send a message to global chat
 */
router.post('/messages', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const { text, replyToMessageId, mentions } = req.body;

    // Validate input
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    // Get settings
    const settings = await GlobalChatSettings.getSettings();

    // Validate message length
    if (text.length > settings.maxMessageLength) {
      return res.status(400).json({
        success: false,
        message: `Message too long. Maximum ${settings.maxMessageLength} characters.`
      });
    }

    // Get or create user state
    let userState = await GlobalChatUserState.findOne({ userId });
    if (!userState) {
      userState = new GlobalChatUserState({ userId });
    }

    // Check if user can send message
    const canSend = userState.canSendMessage(settings);
    if (!canSend.allowed) {
      const errorResponse = {
        success: false,
        error: canSend.reason,
        message: getErrorMessage(canSend.reason, canSend.retryAfter, canSend.until)
      };
      if (canSend.retryAfter) {
        errorResponse.retryAfter = canSend.retryAfter;
      }
      if (canSend.until) {
        errorResponse.until = canSend.until;
      }
      return res.status(403).json(errorResponse);
    }

    // Check for duplicate message
    if (userState.isDuplicateMessage(text, settings)) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_MESSAGE',
        message: 'You\'ve already sent this message. Try something different.'
      });
    }

    // Validate reply if provided
    if (replyToMessageId && settings.allowReplies) {
      const parentMessage = await GlobalChatMessage.findById(replyToMessageId);
      if (!parentMessage || parentMessage.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Parent message not found or deleted'
        });
      }
    }

    // Get user info
    const user = await User.findById(userId).select('name username avatarUrl');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create message
    const message = new GlobalChatMessage({
      userId,
      username: user.name || user.username || 'Unknown',
      text: text.trim(),
      replyToMessageId: replyToMessageId || null,
      mentions: mentions || [],
      metadata: {
        deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {}
      }
    });

    await message.save();

    // Update user state
    userState.updateAfterMessage(text);
    await userState.save();

    // Populate message for response
    await message.populate('replyToMessageId', 'username text');
    await message.populate('mentions', 'name username');

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('global-chat').emit('new-message', {
        message: message.toObject()
      });

      // Notify mentioned users
      if (mentions && mentions.length > 0) {
        mentions.forEach(mentionedUserId => {
          io.to(`user:${mentionedUserId}`).emit('mention', {
            message: message.toObject(),
            mentionedBy: {
              _id: user._id,
              name: user.name,
              username: user.username
            }
          });
        });
      }
    }

    res.json({
      success: true,
      data: {
        message: message.toObject()
      }
    });
  } catch (error) {
    console.error('Error sending global chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/global-chat/messages
 * Get message history
 */
router.get('/messages', authenticateToken, requireUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : null;
    const after = req.query.after ? new Date(req.query.after) : null;

    const query = { isDeleted: false };

    if (before) {
      query.createdAt = { ...query.createdAt, $lt: before };
    }
    if (after) {
      query.createdAt = { ...query.createdAt, $gt: after };
    }

    const messages = await GlobalChatMessage.find(query)
      .populate('userId', 'name username avatarUrl')
      .populate('replyToMessageId', 'username text')
      .populate('mentions', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await GlobalChatMessage.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching global chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/global-chat/pinned
 * Get pinned message
 */
router.get('/pinned', authenticateToken, requireUser, async (req, res) => {
  try {
    const pinnedMessage = await GlobalChatMessage.findOne({ isPinned: true, isDeleted: false })
      .populate('userId', 'name username avatarUrl')
      .populate('pinnedBy', 'name username')
      .sort({ pinnedAt: -1 });

    res.json({
      success: true,
      data: {
        message: pinnedMessage ? pinnedMessage.toObject() : null
      }
    });
  } catch (error) {
    console.error('Error fetching pinned message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pinned message'
    });
  }
});

/**
 * POST /api/global-chat/messages/:messageId/reactions
 * Add/remove reaction to a message
 */
router.post('/messages/:messageId/reactions', authenticateToken, requireUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    // Validate emoji
    const validEmojis = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emoji'
      });
    }

    // Get settings
    const settings = await GlobalChatSettings.getSettings();
    if (!settings.allowReactions) {
      return res.status(403).json({
        success: false,
        message: 'Reactions are currently disabled'
      });
    }

    const message = await GlobalChatMessage.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId
      });
    }

    await message.save();

    // Calculate reaction counts
    const reactionCounts = {};
    message.reactions.forEach(reaction => {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = {
          count: 0,
          users: []
        };
      }
      reactionCounts[reaction.emoji].count += 1;
      reactionCounts[reaction.emoji].users.push(reaction.userId.toString());
    });

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('global-chat').emit('message-updated', {
        messageId: message._id,
        reactions: reactionCounts
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message._id,
        reactions: reactionCounts
      }
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/global-chat/presence
 * Get current user count and active users
 */
router.get('/presence', authenticateToken, requireUser, async (req, res) => {
  try {
    // Get from in-memory presence (managed by Socket.IO)
    // For now, return basic info - will be enhanced with Socket.IO presence
    const userCount = 0; // Will be updated by Socket.IO
    const activeUsers = [];

    res.json({
      success: true,
      data: {
        userCount,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch presence'
    });
  }
});

// Helper function for error messages
function getErrorMessage(reason, retryAfter, until) {
  switch (reason) {
    case 'RATE_LIMIT':
      return `You're sending messages too fast. Please wait ${retryAfter} seconds before sending another message.`;
    case 'DUPLICATE_MESSAGE':
      return 'You\'ve already sent this message. Try something different.';
    case 'USER_MUTED':
      return `You are muted until ${until.toLocaleString()}.`;
    case 'USER_BANNED':
      return 'You are banned from global chat.';
    case 'USER_BANNED_PERMANENT':
      return 'You are permanently banned from global chat.';
    default:
      return 'Unable to send message at this time.';
  }
}

module.exports = router;









