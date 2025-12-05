const mongoose = require('mongoose');

const globalChatUserStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  lastMessages: [{
    type: String,
    maxlength: 500
  }],
  isMuted: {
    type: Boolean,
    default: false,
    index: true
  },
  mutedUntil: {
    type: Date,
    default: null
  },
  mutedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  muteReason: {
    type: String
  },
  isBanned: {
    type: Boolean,
    default: false,
    index: true
  },
  bannedUntil: {
    type: Date,
    default: null
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  banReason: {
    type: String
  },
  chatStreak: {
    type: Number,
    default: 0
  },
  lastChatDate: {
    type: Date
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: ['top_chatter', 'early_user', 'streak_7', 'streak_30', 'veteran']
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
globalChatUserStateSchema.index({ isBanned: 1, bannedUntil: 1 });
globalChatUserStateSchema.index({ isMuted: 1, mutedUntil: 1 });

// Method to check if user can send message
globalChatUserStateSchema.methods.canSendMessage = function(settings) {
  // Check if banned
  if (this.isBanned) {
    if (this.bannedUntil && this.bannedUntil > new Date()) {
      return { allowed: false, reason: 'USER_BANNED', until: this.bannedUntil };
    } else if (!this.bannedUntil) {
      return { allowed: false, reason: 'USER_BANNED_PERMANENT' };
    }
    // Ban expired, unban
    this.isBanned = false;
    this.bannedUntil = null;
  }

  // Check if muted
  if (this.isMuted && this.mutedUntil && this.mutedUntil > new Date()) {
    return { allowed: false, reason: 'USER_MUTED', until: this.mutedUntil };
  } else if (this.isMuted && (!this.mutedUntil || this.mutedUntil <= new Date())) {
    // Mute expired, unmute
    this.isMuted = false;
    this.mutedUntil = null;
  }

  // Check rate limit
  if (this.lastMessageAt) {
    const timeSinceLastMessage = Date.now() - this.lastMessageAt.getTime();
    const slowModeMs = (settings.slowModeSeconds || 30) * 1000;
    
    if (timeSinceLastMessage < slowModeMs) {
      const retryAfter = Math.ceil((slowModeMs - timeSinceLastMessage) / 1000);
      return { allowed: false, reason: 'RATE_LIMIT', retryAfter };
    }
  }

  return { allowed: true };
};

// Method to check for duplicate message
globalChatUserStateSchema.methods.isDuplicateMessage = function(text, settings) {
  const normalizedText = text.trim().toLowerCase();
  const duplicateCount = this.lastMessages.filter(
    msg => msg.toLowerCase() === normalizedText
  ).length;
  
  const maxDuplicates = settings.maxDuplicateCheck || 2;
  return duplicateCount >= maxDuplicates;
};

// Method to update after sending message
globalChatUserStateSchema.methods.updateAfterMessage = function(text) {
  const normalizedText = text.trim().toLowerCase();
  
  // Update last message time
  this.lastMessageAt = new Date();
  
  // Update last messages (keep last 5)
  this.lastMessages = [
    normalizedText,
    ...this.lastMessages.slice(0, 4)
  ];
  
  // Update total messages
  this.totalMessages += 1;
  
  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.lastChatDate) {
    this.chatStreak = 1;
    this.lastChatDate = today;
  } else {
    const lastChat = new Date(this.lastChatDate);
    lastChat.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastChat) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change
    } else if (daysDiff === 1) {
      // Consecutive day
      this.chatStreak += 1;
      this.lastChatDate = today;
    } else {
      // Streak broken
      this.chatStreak = 1;
      this.lastChatDate = today;
    }
  }
  
  // Update badges based on streak
  if (this.chatStreak >= 7 && !this.badges.includes('streak_7')) {
    this.badges.push('streak_7');
  }
  if (this.chatStreak >= 30 && !this.badges.includes('streak_30')) {
    this.badges.push('streak_30');
  }
};

module.exports = mongoose.model('GlobalChatUserState', globalChatUserStateSchema);









