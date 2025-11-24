const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireUser } = require('../middleware/auth');
const Post = require('../models/Post');
const Flag = require('../models/Flag');
const Follow = require('../models/Follow');
const { compareImages, compressImage } = require('../utils/imageMatching');
const { extractInstagramImageUrl } = require('../utils/instagramExtractor');
const router = express.Router();

// Configure multer for post image uploads
const storage = multer.memoryStorage(); // Use memory storage for processing

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * POST /api/posts/verify-images
 * Verify if uploaded image matches Instagram image
 */
router.post('/verify-images', authenticateToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const { instagramUrl } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    if (!instagramUrl) {
      return res.status(400).json({
        success: false,
        message: 'Instagram URL is required'
      });
    }

    // Validate Instagram URL format
    if (!instagramUrl.includes('instagram.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Instagram URL'
      });
    }

    // Extract image URL from Instagram post URL
    console.log('📥 Extracting Instagram image URL from:', instagramUrl);
    let instagramImageUrl;
    try {
      instagramImageUrl = await extractInstagramImageUrl(instagramUrl);
      console.log('✅ Extracted Instagram image URL:', instagramImageUrl);
    } catch (extractError) {
      console.error('❌ Failed to extract Instagram image:', extractError);
      return res.status(400).json({
        success: false,
        message: `Failed to extract image from Instagram URL: ${extractError.message}. Please make sure the URL is correct and the post is public.`
      });
    }

    console.log('🔍 Comparing images...');
    let comparison;
    try {
      comparison = await compareImages(req.file.buffer, instagramImageUrl);
    } catch (compareError) {
      console.error('❌ Error comparing images:', compareError);
      return res.status(500).json({
        success: false,
        message: `Failed to compare images: ${compareError.message}. The Instagram image might not be accessible.`
      });
    }

    res.json({
      success: true,
      match: comparison.match,
      difference: comparison.difference,
      phashUploaded: comparison.hash1,
      phashInstagram: comparison.hash2,
      message: comparison.match 
        ? 'Images match! You can post now.' 
        : `Images don't match (difference: ${comparison.difference}, threshold: 40). Please ensure you're uploading the exact same image from Instagram.`
    });

  } catch (error) {
    console.error('Error verifying images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/posts
 * Create a new post
 * Supports both legacy file upload and new mediaKeys flow
 */
router.post('/', authenticateToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const { 
      instagramUrl, 
      phashUploaded, 
      phashInstagram, 
      title, 
      bio, 
      tags,
      privacy = 'public', // New: privacy setting (public/followers/private)
      mediaKeys // New: array of media keys from S3/storage
    } = req.body;

    const userId = req.user._id || req.user.id;
    let imageUrl = null;
    let mediaKeysArray = [];

    // New flow: Use mediaKeys if provided (direct S3 upload)
    if (mediaKeys) {
      try {
        mediaKeysArray = Array.isArray(mediaKeys) 
          ? mediaKeys 
          : (typeof mediaKeys === 'string' ? JSON.parse(mediaKeys) : [mediaKeys]);
        
        if (mediaKeysArray.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one media key is required'
          });
        }
        
        // For backward compatibility, use first mediaKey as imageUrl
        imageUrl = mediaKeysArray[0];
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mediaKeys format'
        });
      }
    }
    // Legacy flow: File upload
    else if (req.file) {
      if (!instagramUrl) {
        return res.status(400).json({
          success: false,
          message: 'Instagram URL is required for file uploads'
        });
      }

      if (!phashUploaded || !phashInstagram) {
        return res.status(400).json({
          success: false,
          message: 'Hash values are required for file uploads'
        });
      }

      // Compress image
      console.log('📦 Compressing image...');
      const compressedBuffer = await compressImage(req.file.buffer, 500);

      // Save compressed image
      const uploadPath = path.join(__dirname, '../../uploads/posts');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const filename = `post-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
      const filepath = path.join(uploadPath, filename);
      
      await fs.promises.writeFile(filepath, compressedBuffer);
      imageUrl = `/uploads/posts/${filename}`;
      mediaKeysArray = [imageUrl]; // Use local path as mediaKey
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either mediaKeys or image file is required'
      });
    }

    // Validate privacy setting
    const validPrivacy = ['public', 'followers', 'private'];
    if (!validPrivacy.includes(privacy)) {
      return res.status(400).json({
        success: false,
        message: `Privacy must be one of: ${validPrivacy.join(', ')}`
      });
    }

    // Parse tags if provided
    let tagsArray = [];
    if (tags) {
      try {
        // Try to parse as JSON first (if sent as JSON string)
        let parsedTags = tags;
        if (typeof tags === 'string') {
          try {
            parsedTags = JSON.parse(tags);
          } catch (e) {
            // If not JSON, treat as comma-separated string
            parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          }
        }
        
        // Ensure it's an array
        if (Array.isArray(parsedTags)) {
          tagsArray = parsedTags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag)).filter(tag => tag && tag.length > 0);
        } else if (typeof parsedTags === 'string') {
          tagsArray = [parsedTags.trim()].filter(tag => tag.length > 0);
        }
      } catch (error) {
        console.error('Error parsing tags:', error);
        tagsArray = [];
      }
    }

    // Create post with new fields
    const post = new Post({
      userId: userId,
      title: title?.trim() || undefined,
      bio: bio?.trim() || undefined,
      tags: tagsArray,
      imageUrl: imageUrl, // Keep for backward compatibility
      instagramRedirectUrl: instagramUrl || undefined, // Optional for new flow
      phashValueUploaded: phashUploaded || undefined, // Optional for new flow
      phashValueInstagram: phashInstagram || undefined, // Optional for new flow
      // New Instagram-like fields
      privacy: privacy,
      status: 'processing', // Will be updated to 'published' after processing
      mediaKeys: mediaKeysArray
    });

    await post.save();

    // Queue image processing job (async, don't wait)
    const { processPost } = require('../services/postProcessor');
    processPost(post._id.toString())
      .then(result => {
        console.log(`✅ Post ${post._id} processed:`, result);
      })
      .catch(error => {
        console.error(`❌ Post ${post._id} processing failed:`, error);
        // Post remains in 'processing' status, admin can review
      });

    res.json({
      success: true,
      message: 'Post created successfully. Processing in background...',
      data: post.getPublicData(userId)
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Helper function to calculate and update engagement score
 */
async function updateEngagementScore(post) {
  try {
    // Engagement score formula:
    // score = (likes * 1) + (comments * 3) + (saves * 4) + (shares * 5) + log(1 + views) * 0.1
    const engagementScore = 
      (post.likes || 0) * 1 +
      (post.comments || 0) * 3 +
      (post.saves || 0) * 4 +
      (post.shares || 0) * 5 +
      Math.log(1 + (post.views || 0)) * 0.1;

    post.engagementScore = engagementScore;
    await post.save();
    
    // Update feed items with new engagement score (async, don't wait)
    const { updateFeedItemEngagement } = require('../services/feedDelivery');
    updateFeedItemEngagement(post._id.toString())
      .catch(error => {
        console.error('Error updating feed item engagement:', error);
      });
  } catch (error) {
    console.error('Error updating engagement score:', error);
    // Don't throw, just log
  }
}

/**
 * POST /api/posts/:id/like
 * Toggle like on a post
 * NOTE: This route must come BEFORE /feed and /my-posts to avoid route conflicts
 */
router.post('/:id/like', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const userIdStr = userId.toString();
    
    // Ensure likedBy is an array
    if (!Array.isArray(post.likedBy)) {
      post.likedBy = [];
    }
    
    const isLiked = post.likedBy.some(id => {
      if (!id) return false;
      return id.toString() === userIdStr;
    });

    if (isLiked) {
      // Unlike: remove user from likedBy and decrement likes
      post.likedBy = post.likedBy.filter(id => {
        if (!id) return false;
        return id.toString() !== userIdStr;
      });
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // Like: add user to likedBy and increment likes
      post.likedBy.push(new mongoose.Types.ObjectId(userId));
      post.likes = post.likes + 1;
    }

    await post.save();
    
    // Update engagement score
    await updateEngagementScore(post);

    res.json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      data: {
        likes: post.likes,
        isLiked: !isLiked
      }
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/posts/:id/view
 * Increment view count for a post
 * NOTE: This route must come BEFORE /feed and /my-posts to avoid route conflicts
 */
router.post('/:id/view', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const userIdStr = userId.toString();
    const hasViewed = post.viewedBy.some(id => id.toString() === userIdStr);

    if (!hasViewed) {
      // Only increment if user hasn't viewed before
      post.viewedBy.push(new mongoose.Types.ObjectId(userId));
      post.views = post.views + 1;
      await post.save();
      
      // Update engagement score
      await updateEngagementScore(post);
    }

    res.json({
      success: true,
      message: 'View tracked',
      data: {
        views: post.views
      }
    });

  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Helper function to calculate and update engagement score
 */
async function updateEngagementScore(post) {
  try {
    // Engagement score formula:
    // score = (likes * 1) + (comments * 3) + (saves * 4) + (shares * 5) + log(1 + views) * 0.1
    const engagementScore = 
      (post.likes || 0) * 1 +
      (post.comments || 0) * 3 +
      (post.saves || 0) * 4 +
      (post.shares || 0) * 5 +
      Math.log(1 + (post.views || 0)) * 0.1;

    post.engagementScore = engagementScore;
    await post.save();
    
    // Update feed items with new engagement score (async, don't wait)
    const { updateFeedItemEngagement } = require('../services/feedDelivery');
    updateFeedItemEngagement(post._id.toString())
      .catch(error => {
        console.error('Error updating feed item engagement:', error);
      });
  } catch (error) {
    console.error('Error updating engagement score:', error);
    // Don't throw, just log
  }
}

/**
 * POST /api/posts/:id/save
 * Toggle save/bookmark on a post
 */
router.post('/:id/save', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const userIdStr = userId.toString();
    
    // Ensure savedBy is an array
    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }
    
    const isSaved = post.savedBy.some(id => {
      if (!id) return false;
      return id.toString() === userIdStr;
    });

    if (isSaved) {
      // Unsave: remove user from savedBy and decrement saves
      post.savedBy = post.savedBy.filter(id => {
        if (!id) return false;
        return id.toString() !== userIdStr;
      });
      post.saves = Math.max(0, (post.saves || 0) - 1);
    } else {
      // Save: add user to savedBy and increment saves
      post.savedBy.push(new mongoose.Types.ObjectId(userId));
      post.saves = (post.saves || 0) + 1;
    }

    await post.save();
    
    // Update engagement score
    await updateEngagementScore(post);

    res.json({
      success: true,
      message: isSaved ? 'Post unsaved' : 'Post saved',
      data: {
        saves: post.saves,
        isSaved: !isSaved
      }
    });

  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle save',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/posts/:id/share
 * Increment share count for a post
 */
router.post('/:id/share', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id || req.user.id;
    const { platform } = req.body; // Optional: 'copy_link', 'whatsapp', 'twitter', etc.

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment share count
    post.shares = (post.shares || 0) + 1;
    await post.save();
    
    // Update engagement score
    await updateEngagementScore(post);

    // TODO: Track share events for analytics
    // Could create a ShareEvent model to track platform, timestamp, etc.

    res.json({
      success: true,
      message: 'Share tracked',
      data: {
        shares: post.shares,
        platform: platform || 'unknown'
      }
    });

  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track share',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/posts/feed
 * Get feed posts
 */
router.get('/feed', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id || req.user.id;

    // Get list of users the current user follows
    const following = await Follow.find({
      followerId: userId,
      status: 'accepted'
    }).select('followeeId');
    
    const followingIds = following.map(f => f.followeeId);
    followingIds.push(userId); // Include own posts

    // Build privacy-aware query
    // Show: public posts OR (followers posts where user follows owner) OR (private posts where user is owner)
    const privacyQuery = {
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', userId: { $in: followingIds } },
        { privacy: 'private', userId: userId }
      ]
    };

    // Combine with status and active filters
    const query = {
      ...privacyQuery,
      status: 'published', // Only show published posts
      isActive: true
    };

    const posts = await Post.find(query)
      .populate('userId', 'name username avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        posts: posts.map(post => {
          const postInstance = new Post(post);
          const postData = postInstance.getPublicData(userId);
          // Add author info for backward compatibility
          postData.author = {
            _id: post.userId?._id,
            name: post.userId?.name,
            username: post.userId?.username,
            avatarUrl: post.userId?.avatarUrl,
            isVerified: post.userId?.isVerified
          };
          return postData;
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/posts/my-posts
 * Get current user's posts (all privacy levels)
 */
router.get('/my-posts', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id || req.user.id;

    const query = {
      userId: userId,
      status: { $in: ['published', 'processing'] }, // Show published and processing posts
      isActive: true
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);
    
    res.json({
      success: true,
      data: posts.map(post => {
        // Convert lean object back to Post instance for getPublicData
        const postInstance = new Post(post);
        return postInstance.getPublicData(userId);
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/posts/:id/report
 * Report a post (user reporting)
 */
router.post('/:id/report', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const { flagType, reason } = req.body;
    const reporterId = req.user._id || req.user.id;

    // Validate flag type
    const validFlagTypes = ['spam', 'nsfw', 'copyright', 'abuse', 'violence', 'hate', 'other'];
    if (!flagType || !validFlagTypes.includes(flagType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid flag type. Must be one of: ' + validFlagTypes.join(', ')
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already reported this post
    const existingFlag = await Flag.findOne({
      postId: postId,
      reporterUserId: reporterId,
      resolved: false
    });

    if (existingFlag) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this post'
      });
    }

    // Determine severity based on flag type
    let severity = 'medium';
    if (['copyright', 'violence', 'hate'].includes(flagType)) {
      severity = 'high';
    } else if (flagType === 'spam') {
      severity = 'low';
    }

    // Create flag
    const flag = await Flag.create({
      postId: postId,
      reporterUserId: reporterId,
      flagType: flagType,
      severity: severity,
      meta: {
        reason: reason || '',
        reportedAt: new Date()
      }
    });

    // Update post flagged count
    post.flaggedCount = (post.flaggedCount || 0) + 1;
    if (!post.flaggedReasons) {
      post.flaggedReasons = [];
    }
    post.flaggedReasons.push(flagType);
    
    // Auto-hide if flagged multiple times with high severity
    if (post.flaggedCount >= 3 && severity === 'high') {
      post.status = 'moderation_pending';
    }
    
    await post.save();

    res.json({
      success: true,
      message: 'Post reported successfully. Our moderation team will review it.',
      data: {
        flagId: flag._id,
        flagType: flag.flagType,
        severity: flag.severity
      }
    });
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

