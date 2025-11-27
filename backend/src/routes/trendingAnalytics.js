const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Post = require('../models/Post');
const router = express.Router();

/**
 * GET /api/admin/trending/analytics
 * Get trending analytics for admin dashboard
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Get trending posts in the time period
    const trendingPosts = await Post.find({
      trendingStatus: true,
      trendingSince: { $gte: cutoffDate }
    })
      .populate('userId', 'name username followersCount')
      .sort({ trendingScore: -1 })
      .lean();

    // Calculate statistics
    const totalTrending = trendingPosts.length;
    const avgTrendingScore = trendingPosts.length > 0
      ? trendingPosts.reduce((sum, p) => sum + (p.trendingScore || 0), 0) / trendingPosts.length
      : 0;

    // Engagement stats
    const totalViews = trendingPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalLikes = trendingPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = trendingPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalSaves = trendingPosts.reduce((sum, p) => sum + (p.saves || 0), 0);
    const totalShares = trendingPosts.reduce((sum, p) => sum + (p.shares || 0), 0);

    // 24h stats
    const totalViews24h = trendingPosts.reduce((sum, p) => 
      sum + ((p.stats && p.stats.views_24h) || 0), 0);
    const totalLikes24h = trendingPosts.reduce((sum, p) => 
      sum + ((p.stats && p.stats.likes_24h) || 0), 0);
    const totalComments24h = trendingPosts.reduce((sum, p) => 
      sum + ((p.stats && p.stats.comments_24h) || 0), 0);
    const totalSaves24h = trendingPosts.reduce((sum, p) => 
      sum + ((p.stats && p.stats.saves_24h) || 0), 0);
    const totalShares24h = trendingPosts.reduce((sum, p) => 
      sum + ((p.stats && p.stats.shares_24h) || 0), 0);

    // Top trending posts (increased to show more users' posts)
    const topTrending = trendingPosts
      .slice(0, 100) // Increased from 10 to 100 to show posts from multiple users
      .map(post => ({
        _id: post._id,
        title: post.title || 'Untitled',
        author: {
          name: post.userId?.name || 'Unknown',
          username: post.userId?.username || 'unknown'
        },
        trendingScore: post.trendingScore || 0,
        trendingRank: post.trendingRank || null,
        views: post.views || 0,
        likes: post.likes || 0,
        comments: post.comments || 0,
        saves: post.saves || 0,
        shares: post.shares || 0,
        trendingSince: post.trendingSince
      }));

    // Trending conversion rate (posts that became trending / total posts)
    const totalPosts = await Post.countDocuments({
      createdAt: { $gte: cutoffDate },
      status: 'published',
      privacy: 'public'
    });
    const conversionRate = totalPosts > 0 
      ? (totalTrending / totalPosts) * 100 
      : 0;

    // Time to trend (average hours from creation to trending)
    const postsWithTrendingSince = trendingPosts.filter(p => p.trendingSince);
    const avgTimeToTrend = postsWithTrendingSince.length > 0
      ? postsWithTrendingSince.reduce((sum, p) => {
          const timeToTrend = (new Date(p.trendingSince) - new Date(p.createdAt)) / (1000 * 60 * 60);
          return sum + timeToTrend;
        }, 0) / postsWithTrendingSince.length
      : null;

    // Flagged posts count
    const flaggedTrending = trendingPosts.filter(p => (p.flaggedCount || 0) > 0).length;

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          startDate: cutoffDate,
          endDate: new Date()
        },
        summary: {
          totalTrending,
          totalPosts,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          avgTrendingScore: parseFloat(avgTrendingScore.toFixed(2)),
          avgTimeToTrend: avgTimeToTrend ? parseFloat(avgTimeToTrend.toFixed(1)) : null,
          flaggedTrending
        },
        engagement: {
          total: {
            views: totalViews,
            likes: totalLikes,
            comments: totalComments,
            saves: totalSaves,
            shares: totalShares
          },
          last24h: {
            views: totalViews24h,
            likes: totalLikes24h,
            comments: totalComments24h,
            saves: totalSaves24h,
            shares: totalShares24h
          }
        },
        topTrending,
        charts: {
          // Daily trending count (for chart)
          dailyTrending: await getDailyTrendingCount(cutoffDate),
          // Engagement over time (for chart)
          engagementOverTime: await getEngagementOverTime(cutoffDate)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching trending analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get daily trending count for chart
 */
async function getDailyTrendingCount(cutoffDate) {
  try {
    const posts = await Post.find({
      trendingStatus: true,
      trendingSince: { $gte: cutoffDate }
    })
      .select('trendingSince')
      .lean();

    const dailyCount = {};
    posts.forEach(post => {
      if (post.trendingSince) {
        const date = new Date(post.trendingSince).toISOString().split('T')[0];
        dailyCount[date] = (dailyCount[date] || 0) + 1;
      }
    });

    // Convert to array format for charts
    return Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting daily trending count:', error);
    return [];
  }
}

/**
 * Get engagement over time for chart
 */
async function getEngagementOverTime(cutoffDate) {
  try {
    const posts = await Post.find({
      trendingStatus: true,
      trendingSince: { $gte: cutoffDate }
    })
      .select('trendingSince stats views likes comments saves shares')
      .lean();

    const dailyEngagement = {};
    posts.forEach(post => {
      if (post.trendingSince) {
        const date = new Date(post.trendingSince).toISOString().split('T')[0];
        if (!dailyEngagement[date]) {
          dailyEngagement[date] = {
            views: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0
          };
        }
        dailyEngagement[date].views += post.views || 0;
        dailyEngagement[date].likes += post.likes || 0;
        dailyEngagement[date].comments += post.comments || 0;
        dailyEngagement[date].saves += post.saves || 0;
        dailyEngagement[date].shares += post.shares || 0;
      }
    });

    // Convert to array format for charts
    return Object.entries(dailyEngagement)
      .map(([date, engagement]) => ({ date, ...engagement }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting engagement over time:', error);
    return [];
  }
}

module.exports = router;

