const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Flag = require('../models/Flag');
const AdminAction = require('../models/AdminAction');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

/**
 * GET /admin/posts
 * List posts with filters for moderation
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      flagged,
      minFlagged = 0,
      status,
      privacy,
      ownerId,
      minEngagement,
      tags,
      from,
      to,
      search
    } = req.query;

    const query = {};

    // Filter by flagged status
    if (flagged === 'true') {
      query.flaggedCount = { $gte: parseInt(minFlagged) || 1 };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by privacy
    if (privacy) {
      query.privacy = privacy;
    }

    // Filter by owner
    if (ownerId) {
      query.userId = ownerId;
    }

    // Filter by minimum engagement
    if (minEngagement) {
      query.engagementScore = { $gte: parseFloat(minEngagement) };
    }

    // Filter by tags
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagsArray };
    }

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Search in caption/bio
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(query)
      .populate('userId', 'name username email avatarUrl isVerified verifiedTill')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    // Format posts with populated user data
    const formattedPosts = posts.map(post => {
      const publicData = post.getPublicData();
      // Ensure userId is populated with user object
      if (post.userId && typeof post.userId === 'object') {
        publicData.userId = {
          _id: post.userId._id,
          name: post.userId.name,
          username: post.userId.username,
          email: post.userId.email,
          avatarUrl: post.userId.avatarUrl,
          isVerified: post.userId.isVerified,
          verifiedTill: post.userId.verifiedTill
        };
      }
      // Include additional fields for admin view
      publicData.flaggedCount = post.flaggedCount || 0;
      publicData.flaggedReasons = post.flaggedReasons || [];
      return publicData;
    });

    res.json({
      success: true,
      data: {
        posts: formattedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /admin/posts/:postId
 * Get detailed post information for moderation
 */
