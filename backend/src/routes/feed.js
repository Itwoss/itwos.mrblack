const express = require('express');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { getUserFeed } = require('../services/feedDelivery');
const router = express.Router();

/**
 * GET /api/feed
 * Get user's personalized feed using feed_items (fan-out approach)
 */
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, source } = req.query;
    const userId = req.user._id || req.user.id;

    const result = await getUserFeed(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      source: source || null
    });

    res.json({
      success: true,
      data: {
        posts: result.feedItems.map(item => item.post).filter(Boolean),
        pagination: result.pagination
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

module.exports = router;

