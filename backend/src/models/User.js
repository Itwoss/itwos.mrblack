const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not Google OAuth user
    }
  },
  avatarUrl: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  googleId: {
    type: String,
    sparse: true // Allows multiple null values
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  dateOfBirth: {
    type: Date
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  interests: [{
    type: String,
    enum: ['technology', 'business', 'design', 'marketing', 'education', 'health', 'sports', 'music', 'art', 'travel']
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill name cannot exceed 50 characters']
  }],
  socialLinks: {
    linkedin: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    github: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    }
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  sentFollowRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  purchases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  }],
  lastLoginAt: {
    type: Date,
    default: null
  },
  publicKey: {
    type: String,
    required: [true, 'Public key is required for E2EE chat']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetOTP: String,
  passwordResetExpiry: Date,
  passwordResetMethod: String,
  passwordResetTokenExpiry: Date,
  notifications: [{
    type: {
      type: String,
      enum: ['follow_request', 'follow_accepted', 'message', 'chat_invite', 'system'],
      required: true
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      chatRoomId: mongoose.Schema.Types.ObjectId,
      followRequestId: mongoose.Schema.Types.ObjectId
    }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
// email and googleId indexes are already defined by unique: true in schema
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    // Check if password is already hashed (starts with $2a$ or $2b$)
    if (this.passwordHash && (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$'))) {
      return next(); // Already hashed, skip
    }
    
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    role: this.role,
    createdAt: this.createdAt,
    publicKey: this.publicKey
  };
};

// Instance method to get full profile (for admin or self)
userSchema.methods.getFullProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    phone: this.phone,
    role: this.role,
    bio: this.bio,
    following: this.following,
    purchases: this.purchases,
    lastLoginAt: this.lastLoginAt,
    publicKey: this.publicKey,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// Instance method to send follow request
userSchema.methods.sendFollowRequest = async function(targetUserId) {
  const targetUser = await this.constructor.findById(targetUserId);
  if (!targetUser) {
    throw new Error('User not found');
  }

  // Check if already following
  if (this.following.includes(targetUserId)) {
    throw new Error('Already following this user');
  }

  // Check if request already sent
  if (this.sentFollowRequests.includes(targetUserId)) {
    throw new Error('Follow request already sent');
  }

  // Add to sent requests
  this.sentFollowRequests.push(targetUserId);
  await this.save();

  // Add to target user's follow requests
  targetUser.followRequests.push({
    user: this._id,
    status: 'pending'
  });

  // Add notification
  targetUser.notifications.push({
    type: 'follow_request',
    from: this._id,
    message: `${this.name} wants to follow you`
  });

  await targetUser.save();
  return { success: true, message: 'Follow request sent' };
};

// Instance method to accept follow request
userSchema.methods.acceptFollowRequest = async function(requestingUserId) {
  const requestIndex = this.followRequests.findIndex(
    req => req.user.toString() === requestingUserId.toString() && req.status === 'pending'
  );

  if (requestIndex === -1) {
    throw new Error('Follow request not found');
  }

  const requestingUser = await this.constructor.findById(requestingUserId);
  if (!requestingUser) {
    throw new Error('User not found');
  }

  // Update request status
  this.followRequests[requestIndex].status = 'accepted';

  // Add to followers
  this.followers.push(requestingUserId);

  // Add to requesting user's following
  requestingUser.following.push(this._id);

  // Remove from sent requests
  requestingUser.sentFollowRequests = requestingUser.sentFollowRequests.filter(
    id => !id.equals(requestingUserId)
  );

  // Add notification to requesting user
  requestingUser.notifications.push({
    type: 'follow_accepted',
    from: this._id,
    message: `${this.name} accepted your follow request`
  });

  await this.save();
  await requestingUser.save();

  return { success: true, message: 'Follow request accepted' };
};

// Instance method to decline follow request
userSchema.methods.declineFollowRequest = async function(requestingUserId) {
  const requestIndex = this.followRequests.findIndex(
    req => req.user.toString() === requestingUserId.toString() && req.status === 'pending'
  );

  if (requestIndex === -1) {
    throw new Error('Follow request not found');
  }

  const requestingUser = await this.constructor.findById(requestingUserId);
  if (requestingUser) {
    // Remove from sent requests
    requestingUser.sentFollowRequests = requestingUser.sentFollowRequests.filter(
      id => !id.equals(requestingUserId)
    );
    await requestingUser.save();
  }

  // Update request status
  this.followRequests[requestIndex].status = 'declined';
  await this.save();

  return { success: true, message: 'Follow request declined' };
};

// Instance method to add notification
userSchema.methods.addNotification = function(notification) {
  this.notifications.push(notification);
  return this.save();
};

// Instance method to mark notification as read
userSchema.methods.markNotificationAsRead = function(notificationId) {
  const notification = this.notifications.id(notificationId);
  if (notification) {
    notification.isRead = true;
    return this.save();
  }
  throw new Error('Notification not found');
};

// Instance method to get unread notifications count
userSchema.methods.getUnreadNotificationsCount = function() {
  return this.notifications.filter(notif => !notif.isRead).length;
};

module.exports = mongoose.model('User', userSchema);