router.get('/:postId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('userId', 'name email avatarUrl role createdAt');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get flags for this post
    const flags = await Flag.find({ postId: post._id, resolved: false })
      .populate('reporterUserId', 'name email')
      .sort({ createdAt: -1 });

    // Get admin actions for this post
    const adminActions = await AdminAction.find({
      targetType: 'post',
      targetId: post._id
    })
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        post: post.getPublicData(),
        flags: flags.map(flag => ({
          _id: flag._id,
          flagType: flag.flagType,
          severity: flag.severity,
          reporter: flag.reporterUserId,
          meta: flag.meta,
          createdAt: flag.createdAt
        })),
        adminActions: adminActions.map(action => ({
          _id: action._id,
          actionType: action.actionType,
          admin: action.adminId,
          reason: action.reason,
          extra: action.extra,
          createdAt: action.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching post details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Helper function to create audit log
 */
async function createAuditLog(actorId, actorRole, action, target, beforeState, afterState, reason, req) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      target,
      beforeState,
      afterState,
      reason,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't fail the request if audit log fails
  }
}

/**
 * POST /admin/posts/:postId/moderate
 * Moderate a post (remove, hide, etc.)
 */
router.post('/:postId/moderate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { action, reason, removeType = 'soft', notifyUser = true, notifyMessage } = req.body;
    const postId = req.params.postId;
    const adminId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const beforeState = {
      status: post.status,
      flaggedCount: post.flaggedCount
    };

    let afterState = { ...beforeState };

    // Perform moderation action
    if (action === 'remove') {
      post.status = removeType === 'hard' ? 'removed' : 'hidden';
      afterState.status = post.status;
    } else if (action === 'hide') {
      post.status = 'hidden';
      afterState.status = 'hidden';
    } else if (action === 'restore') {
      post.status = 'published';
      afterState.status = 'published';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    await post.save();

    // Remove post from feeds if hidden/removed
    if (action === 'remove' || action === 'hide') {
      const { removePostFromFeeds } = require('../services/feedDelivery');
      removePostFromFeeds(postId)
        .catch(error => {
          console.error(`Error removing post from feeds:`, error);
        });
    }

    // Create admin action record
    await AdminAction.create({
      adminId,
      actionType: action,
      targetType: 'post',
      targetId: postId,
      reason: reason || 'No reason provided',
      extra: {
        removeType,
        notifyUser,
        notifyMessage
      }
    });

    // Create audit log
    await createAuditLog(
      adminId,
      req.user.role || 'admin',
      `post_${action}`,
      { type: 'post', id: postId },
      beforeState,
      afterState,
      reason,
      req
    );

    // TODO: Invalidate cache, emit realtime event, send notification to user

    res.json({
      success: true,
      message: `Post ${action}d successfully`,
      data: {
        post: post.getPublicData()
      }
    });
  } catch (error) {
    console.error('Error moderating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /admin/posts/:postId/feature
 * Feature or unfeature a post
 */
router.post('/:postId/feature', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { feature = true, start, end, scope = 'explore', reason } = req.body;
    const postId = req.params.postId;
    const adminId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const beforeState = {
      featured: post.featured,
      featureStart: post.featureStart,
      featureEnd: post.featureEnd,
      featureScope: post.featureScope
    };

    post.featured = feature;
    if (feature) {
      post.featureStart = start ? new Date(start) : new Date();
      post.featureEnd = end ? new Date(end) : null;
      post.featureScope = scope;
    } else {
      post.featureStart = null;
      post.featureEnd = null;
      post.featureScope = null;
    }

    await post.save();

    // Create admin action
    await AdminAction.create({
      adminId,
      actionType: feature ? 'feature' : 'unfeature',
      targetType: 'post',
      targetId: postId,
      reason: reason || (feature ? 'Featured by admin' : 'Unfeatured by admin'),
      extra: { start, end, scope }
    });

    // Create audit log
    await createAuditLog(
      adminId,
      req.user.role || 'admin',
      feature ? 'post_feature' : 'post_unfeature',
      { type: 'post', id: postId },
      beforeState,
      {
        featured: post.featured,
        featureStart: post.featureStart,
        featureEnd: post.featureEnd,
        featureScope: post.featureScope
      },
      reason,
      req
    );

    res.json({
      success: true,
      message: `Post ${feature ? 'featured' : 'unfeatured'} successfully`,
      data: {
        post: post.getPublicData()
      }
    });
  } catch (error) {
    console.error('Error featuring post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to feature post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /admin/posts/:postId/adjust-score
 * Manually adjust engagement or trending score
 */
router.post('/:postId/adjust-score', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { engagementScore, trendingScore, reason } = req.body;
    const postId = req.params.postId;
    const adminId = req.user._id || req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const beforeState = {
      engagementScore: post.engagementScore,
      trendingScore: post.trendingScore
    };

    if (engagementScore !== undefined) {
      post.engagementScore = parseFloat(engagementScore);
    }
    if (trendingScore !== undefined) {
      post.trendingScore = parseFloat(trendingScore);
    }

    await post.save();

    // Create admin action
    await AdminAction.create({
      adminId,
      actionType: 'manual_score_adjust',
      targetType: 'post',
      targetId: postId,
      reason: reason || 'Manual score adjustment',
      extra: { engagementScore, trendingScore }
    });

    // Create audit log
    await createAuditLog(
      adminId,
      req.user.role || 'admin',
      'post_score_adjust',
      { type: 'post', id: postId },
      beforeState,
      {
        engagementScore: post.engagementScore,
        trendingScore: post.trendingScore
      },
      reason,
      req
    );

    res.json({
      success: true,
      message: 'Score adjusted successfully',
      data: {
        post: post.getPublicData()
      }
    });
  } catch (error) {
    console.error('Error adjusting score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust score',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /admin/posts/export
 * Export posts to CSV
 */
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to, minEngagement } = req.query;

    const query = { status: 'published' };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    if (minEngagement) {
      query.engagementScore = { $gte: parseFloat(minEngagement) };
    }

    const posts = await Post.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10000); // Limit export size

    // Generate CSV
    const csvHeader = 'Post ID,Owner,Title,Caption,Tags,Privacy,Status,Likes,Comments,Saves,Shares,Views,Engagement Score,Trending Score,Featured,Created At\n';
    const csvRows = posts.map(post => {
      const owner = post.userId ? `${post.userId.name} (${post.userId.email})` : 'Unknown';
      return [
        post._id,
        `"${owner}"`,
        `"${(post.title || '').replace(/"/g, '""')}"`,
        `"${(post.bio || '').replace(/"/g, '""')}"`,
        `"${(post.tags || []).join(', ')}"`,
        post.privacy,
        post.status,
        post.likes,
        post.comments,
        post.saves,
        post.shares,
        post.views,
        post.engagementScore,
        post.trendingScore,
        post.featured,
        post.createdAt
      ].join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=posts-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

