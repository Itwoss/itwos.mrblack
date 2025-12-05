const mongoose = require('mongoose');

const globalChatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  replyToMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalChatMessage',
    index: true,
    default: null
  },
  reactions: [{
    emoji: {
      type: String,
      required: true,
      enum: ['👍', '❤️', '😂', '😮', '🎉', '🔥']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  pinnedAt: {
    type: Date
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  metadata: {
    deviceInfo: {
      type: Object
    },
    ipAddress: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
globalChatMessageSchema.index({ isDeleted: 1, createdAt: -1 });
globalChatMessageSchema.index({ isPinned: 1, createdAt: -1 });
globalChatMessageSchema.index({ userId: 1, createdAt: -1 });
globalChatMessageSchema.index({ replyToMessageId: 1, createdAt: 1 });

// Virtual for reaction counts
globalChatMessageSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
  });
  return counts;
});

module.exports = mongoose.model('GlobalChatMessage', globalChatMessageSchema);









