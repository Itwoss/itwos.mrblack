const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Chat room is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  // E2EE fields - only ciphertext is stored (optional for plain text messages)
  ciphertext: {
    type: String,
    required: function() {
      // Only required if text is not provided (E2EE mode)
      return !this.text;
    }
  },
  iv: {
    type: String,
    required: function() {
      // Only required if ciphertext is provided (E2EE mode)
      return !!this.ciphertext && this.ciphertext !== this.text;
    }
  },
  // Message metadata (not encrypted)
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // For file messages
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number,
    min: [0, 'File size cannot be negative']
  },
  fileUrl: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https:\/\/res\.cloudinary\.com\//.test(v);
      },
      message: 'File URL must be a valid Cloudinary URL'
    }
  },
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  // Read receipts - track who read the message
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Plain text for denormalization (for thread preview)
  text: {
    type: String,
    trim: true
  },
  // For message reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For message replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // For message editing
  editedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  // For message deletion
  deletedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  // For moderation
  moderationFlags: [{
    type: String,
    enum: ['spam', 'inappropriate', 'harassment', 'other'],
    trim: true
  }],
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatorNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Moderator notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'reactions.user': 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ isModerated: 1 });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for formatted file size
messageSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileSize) return null;
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  return this.save();
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  if (this.status !== 'read') {
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to soft delete
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Instance method to get public data (for participants)
messageSchema.methods.getPublicData = function() {
  if (this.isDeleted) {
    return {
      _id: this._id,
      isDeleted: true,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt
    };
  }

  return {
    _id: this._id,
    chatRoom: this.chatRoom,
    sender: this.sender,
    ciphertext: this.ciphertext,
    iv: this.iv,
    messageType: this.messageType,
    fileName: this.fileName,
    fileSize: this.fileSize,
    formattedFileSize: this.formattedFileSize,
    fileUrl: this.fileUrl,
    status: this.status,
    reactions: this.reactions,
    reactionCount: this.reactionCount,
    replyTo: this.replyTo,
    editedAt: this.editedAt,
    isEdited: this.isEdited,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Instance method to get metadata only (for moderation)
messageSchema.methods.getMetadata = function() {
  return {
    _id: this._id,
    chatRoom: this.chatRoom,
    sender: this.sender,
    messageType: this.messageType,
    fileName: this.fileName,
    fileSize: this.fileSize,
    status: this.status,
    reactionCount: this.reactionCount,
    isEdited: this.isEdited,
    isDeleted: this.isDeleted,
    moderationFlags: this.moderationFlags,
    isModerated: this.isModerated,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find messages for room
messageSchema.statics.findForRoom = function(roomId, limit = 50, skip = 0) {
  return this.find({ 
    chatRoom: roomId,
    isDeleted: false 
  })
  .populate('sender', 'name avatarUrl')
  .populate('replyTo')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to find unread messages for user
messageSchema.statics.findUnreadForUser = function(userId) {
  return this.find({
    sender: { $ne: userId },
    status: { $in: ['sent', 'delivered'] },
    isDeleted: false
  }).populate('chatRoom', 'participants');
};

// Static method to mark messages as delivered
messageSchema.statics.markAsDelivered = function(messageIds) {
  return this.updateMany(
    { _id: { $in: messageIds }, status: 'sent' },
    { status: 'delivered' }
  );
};

// Static method to find moderated messages
messageSchema.statics.findModerated = function() {
  return this.find({ 
    isModerated: true,
    isDeleted: false 
  }).populate('sender', 'name email').populate('chatRoom', 'name participants');
};

// Pre-save middleware to update chat room's last message
messageSchema.post('save', async function() {
  if (!this.isDeleted) {
    await mongoose.model('ChatRoom').findByIdAndUpdate(
      this.chatRoom,
      { 
        lastMessage: this._id,
        lastMessageAt: this.createdAt
      }
    );
  }
});

module.exports = mongoose.model('Message', messageSchema);
