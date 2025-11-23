const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  tags: {
    type: [String],
    default: []
  },
  imageUrl: {
    type: String,
    required: true
  },
  instagramRedirectUrl: {
    type: String,
    required: true
  },
  phashValueUploaded: {
    type: String,
    required: true
  },
  phashValueInstagram: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  views: {
    type: Number,
    default: 0
  },
  viewedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  comments: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for feed queries
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ isActive: 1, createdAt: -1 });

// Method to get public post data
postSchema.methods.getPublicData = function(userId = null) {
  const data = {
    _id: this._id,
    userId: this.userId,
    title: this.title,
    bio: this.bio,
    tags: this.tags,
    imageUrl: this.imageUrl,
    instagramRedirectUrl: this.instagramRedirectUrl,
    likes: this.likes,
    views: this.views,
    comments: this.comments,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
  
  // Include whether current user liked the post
  if (userId) {
    data.isLiked = this.likedBy.some(id => id.toString() === userId.toString());
  }
  
  return data;
};

module.exports = mongoose.model('Post', postSchema);

