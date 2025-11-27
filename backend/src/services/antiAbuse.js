const Post = require('../models/Post');
const User = require('../models/User');

/**
 * Anti-Abuse Detection Service
 * Detects and penalizes bot-like behavior, spam, and manipulation attempts
 */

// Thresholds for abuse detection
const THRESHOLDS = {
  VIEW_SPIKE: 100, // Views per hour threshold
  LIKE_SPIKE: 50, // Likes per hour threshold
  SAME_IP_VIEWS: 20, // Views from same IP in short time
  NEW_ACCOUNT_LIKES: 10, // Likes from newly created accounts
  SUSPICIOUS_PATTERN: 0.8, // Ratio threshold for suspicious patterns
  MIN_ACCOUNT_AGE_HOURS: 24 // Minimum account age to be trusted
};

/**
 * Track engagement event for abuse detection
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @param {string} action - Action type: 'view', 'like', 'save', 'share'
 * @param {string} ipAddress - User's IP address
 * @param {Object} userAgent - User agent string
 */
async function trackEngagementEvent(postId, userId, action, ipAddress, userAgent) {
  try {
    // Store in a temporary collection or Redis for real-time analysis
    // For now, we'll use a simple in-memory cache (in production, use Redis)
    const eventKey = `engagement:${postId}:${action}:${Date.now()}`;
    
    // Check for suspicious patterns
    await detectSuspiciousPattern(postId, userId, action, ipAddress);
    
    return { success: true };
  } catch (error) {
    console.error('Error tracking engagement event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Detect suspicious engagement patterns
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @param {string} ipAddress - IP address
 */
async function detectSuspiciousPattern(postId, userId, action, ipAddress) {
  try {
    const post = await Post.findById(postId);
    if (!post) return;

    const user = await User.findById(userId);
    if (!user) return;

    // Check 1: Account age
    const accountAge = (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60);
    const isNewAccount = accountAge < THRESHOLDS.MIN_ACCOUNT_AGE_HOURS;

    // Check 2: Rapid engagement spikes
    const stats = post.stats || {};
    const recentEngagement = getRecentEngagement(post, action);
    
    if (recentEngagement > THRESHOLDS.VIEW_SPIKE && action === 'view') {
      console.warn(`⚠️ Suspicious view spike detected for post ${postId}: ${recentEngagement} views in last hour`);
      await flagSuspiciousActivity(postId, 'view_spike', { count: recentEngagement });
    }

    if (recentEngagement > THRESHOLDS.LIKE_SPIKE && action === 'like') {
      console.warn(`⚠️ Suspicious like spike detected for post ${postId}: ${recentEngagement} likes in last hour`);
      await flagSuspiciousActivity(postId, 'like_spike', { count: recentEngagement });
    }

    // Check 3: New account engagement
    if (isNewAccount && action === 'like') {
      const newAccountLikes = await countNewAccountLikes(postId);
      if (newAccountLikes > THRESHOLDS.NEW_ACCOUNT_LIKES) {
        console.warn(`⚠️ Suspicious new account likes for post ${postId}: ${newAccountLikes} likes from new accounts`);
        await flagSuspiciousActivity(postId, 'new_account_likes', { count: newAccountLikes });
      }
    }

    // Check 4: Same IP multiple views (basic check - in production, use Redis for IP tracking)
    // This is a simplified check - in production, track IPs in Redis with TTL

    return { suspicious: false };
  } catch (error) {
    console.error('Error detecting suspicious pattern:', error);
    return { suspicious: false, error: error.message };
  }
}

/**
 * Get recent engagement count for a specific action
 * @param {Object} post - Post object
 * @param {string} action - Action type
 * @returns {number} - Engagement count in last hour
 */
function getRecentEngagement(post, action) {
  const stats = post.stats || {};
  const statKey = `${action}_24h`;
  return stats[statKey] || 0;
}

/**
 * Count likes from new accounts
 * @param {string} postId - Post ID
 * @returns {Promise<number>} - Count of likes from new accounts
 */
async function countNewAccountLikes(postId) {
  try {
    const post = await Post.findById(postId).populate('likedBy');
    if (!post || !Array.isArray(post.likedBy)) return 0;

    const now = Date.now();
    const minAccountAge = THRESHOLDS.MIN_ACCOUNT_AGE_HOURS * 60 * 60 * 1000;

    const newAccountLikes = post.likedBy.filter(userId => {
      if (!userId || !userId.createdAt) return false;
      const accountAge = now - new Date(userId.createdAt);
      return accountAge < minAccountAge;
    });

    return newAccountLikes.length;
  } catch (error) {
    console.error('Error counting new account likes:', error);
    return 0;
  }
}

/**
 * Flag suspicious activity on a post
 * @param {string} postId - Post ID
 * @param {string} reason - Reason for flagging
 * @param {Object} metadata - Additional metadata
 */
async function flagSuspiciousActivity(postId, reason, metadata = {}) {
  try {
    const post = await Post.findById(postId);
    if (!post) return;

    // Increment flagged count
    post.flaggedCount = (post.flaggedCount || 0) + 1;
    
    // Add flag reason (as string for now, can be enhanced to store objects)
    if (!post.flaggedReasons) {
      post.flaggedReasons = [];
    }
    // Store as string for compatibility with current schema
    post.flaggedReasons.push(`${reason}:${JSON.stringify(metadata)}`);

    // If flagged multiple times, reduce trending score
    if (post.flaggedCount >= 3) {
      post.trendingScore = post.trendingScore * 0.5; // Reduce by 50%
      post.trendingStatus = false; // Remove from trending
      console.warn(`🚫 Post ${postId} removed from trending due to multiple flags`);
    }

    await post.save();
    
    // TODO: Notify admins about suspicious activity
    // await notifyAdmins(postId, reason, metadata);
    
    return { success: true };
  } catch (error) {
    console.error('Error flagging suspicious activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate authenticity score for a post
 * @param {Object} post - Post object
 * @returns {number} - Authenticity score (0-1, higher is more authentic)
 */
async function calculateAuthenticityScore(post) {
  try {
    let score = 1.0;

    // Penalty for flagged content
    if (post.flaggedCount > 0) {
      score -= (post.flaggedCount * 0.1); // -10% per flag
    }

    // Penalty for rapid engagement spikes
    const stats = post.stats || {};
    const total24h = (stats.views_24h || 0) + (stats.likes_24h || 0);
    const engagementRate = total24h / Math.max(1, post.followerCountAtPost || 1);
    
    if (engagementRate > 10) {
      // More than 10x follower count engagement is suspicious
      score -= 0.2;
    }

    // Bonus for verified users
    const user = await User.findById(post.userId).select('isVerified');
    if (user?.isVerified) {
      score += 0.1; // +10% for verified users
    }

    // Bonus for account age
    if (user?.createdAt) {
      const accountAge = (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24); // days
      if (accountAge > 30) {
        score += 0.05; // +5% for accounts older than 30 days
      }
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  } catch (error) {
    console.error('Error calculating authenticity score:', error);
    return 0.5; // Default to neutral score on error
  }
}

/**
 * Apply authenticity penalty to trending score
 * @param {string} postId - Post ID
 */
async function applyAuthenticityPenalty(postId) {
  try {
    const post = await Post.findById(postId);
    if (!post) return;

    const authenticityScore = await calculateAuthenticityScore(post);
    
    // Apply penalty to trending score
    if (authenticityScore < 0.7) {
      const penalty = 1 - authenticityScore; // 0.3 penalty for 0.7 score
      post.trendingScore = post.trendingScore * (1 - penalty * 0.5); // Reduce by up to 50%
      
      // Remove from trending if score is too low
      if (authenticityScore < 0.5) {
        post.trendingStatus = false;
        post.trendingRank = null;
      }
      
      await post.save();
    }
    
    return { success: true, authenticityScore };
  } catch (error) {
    console.error('Error applying authenticity penalty:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  trackEngagementEvent,
  detectSuspiciousPattern,
  calculateAuthenticityScore,
  applyAuthenticityPenalty,
  flagSuspiciousActivity,
  THRESHOLDS
};

