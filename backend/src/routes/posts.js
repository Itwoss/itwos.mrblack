const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireUser, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const Flag = require('../models/Flag');
const Follow = require('../models/Follow');
const { compareImages, compressImage } = require('../utils/imageMatching');
const { extractInstagramImageUrl } = require('../utils/instagramExtractor');
const router = express.Router();

// Test route to verify router is working
router.get('/test-route', (req, res) => {
  res.json({ success: true, message: 'Posts router is working', path: req.path });
});

// Configure multer for post image uploads
const storage = multer.memoryStorage(); // Use memory storage for processing

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit (increased for audio)
  },
  fileFilter: (req, file, cb) => {
    // Allow both images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      // Also check file extension as fallback
      const validExtensions = /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a|aac|flac)$/i;
      if (validExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Only image and audio files are allowed'), false);
      }
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
// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer error in POST /api/posts:', {
      message: err.message,
      code: err.code,
      field: err.field,
      name: err.name
    });
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected file field: ${err.field}. Only 'image' and 'audio' fields are allowed.`,
        error: err.message
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }
  
  if (err) {
    console.error('❌ Error in POST /api/posts:', err);
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }
  
  next();
};

router.post('/', authenticateToken, requireUser, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), handleMulterError, async (req, res) => {
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
    let audioUrl = null;
    let mediaKeysArray = [];

    // Extract files from req.files (multer.fields format)
    const imageFile = req.files?.image?.[0];
    const audioFile = req.files?.audio?.[0];

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
    else if (audioFile || imageFile) {
      // Handle audio file if present
      if (audioFile) {
        const isAudio = audioFile.mimetype.startsWith('audio/') || 
                        /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(audioFile.originalname);
        
        if (isAudio) {
          const uploadPath = path.join(__dirname, '../../uploads/posts/audio');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          const ext = path.extname(audioFile.originalname) || '.mp3';
          const filename = `audio-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
          const filepath = path.join(uploadPath, filename);
          
          await fs.promises.writeFile(filepath, audioFile.buffer);
          audioUrl = `/uploads/posts/audio/${filename}`;
          mediaKeysArray.push(audioUrl);
        }
      }
      
      // Handle image file if present
      if (imageFile) {
        // Handle image file upload
        // Instagram URL and hash values are only required if instagramUrl is provided
        if (instagramUrl) {
          // Instagram verification mode - require hash values
          if (!phashUploaded || !phashInstagram) {
            return res.status(400).json({
              success: false,
              message: 'Hash values are required when Instagram URL is provided. Please verify images first.'
            });
          }
        }
        // Direct upload mode - no Instagram URL needed

        console.log('📦 Processing image file for Direct Upload...', {
          filename: imageFile.originalname,
          mimetype: imageFile.mimetype,
          size: imageFile.size,
          hasInstagramUrl: !!instagramUrl
        });

        // Compress image
        console.log('📦 Compressing image...');
        const compressedBuffer = await compressImage(imageFile.buffer, 500);

        // Save compressed image
        const uploadPath = path.join(__dirname, '../../uploads/posts');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const filename = `post-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const filepath = path.join(uploadPath, filename);
        
        await fs.promises.writeFile(filepath, compressedBuffer);
        imageUrl = `/uploads/posts/${filename}`;
        mediaKeysArray.push(imageUrl); // Add to mediaKeys array (may already have audio)
        
        console.log('✅ Image saved for Direct Upload:', {
          imageUrl: imageUrl,
          filepath: filepath,
          fileExists: fs.existsSync(filepath)
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either mediaKeys, image file, or audio file is required'
      });
    }

    // Ensure at least one media item was processed (image or audio)
    if (mediaKeysArray.length === 0 && !imageUrl && !audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'No media files were processed. Please upload an image or audio file.'
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

    // Determine if this is an audio-only post (no image)
    const isAudioOnlyPost = audioFile && !imageFile && (
      audioFile.mimetype.startsWith('audio/') || 
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(audioFile.originalname)
    );
    
    // Get audio URL and image URL
    const finalAudioUrl = audioUrl || undefined;
    const finalImageUrl = imageUrl || undefined;

    // Validation: At least imageUrl or audioUrl must be present
    if (!finalImageUrl && !finalAudioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Either an image or audio file is required to create a post.'
      });
    }

    // Determine post status
    // Direct Upload (no instagramUrl) = 'published' immediately
    // URL & Image Match (has instagramUrl) = 'processing' (needs verification)
    const postStatus = (isAudioOnlyPost || !instagramUrl) ? 'published' : 'processing';
    
    console.log('📝 Creating post with:', {
      hasInstagramUrl: !!instagramUrl,
      isAudioOnlyPost: isAudioOnlyPost,
      postStatus: postStatus,
      hasImage: !!finalImageUrl,
      hasAudio: !!finalAudioUrl,
      imageUrl: finalImageUrl
    });
    
    // Create post with new fields
    const post = new Post({
      userId: userId,
      title: title?.trim() || undefined,
      bio: bio?.trim() || undefined,
      tags: tagsArray,
      imageUrl: finalImageUrl, // Keep for backward compatibility - THIS IS CRITICAL FOR DIRECT UPLOAD
      audioUrl: finalAudioUrl, // Audio file URL
      instagramRedirectUrl: instagramUrl || undefined, // Optional for new flow
      phashValueUploaded: phashUploaded || undefined, // Optional for new flow
      phashValueInstagram: phashInstagram || undefined, // Optional for new flow
      // New Instagram-like fields
      privacy: privacy,
      status: postStatus, // Audio-only or direct posts are published immediately, Instagram posts need processing
      isActive: true, // Explicitly set to true to ensure posts show in feed
      mediaKeys: mediaKeysArray
    });

    await post.save();
    
    // Log post creation for debugging
    const postMode = instagramUrl ? 'URL & Image Match' : 'Direct Upload';
    console.log('✅ Post created:', {
      postId: post._id,
      userId: userId,
      status: post.status,
      isActive: post.isActive,
      privacy: post.privacy,
      hasImage: !!post.imageUrl,
      hasAudio: !!post.audioUrl,
      imageUrl: post.imageUrl,
      postMode: postMode
    });
    
    // Verify the post was saved correctly and can be found in feed query
    const savedPost = await Post.findById(post._id).lean();
    console.log('🔍 Post saved verification:', {
      postId: savedPost._id,
      imageUrl: savedPost.imageUrl,
      status: savedPost.status,
      isActive: savedPost.isActive,
      postMode: postMode
    });
    
    // Test if post will appear in feed query
    const feedQueryTest = await Post.find({ 
      isActive: true, 
      status: { $in: ['published', 'processing'] },
      _id: post._id
    }).countDocuments();
    console.log(`🔍 Feed query test for post ${post._id}: ${feedQueryTest > 0 ? '✅ WILL APPEAR' : '❌ WILL NOT APPEAR'} in feed`);

    // Queue image processing job (async, don't wait) - only for Instagram posts that need processing
    if (instagramUrl && finalImageUrl && !isAudioOnlyPost) {
      try {
        const { processPost } = require('../services/postProcessor');
        processPost(post._id.toString())
          .then(result => {
            console.log(`✅ Post ${post._id} processed:`, result);
          })
          .catch(error => {
            console.error(`❌ Post ${post._id} processing failed:`, error);
            // Post remains in 'processing' status, admin can review
          });
      } catch (err) {
        console.error(`❌ Error requiring postProcessor:`, err);
        // Don't fail the post creation if processing service is unavailable
      }
    }

    res.json({
      success: true,
      message: 'Post created successfully',
      data: post.getPublicData(userId)
    });

  } catch (error) {
    console.error('❌ Post creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body keys:', Object.keys(req.body || {}));
    console.error('Request files:', req.files ? Object.keys(req.files) : 'No files');
    
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
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
    const Follow = require('../models/Follow');
    const following = await Follow.find({
      followerId: userId,
      status: 'accepted'
    }).select('followeeId');
    
    const followingIds = new Set(
      following.map(f => f.followeeId.toString())
    );
    followingIds.add(userId.toString()); // Always include own posts

    // Get all posts with user info (including isPrivate)
    // Include both 'published' and 'processing' status posts (processing posts are direct uploads that are immediately visible)
    const allPosts = await Post.find({ 
      isActive: true, 
      status: { $in: ['published', 'processing'] }
    })
      .populate('userId', 'name username avatarUrl isVerified isPrivate')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Feed query: Found ${allPosts.length} posts with isActive=true and status in ['published', 'processing']`);
    console.log(`📊 User ${userId} is following ${followingIds.size - 1} users (excluding self)`);
    
    // Log ALL posts to check Direct Upload posts
    console.log(`📸 ALL posts from query (first 10):`, allPosts.slice(0, 10).map(p => ({
      id: p._id,
      userId: p.userId?._id || p.userId,
      status: p.status,
      isActive: p.isActive,
      hasImageUrl: !!p.imageUrl,
      imageUrl: p.imageUrl,
      hasInstagramUrl: !!p.instagramRedirectUrl,
      postType: p.instagramRedirectUrl ? 'URL & Image Match' : 'Direct Upload',
      privacy: p.privacy,
      accountIsPrivate: p.userId?.isPrivate
    })));

    // Filter posts based on account privacy settings
    const visiblePosts = allPosts.filter(post => {
      // Handle case where userId might not be populated
      if (!post.userId) {
        console.log(`⚠️ Post ${post._id} has no userId, skipping`);
        return false;
      }
      
      const postOwnerId = post.userId._id?.toString() || post.userId.toString();
      const isOwnPost = postOwnerId === userId.toString();
      
      // Check if account is private - explicitly check for true, default to public if undefined/null
      const isPrivateAccount = post.userId.isPrivate === true || post.userId.isPrivate === 'true';
      const isFollowing = followingIds.has(postOwnerId);
      
      const postType = post.instagramRedirectUrl ? 'URL & Image Match' : 'Direct Upload';
      
      // Always show own posts
      if (isOwnPost) {
        console.log(`✅ Including own post ${post._id} (${postType}) from user ${postOwnerId} - status: ${post.status}, isActive: ${post.isActive}`);
        return true;
      }
      
      // If account is explicitly marked as private, only show if user is following
      if (isPrivateAccount) {
        const canView = isFollowing;
        if (!canView) {
          console.log(`🔒 Filtering out private post ${post._id} (${postType}) from user ${postOwnerId} (not following, isPrivate=${post.userId.isPrivate})`);
        } else {
          console.log(`✅ Including private post ${post._id} (${postType}) from user ${postOwnerId} (following)`);
        }
        return canView;
      }
      
      // Public accounts (isPrivate is false, null, or undefined) - show all posts to everyone
      console.log(`✅ Including public post ${post._id} (${postType}) from user ${postOwnerId} (public account, isPrivate=${post.userId.isPrivate})`);
      return true;
    });
    
    const ownPostsCount = visiblePosts.filter(p => (p.userId?._id?.toString() || p.userId?.toString()) === userId.toString()).length;
    const otherUsersPostsCount = visiblePosts.length - ownPostsCount;
    console.log(`📊 Feed stats: ${allPosts.length} total posts, ${visiblePosts.length} visible posts (${ownPostsCount} own, ${otherUsersPostsCount} from other users)`);

    // Apply pagination to filtered results
    const paginatedPosts = visiblePosts.slice(skip, skip + parseInt(limit));
    const total = visiblePosts.length;
    
    // Convert to Post instances and populate comments
    // Use the original postData from visiblePosts to preserve all fields including imageUrl
    const postsWithComments = await Promise.all(
      paginatedPosts.map(async (postData) => {
        // Get the full post with comments populated, but preserve the original data
        const fullPost = await Post.findById(postData._id)
          .populate('commentsArray.userId', 'name username avatarUrl')
          .lean();
        
        // Ensure imageUrl is preserved from original postData (in case it's missing in fullPost)
        if (postData.imageUrl && !fullPost.imageUrl) {
          fullPost.imageUrl = postData.imageUrl;
        }
        if (postData.audioUrl && !fullPost.audioUrl) {
          fullPost.audioUrl = postData.audioUrl;
        }
        
        return fullPost;
      })
    );

    res.json({
      success: true,
      data: {
        posts: postsWithComments.map(post => {
          // CRITICAL: Use the post directly instead of creating a new Post instance
          // This ensures all fields including imageUrl are preserved
          const postMode = post.instagramRedirectUrl ? 'URL & Image Match' : 'Direct Upload';
          
          // Build post data directly from the post object to ensure imageUrl is included
          const postData = {
            _id: post._id,
            userId: post.userId?._id || post.userId,
            title: post.title,
            bio: post.bio,
            tags: post.tags,
            imageUrl: post.imageUrl, // CRITICAL: Directly use post.imageUrl
            audioUrl: post.audioUrl,
            instagramRedirectUrl: post.instagramRedirectUrl,
            privacy: post.privacy,
            status: post.status,
            mediaKeys: post.mediaKeys,
            cdnUrls: post.cdnUrls,
            likes: post.likes || 0,
            views: post.views || 0,
            comments: post.comments || 0,
            commentsArray: post.commentsArray || [],
            saves: post.saves || 0,
            shares: post.shares || 0,
            stats: post.stats || {},
            engagementScore: post.engagementScore || 0,
            trendingScore: post.trendingScore || 0,
            trendingStatus: post.trendingStatus || false,
            trendingSince: post.trendingSince,
            trendingRank: post.trendingRank,
            featured: post.featured || false,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            processedAt: post.processedAt
          };
          
          // Include whether current user liked/saved the post
          if (userId) {
            postData.isLiked = post.likedBy?.some(id => id.toString() === userId.toString()) || false;
            postData.isSaved = post.savedBy?.some(id => id.toString() === userId.toString()) || false;
          }
          
          // Debug: Log post data to verify imageUrl is included
          console.log(`📸 Feed post ${post._id} (${postMode}):`, {
            hasImageUrl: !!postData.imageUrl,
            imageUrl: postData.imageUrl,
            status: postData.status,
            isActive: post.isActive !== false,
            hasInstagramUrl: !!post.instagramRedirectUrl
          });
          
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

/**
 * GET /api/posts/saved
 * Get current user's saved posts
 */
router.get('/saved', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id || req.user.id;

    // Find posts where current user is in savedBy array
    const query = {
      savedBy: userId,
      isActive: true,
      status: 'published'
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
      data: posts.map(post => {
        const postInstance = new Post(post);
        const postData = postInstance.getPublicData(userId);
        // Add author info
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
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/posts/user/:userId
 * Get posts by a specific user ID (with privacy check)
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;
    
    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get the user whose posts we're trying to view
    const User = require('../models/User');
    const postOwner = await User.findById(userId);
    
    if (!postOwner) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current user ID if authenticated
    const currentUserId = req.user?._id || req.user?.id;
    const isViewingOwnProfile = currentUserId && currentUserId.toString() === userId.toString();

    // Privacy check: If account is private and viewer is not the owner
    if (postOwner.isPrivate && !isViewingOwnProfile) {
      // Check if current user is following the post owner
      let canViewPosts = false;
      
      if (currentUserId) {
        const Follow = require('../models/Follow');
        const followRelationship = await Follow.findOne({
          followerId: currentUserId,
          followeeId: userId,
          status: 'accepted'
        });
        
        canViewPosts = !!followRelationship;
        
        console.log('🔍 Follow relationship check:', {
          followerId: currentUserId,
          followeeId: userId,
          found: !!followRelationship,
          status: followRelationship?.status,
          canViewPosts
        });
      } else {
        console.log('⚠️ No currentUserId - user not authenticated');
      }

      // If not authorized, return empty array
      if (!canViewPosts) {
        return res.json({
          success: true,
          data: [],
          message: 'This account is private. Follow to see their posts.',
          isPrivate: true
        });
      }
    }

    // Find posts by user ID (include all active posts, not just published)
    const posts = await Post.find({ 
      userId: userId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: posts.map(post => {
        const postData = {
          _id: post._id,
          title: post.title,
          bio: post.bio,
          tags: post.tags,
          imageUrl: post.imageUrl,
          audioUrl: post.audioUrl,
          instagramRedirectUrl: post.instagramRedirectUrl,
          likes: post.likes || 0,
          views: post.views || 0,
          comments: post.comments || 0,
          createdAt: post.createdAt,
          userId: post.userId
        };
        
        // Include whether current user liked the post (if authenticated)
        if (currentUserId && post.likedBy && Array.isArray(post.likedBy)) {
          postData.isLiked = post.likedBy.some(id => id.toString() === currentUserId.toString());
        } else {
          postData.isLiked = false;
        }
        
        return postData;
      })
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
 * DELETE /api/posts/:id
 * Delete a post (only owner can delete)
 */
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
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

    // Check if user is the owner
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Optionally delete associated files from storage
    // TODO: Add file deletion logic if using S3 or local storage

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/posts/:id
 * Get a single post with comments
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 GET /api/posts/:id route hit', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      params: req.params,
      query: req.query
    });
    
    const postId = req.params.id;
    
    if (!postId) {
      console.error('❌ No postId in request params:', req.params);
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        receivedParams: req.params
      });
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.log('❌ Invalid ObjectId format:', postId);
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format'
      });
    }
    
    const userId = req.user?._id || req.user?.id;

    console.log('📥 Fetching post:', postId, 'for user:', userId || 'anonymous');

    const post = await Post.findById(postId)
      .populate('userId', 'name username avatarUrl isVerified')
      .populate('commentsArray.userId', 'name username avatarUrl');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const postData = post.getPublicData(userId);
    postData.commentsArray = post.commentsArray || [];

    console.log('✅ Post fetched successfully:', postId, 'Comments:', postData.commentsArray.length);

    res.json({
      success: true,
      data: postData
    });

  } catch (error) {
    console.error('❌ Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/posts/:id/comments
 * Add a comment to a post
 */
router.post('/:id/comments', authenticateToken, requireUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id || req.user.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is active
    if (!post.isActive || post.status === 'removed' || post.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Cannot comment on this post'
      });
    }

    // Initialize commentsArray if it doesn't exist
    if (!post.commentsArray) {
      post.commentsArray = [];
    }

    // Add comment to commentsArray
    const newComment = {
      userId: userId,
      text: text.trim(),
      createdAt: new Date()
    };
    post.commentsArray.push(newComment);

    // Increment comment count
    post.comments = (post.comments || 0) + 1;
    await post.save();

    // Populate all comments with user data
    await post.populate('commentsArray.userId', 'name username avatarUrl');

    // Create notification for post owner (if commenter is not the owner)
    const postOwnerId = post.userId.toString();
    if (postOwnerId !== userId.toString()) {
      try {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        const commenter = await User.findById(userId).select('name username avatarUrl');
        
        const commentPreview = text.trim().substring(0, 50);
        const notification = new Notification({
          userId: post.userId,
          type: 'comment',
          title: 'New Comment',
          message: `${commenter?.name || commenter?.username || 'Someone'} commented on your post${commentPreview ? `: "${commentPreview}${text.trim().length > 50 ? '...' : ''}"` : ''}`,
          data: {
            postId: post._id.toString(),
            commentId: post.commentsArray[post.commentsArray.length - 1]._id?.toString(),
            commenterId: userId.toString(),
            commenterName: commenter?.name || commenter?.username,
            commenterAvatar: commenter?.avatarUrl,
            commentText: text.trim()
          },
          priority: 'normal'
        });
        
        await notification.save();
        console.log(`✅ Comment notification created for post owner: ${postOwnerId}`, {
          notificationId: notification._id,
          postId: post._id.toString(),
          commenterId: userId.toString()
        });

        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          const socketRoom = `user:${postOwnerId}`;
          const notificationData = {
            _id: notification._id,
            type: 'comment',
            title: notification.title,
            message: notification.message,
            from: {
              _id: commenter?._id,
              name: commenter?.name,
              username: commenter?.username,
              avatarUrl: commenter?.avatarUrl
            },
            data: {
              postId: post._id.toString(),
              commentId: post.commentsArray[post.commentsArray.length - 1]._id?.toString(),
              commentText: text.trim().substring(0, 100)
            },
            read: false,
            createdAt: new Date()
          };
          
          io.to(socketRoom).emit('new_notification', notificationData);
          console.log(`📬 Comment notification sent via Socket.IO to room: ${socketRoom}`, notificationData);
        } else {
          console.warn('⚠️ Socket.IO not available for real-time notification');
        }
      } catch (notifError) {
        console.error('❌ Failed to create comment notification:', notifError);
        // Don't fail the request if notification fails
      }
    } else {
      console.log(`ℹ️ Comment from post owner, skipping notification`);
    }

    // Update engagement score
    await updateEngagementScore(post);

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comments: post.comments,
        commentsArray: post.commentsArray
      }
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

