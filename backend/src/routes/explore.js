const express = require('express');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { getTrendingPosts, getTrendingCandidates } = require('../services/trendingAlgorithm');
const { deliverPostToUsers } = require('../services/feedDelivery');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const router = express.Router();

/**
 * GET /api/explore
 * Get Explore feed with trending and personalized posts
 */
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      type = 'trending' // 'trending', 'featured', 'personalized'
    } = req.query;
    
    const userId = req.user._id || req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts = [];

    if (type === 'trending') {
      // Get trending posts
      const trendingPosts = await getTrendingPosts({
        limit: parseInt(limit) * 2, // Get more to filter
        minTrendingScore: 10,
        hoursWindow: 48
      });

      // Filter out posts from users the current user already follows
      const following = await Follow.find({
        followerId: userId,
        status: 'accepted'
      }).select('followeeId');
      
      const followingIds = following.map(f => f.followeeId.toString());
      followingIds.push(userId.toString());

      // Filter: only show posts from users not in following list
      posts = trendingPosts
        .filter(post => {
          const postOwnerId = post.userId?._id?.toString() || post.userId?.toString();
          return !followingIds.includes(postOwnerId);
        })
        .slice(skip, skip + parseInt(limit));

    } else if (type === 'featured') {
      // Get featured posts
      const now = new Date();
      posts = await Post.find({
        status: 'published',
        privacy: 'public',
        featured: true,
        $or: [
          { featureStart: { $lte: now }, featureEnd: { $gte: now } },
          { featureStart: { $lte: now }, featureEnd: null }
        ]
      })
        .populate('userId', 'name username avatarUrl isVerified')
        .sort({ featureStart: -1, engagementScore: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      posts = posts.map(post => {
        const postInstance = new Post(post);
        return postInstance.getPublicData(userId);
      });

    } else if (type === 'personalized') {
      // Personalized explore based on user interests, engagement patterns, etc.
      // For now, return high-engagement posts from non-followed users
      const following = await Follow.find({
        followerId: userId,
        status: 'accepted'
      }).select('followeeId');
      
      const followingIds = following.map(f => f.followeeId);
      followingIds.push(userId);

      posts = await Post.find({
        status: 'published',
        privacy: 'public',
        userId: { $nin: followingIds },
        engagementScore: { $gte: 20 } // Minimum engagement threshold
      })
        .populate('userId', 'name username avatarUrl isVerified')
        .sort({ engagementScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      posts = posts.map(post => {
        const postInstance = new Post(post);
        return postInstance.getPublicData(userId);
      });
    }

    // Deliver trending posts to user's explore feed (async)
    if (type === 'trending' && posts.length > 0) {
      const postIds = posts.map(p => p._id);
      deliverPostToUsers(postIds[0], [userId], 'explore')
        .catch(error => {
          console.error('Error delivering explore post to feed:', error);
        });
    }

    res.json({
      success: true,
      data: {
        posts: posts,
        type: type,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: posts.length, // Approximate
          pages: Math.ceil(posts.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching explore feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch explore feed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/explore/trending
 * Get trending posts specifically
 */
router.get('/trending', authenticateToken, requireUser, async (req, res) => {
  try {
    const { limit = 50, minScore = 10 } = req.query;

    const posts = await getTrendingPosts({
      limit: parseInt(limit),
      minTrendingScore: parseFloat(minScore),
      hoursWindow: 48
    });

    res.json({
      success: true,
      data: {
        posts: posts,
        count: posts.length
      }
    });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/explore/candidates
 * Get trending candidates (for admin/monitoring)
 */
router.get('/candidates', authenticateToken, requireUser, async (req, res) => {
  try {
    // Only admins can see candidates
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { limit = 100, minEngagement = 10 } = req.query;

    const candidates = await getTrendingCandidates({
      limit: parseInt(limit),
      minEngagementScore: parseFloat(minEngagement),
      hoursWindow: 24
    });

    res.json({
      success: true,
      data: {
        candidates: candidates,
        count: candidates.length
      }
    });
  } catch (error) {
    console.error('Error fetching trending candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

