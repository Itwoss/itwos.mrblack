const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireUser } = require('../middleware/auth');
const Post = require('../models/Post');
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
 */
router.post('/', authenticateToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const { instagramUrl, phashUploaded, phashInstagram, title, bio, tags } = req.body;

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

    if (!phashUploaded || !phashInstagram) {
      return res.status(400).json({
        success: false,
        message: 'Hash values are required'
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
    const imageUrl = `/uploads/posts/${filename}`;

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

    // Create post
    const post = new Post({
      userId: req.user._id || req.user.id,
      title: title?.trim() || undefined,
      bio: bio?.trim() || undefined,
      tags: tagsArray,
      imageUrl,
      instagramRedirectUrl: instagramUrl,
      phashValueUploaded: phashUploaded,
      phashValueInstagram: phashInstagram
    });

    await post.save();

    res.json({
      success: true,
      message: 'Post created successfully',
      data: post.getPublicData()
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
 * GET /api/posts/feed
 * Get feed posts
 */
router.get('/feed', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isActive: true })
      .populate('userId', 'name username avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments({ isActive: true });

    const userId = req.user._id || req.user.id;
    
    res.json({
      success: true,
      data: {
        posts: posts.map(post => {
          const postData = {
            _id: post._id,
            title: post.title,
            bio: post.bio,
            tags: post.tags,
            imageUrl: post.imageUrl,
            instagramRedirectUrl: post.instagramRedirectUrl,
            likes: post.likes,
            views: post.views,
            comments: post.comments,
            createdAt: post.createdAt,
            author: {
              _id: post.userId._id,
              name: post.userId.name,
              username: post.userId.username,
              avatarUrl: post.userId.avatarUrl,
              isVerified: post.userId.isVerified
            }
          };
          
          // Include whether current user liked the post
          if (post.likedBy && Array.isArray(post.likedBy)) {
            postData.isLiked = post.likedBy.some(id => id.toString() === userId.toString());
          } else {
            postData.isLiked = false;
          }
          
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
 * Get current user's posts
 */
router.get('/my-posts', authenticateToken, requireUser, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user._id || req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const userId = req.user._id || req.user.id;
    
    res.json({
      success: true,
      data: posts.map(post => {
        const postData = {
          _id: post._id,
          title: post.title,
          bio: post.bio,
          tags: post.tags,
          imageUrl: post.imageUrl,
          instagramRedirectUrl: post.instagramRedirectUrl,
          likes: post.likes,
          views: post.views,
          comments: post.comments,
          createdAt: post.createdAt
        };
        
        // Include whether current user liked the post
        if (post.likedBy && Array.isArray(post.likedBy)) {
          postData.isLiked = post.likedBy.some(id => id.toString() === userId.toString());
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

module.exports = router;

