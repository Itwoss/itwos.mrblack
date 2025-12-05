const express = require('express');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/analytics/track
 * Track an analytics event
 * Public endpoint (requires authentication)
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const {
      eventType,
      path,
      screen,
      targetUserId,
      relatedId,
      callType,
      duration,
      deviceInfo,
      metadata
    } = req.body;

    // Validate required fields
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'eventType is required'
      });
    }

    // Validate eventType enum
    const validEventTypes = [
      'page_view',
      'page_stay_time',
      'call_start',
      'call_end',
      'video_play',
      'video_pause',
      'video_complete',
      'video_seek',
      'chat_message_sent',
      'chat_room_entered',
      'chat_room_left'
    ];

    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`
      });
    }

    // Create analytics event
    const event = new AnalyticsEvent({
      userId,
      eventType,
      path: path || screen || '/unknown',
      screen: screen || path,
      targetUserId: targetUserId || null,
      relatedId: relatedId || null,
      callType: callType || null,
      duration: duration || 0,
      timestamp: new Date(),
      deviceInfo: deviceInfo || {},
      metadata: metadata || {}
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/analytics/summary
 * Get analytics summary for admin dashboard
 * Admin only
 */
router.get('/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no date range provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Total active users in date range
    const activeUsers = await AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: start, $lte: end }
    });

    // Total video call minutes
    const videoCalls = await AnalyticsEvent.find({
      eventType: 'call_end',
      callType: 'video',
      timestamp: { $gte: start, $lte: end }
    });
    const videoCallMinutes = videoCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / 60;

    // Total audio call minutes
    const audioCalls = await AnalyticsEvent.find({
      eventType: 'call_end',
      callType: 'audio',
      timestamp: { $gte: start, $lte: end }
    });
    const audioCallMinutes = audioCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / 60;

    // Top 5 most used paths/screens
    const topPaths = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'page_view',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$path',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          path: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Total page views
    const totalPageViews = await AnalyticsEvent.countDocuments({
      eventType: 'page_view',
      timestamp: { $gte: start, $lte: end }
    });

    // Total time spent (sum of all page_stay_time durations)
    const totalTimeSpent = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'page_stay_time',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$duration' }
        }
      }
    ]);

    const totalMinutesSpent = totalTimeSpent.length > 0 ? totalTimeSpent[0].totalSeconds / 60 : 0;

    res.json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        activeUsers: activeUsers.length,
        videoCallMinutes: Math.round(videoCallMinutes * 100) / 100,
        audioCallMinutes: Math.round(audioCallMinutes * 100) / 100,
        totalPageViews,
        totalMinutesSpent: Math.round(totalMinutesSpent * 100) / 100,
        topPaths: topPaths.map(item => ({
          path: item.path,
          views: item.count,
          uniqueUsers: item.uniqueUsers
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/analytics/top-video-content
 * Get top N videos sorted by total watch time
 * Admin only
 */
router.get('/top-video-content', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Aggregate video watch data
    const topVideos = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: { $in: ['video_play', 'video_complete'] },
          relatedId: { $ne: null },
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$relatedId',
          totalWatchTime: { $sum: '$duration' },
          playCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'video_play'] }, 1, 0] }
          },
          completeCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'video_complete'] }, 1, 0] }
          },
          uniqueViewers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          videoId: '$_id',
          totalWatchTime: 1,
          totalWatchMinutes: { $divide: ['$totalWatchTime', 60] },
          playCount: 1,
          completeCount: 1,
          uniqueViewers: { $size: '$uniqueViewers' },
          completionRate: {
            $cond: [
              { $eq: ['$playCount', 0] },
              0,
              { $multiply: [{ $divide: ['$completeCount', '$playCount'] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { totalWatchTime: -1 }
      },
      {
        $limit: limit
      }
    ]);

    res.json({
      success: true,
      data: {
        videos: topVideos.map(video => ({
          videoId: video.videoId,
          totalWatchMinutes: Math.round(video.totalWatchMinutes * 100) / 100,
          playCount: video.playCount,
          completeCount: video.completeCount,
          uniqueViewers: video.uniqueViewers,
          completionRate: Math.round(video.completionRate * 100) / 100
        })),
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching top video content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top video content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/analytics/user-usage/:userId
 * Get usage statistics for a specific user
 * Admin only
 */
router.get('/user-usage/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all events for this user in date range
    const events = await AnalyticsEvent.find({
      userId,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });

    // Calculate time spent per section
    const sectionTime = {};
    const sectionViews = {};

    events.forEach(event => {
      if (event.eventType === 'page_stay_time') {
        const section = getSectionFromPath(event.path);
        sectionTime[section] = (sectionTime[section] || 0) + (event.duration || 0);
      } else if (event.eventType === 'page_view') {
        const section = getSectionFromPath(event.path);
        sectionViews[section] = (sectionViews[section] || 0) + 1;
      }
    });

    // Get call statistics
    const callEvents = events.filter(e => 
      e.eventType === 'call_start' || e.eventType === 'call_end'
    );

    const videoCallMinutes = callEvents
      .filter(e => e.callType === 'video' && e.eventType === 'call_end')
      .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;

    const audioCallMinutes = callEvents
      .filter(e => e.callType === 'audio' && e.eventType === 'call_end')
      .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;

    // Get video watch statistics
    const videoEvents = events.filter(e => 
      ['video_play', 'video_complete'].includes(e.eventType)
    );
    const totalVideoWatchMinutes = videoEvents
      .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;

    // Format section time in minutes
    const sectionTimeMinutes = {};
    Object.keys(sectionTime).forEach(section => {
      sectionTimeMinutes[section] = Math.round((sectionTime[section] / 60) * 100) / 100;
    });

    res.json({
      success: true,
      data: {
        userId,
        userName: user.name,
        userEmail: user.email,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        sectionTimeMinutes,
        sectionViews,
        videoCallMinutes: Math.round(videoCallMinutes * 100) / 100,
        audioCallMinutes: Math.round(audioCallMinutes * 100) / 100,
        totalVideoWatchMinutes: Math.round(totalVideoWatchMinutes * 100) / 100,
        totalEvents: events.length,
        recentEvents: events.slice(0, 50).map(e => ({
          eventType: e.eventType,
          path: e.path,
          timestamp: e.timestamp,
          duration: e.duration
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user usage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/analytics/recent-calls
 * Get recent calls with caller/receiver info
 * Admin only
 */
router.get('/recent-calls', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const calls = await AnalyticsEvent.find({
      eventType: 'call_end',
      timestamp: { $gte: start, $lte: end }
    })
      .populate('userId', 'name email avatarUrl')
      .populate('targetUserId', 'name email avatarUrl')
      .sort({ timestamp: -1 })
      .limit(limit);

    const formattedCalls = calls.map(call => ({
      callId: call._id,
      caller: {
        id: call.userId._id,
        name: call.userId.name,
        email: call.userId.email,
        avatarUrl: call.userId.avatarUrl
      },
      receiver: call.targetUserId ? {
        id: call.targetUserId._id,
        name: call.targetUserId.name,
        email: call.targetUserId.email,
        avatarUrl: call.targetUserId.avatarUrl
      } : null,
      callType: call.callType,
      duration: call.duration,
      durationMinutes: Math.round((call.duration / 60) * 100) / 100,
      timestamp: call.timestamp
    }));

    res.json({
      success: true,
      data: {
        calls: formattedCalls,
        total: formattedCalls.length,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching recent calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent calls',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to extract section from path
function getSectionFromPath(path) {
  if (!path) return 'unknown';
  
  if (path.includes('/feed')) return 'feed';
  if (path.includes('/chat')) return 'chat';
  if (path.includes('/video-call')) return 'video-call';
  if (path.includes('/audio-call')) return 'audio-call';
  if (path.includes('/profile')) return 'profile';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/explore')) return 'explore';
  
  return 'other';
}

module.exports = router;

