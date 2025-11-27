const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const TrendingSettings = require('../models/TrendingSettings');

const router = express.Router();

/**
 * GET /api/admin/trending/settings
 * Get current trending settings
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await TrendingSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching trending settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/trending/settings
 * Update trending settings
 */
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      trendingDelayHours,
      minTrendingScore,
      minEngagementThreshold,
      weights,
      decayConstant,
      trendingTopPercent,
      trendingTopCount
    } = req.body;

    const settings = await TrendingSettings.getSettings();
    const adminId = req.user._id || req.user.id;

    // Update fields if provided
    if (trendingDelayHours !== undefined) {
      if (trendingDelayHours < 1 || trendingDelayHours > 3) {
        return res.status(400).json({
          success: false,
          message: 'Trending delay must be between 1 and 3 hours'
        });
      }
      settings.trendingDelayHours = trendingDelayHours;
    }

    if (minTrendingScore !== undefined) {
      if (minTrendingScore < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum trending score must be >= 0'
        });
      }
      settings.minTrendingScore = minTrendingScore;
    }

    if (minEngagementThreshold) {
      settings.minEngagementThreshold = {
        ...settings.minEngagementThreshold,
        ...minEngagementThreshold
      };
    }

    if (weights) {
      settings.weights = {
        ...settings.weights,
        ...weights
      };
    }

    if (decayConstant !== undefined) {
      if (decayConstant < 1) {
        return res.status(400).json({
          success: false,
          message: 'Decay constant must be >= 1'
        });
      }
      settings.decayConstant = decayConstant;
    }

    if (trendingTopPercent !== undefined) {
      if (trendingTopPercent < 0.1 || trendingTopPercent > 10) {
        return res.status(400).json({
          success: false,
          message: 'Trending top percent must be between 0.1 and 10'
        });
      }
      settings.trendingTopPercent = trendingTopPercent;
    }

    if (trendingTopCount !== undefined) {
      if (trendingTopCount < 10 || trendingTopCount > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Trending top count must be between 10 and 1000'
        });
      }
      settings.trendingTopCount = trendingTopCount;
    }

    settings.lastUpdatedBy = adminId;
    settings.lastUpdatedAt = new Date();

    await settings.save();

    console.log(`✅ Trending settings updated by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Trending settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating trending settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trending settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/trending/settings/reset
 * Reset trending settings to defaults
 */
router.post('/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await TrendingSettings.getSettings();
    const adminId = req.user._id || req.user.id;

    // Reset to defaults
    settings.trendingDelayHours = 2;
    settings.minTrendingScore = 5.0;
    settings.minEngagementThreshold = {
      views: 50,
      likes: 10,
      comments: 3,
      saves: 5,
      shares: 2
    };
    settings.weights = {
      views: 1.2,
      likes: 1.0,
      comments: 1.5,
      saves: 1.8,
      shares: 1.6,
      followerNorm: 0.4
    };
    settings.decayConstant = 12;
    settings.trendingTopPercent = 0.5;
    settings.trendingTopCount = 100;
    settings.lastUpdatedBy = adminId;
    settings.lastUpdatedAt = new Date();

    await settings.save();

    res.json({
      success: true,
      message: 'Trending settings reset to defaults',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting trending settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset trending settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

