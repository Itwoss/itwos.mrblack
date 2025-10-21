const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters'],
    required: function() {
      return this.isGroup;
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  avatar: {
    type: String, // Cloudinary URL
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https:\/\/res\.cloudinary\.com\//.test(v);
      },
      message: 'Avatar must be a valid Cloudinary URL'
    }
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  metadata: {
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    adminModerationFlags: [{
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
      maxlength: [1000, 'Moderator notes cannot exceed 1000 characters']
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ isGroup: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });
chatRoomSchema.index({ isActive: 1 });
chatRoomSchema.index({ 'metadata.isModerated': 1 });
chatRoomSchema.index({ createdBy: 1 });

// Virtual for participant count
chatRoomSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for room display name
chatRoomSchema.virtual('displayName').get(function() {
  if (this.isGroup && this.name) {
    return this.name;
  }
  if (!this.isGroup && this.participants.length === 2) {
    return 'Direct Message';
  }
  return `Group Chat (${this.participants.length})`;
});

// Instance method to add participant
chatRoomSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove participant
chatRoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => !id.equals(userId));
  return this.save();
};

// Instance method to check if user is participant
chatRoomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(id => id.equals(userId));
};

// Instance method to check if user is admin
chatRoomSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.equals(userId));
};

// Instance method to get public data
chatRoomSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    participants: this.participants,
    isGroup: this.isGroup,
    name: this.name,
    description: this.description,
    avatar: this.avatar,
    lastMessageAt: this.lastMessageAt,
    participantCount: this.participantCount,
    displayName: this.displayName,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Instance method to get full data (for participants or admins)
chatRoomSchema.methods.getFullData = function() {
  return {
    _id: this._id,
    participants: this.participants,
    isGroup: this.isGroup,
    name: this.name,
    description: this.description,
    avatar: this.avatar,
    lastMessageAt: this.lastMessageAt,
    lastMessage: this.lastMessage,
    metadata: this.metadata,
    isActive: this.isActive,
    createdBy: this.createdBy,
    admins: this.admins,
    participantCount: this.participantCount,
    displayName: this.displayName,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find rooms for user
chatRoomSchema.statics.findForUser = function(userId) {
  return this.find({ 
    participants: userId, 
    isActive: true 
  }).populate('participants', 'name email avatarUrl').sort({ lastMessageAt: -1 });
};

// Static method to find or create direct message room
chatRoomSchema.statics.findOrCreateDirectMessage = function(user1Id, user2Id) {
  return this.findOne({
    participants: { $all: [user1Id, user2Id] },
    isGroup: false,
    isActive: true
  }).then(room => {
    if (room) return room;
    
    return this.create({
      participants: [user1Id, user2Id],
      isGroup: false,
      createdBy: user1Id
    });
  });
};

// Static method to find moderated rooms
chatRoomSchema.statics.findModerated = function() {
  return this.find({ 
    'metadata.isModerated': true,
    isActive: true 
  }).populate('participants', 'name email avatarUrl');
};

// Pre-save middleware to update lastMessageAt
chatRoomSchema.pre('save', function(next) {
  if (this.isModified('lastMessage') || this.isModified('lastMessageAt')) {
    this.lastMessageAt = new Date();
  }
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
