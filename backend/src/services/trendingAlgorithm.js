const Post = require('../models/Post');
const FeedItem = require('../models/FeedItem');
const { applyAuthenticityPenalty } = require('./antiAbuse');
const {
  setTrendingInCache,
  addToTrendingSet,
  clearTrendingCache
} = require('./trendingCache');

/**
 * Trending Algorithm Service
 * Implements weighted trending score calculation with time decay
 * Based on: Views (35%), Likes (25%), Comments (15%), Saves (10%), Shares (10%), Engagement Rate (5%)
 */

// Weight constants (from specification)
const WEIGHTS = {
  VIEWS: 1.2,      // A = 1.2 (35% weight)
  LIKES: 1.0,      // B = 1.0 (25% weight)
  COMMENTS: 1.5,   // C = 1.5 (15% weight)
  SAVES: 1.8,      // D = 1.8 (10% weight)
  SHARES: 1.6,     // E = 1.6 (10% weight)
  FOLLOWER_NORM: 0.4 // F = 0.4 (normalization)
};

// Time decay constant (hours)
const DECAY_CONSTANT = 12; // Score halves every 12 hours

/**
 * Calculate trending score for a post using weighted formula
 * @param {Object} post - Post object with stats and followerCountAtPost
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {number} - Trending score
 */
function calculateTrendingScore(post, currentTime = new Date()) {
  try {
    // Get 24h stats (default to 0 if not available)
    const stats = post.stats || {};
    const views_24h = stats.views_24h || 0;
    const likes_24h = stats.likes_24h || 0;
    const comments_24h = stats.comments_24h || 0;
    const saves_24h = stats.saves_24h || 0;
    const shares_24h = stats.shares_24h || 0;
    
    // Get follower count at time of post (for normalization)
    const followerCount = post.followerCountAtPost || post.userId?.followersCount || 1;
    
    // Calculate base score using weighted log formula
    // score = (A * log(1 + views_24h)) + (B * log(1 + likes_24h)) + ...
    const scoreBase = 
      (WEIGHTS.VIEWS * Math.log(1 + views_24h)) +
      (WEIGHTS.LIKES * Math.log(1 + likes_24h)) +
      (WEIGHTS.COMMENTS * Math.log(1 + comments_24h)) +
      (WEIGHTS.SAVES * Math.log(1 + saves_24h)) +
      (WEIGHTS.SHARES * Math.log(1 + shares_24h)) -
      (WEIGHTS.FOLLOWER_NORM * Math.log(1 + followerCount)); // Normalization
    
    // Calculate age in hours
    const ageHours = (currentTime - new Date(post.createdAt)) / (1000 * 60 * 60);
    
    // Apply time decay: final_score = score * exp(-age_hours / decay_constant)
    const timeDecay = Math.exp(-ageHours / DECAY_CONSTANT);
    const finalScore = scoreBase * timeDecay;
    
    // Bonus for featured posts
    const featuredBonus = post.featured ? 1.5 : 1.0;
    
    // Final trending score
    const trendingScore = Math.max(0, finalScore * featuredBonus);
    
    return trendingScore;
  } catch (error) {
    console.error('Error calculating trending score:', error);
    return 0;
  }
}

/**
 * Update 24h stats for a post (should be called when engagement happens)
 * @param {string} postId - Post ID
 * @param {string} action - Action type: 'view', 'like', 'comment', 'save', 'share'
 */
async function update24hStats(postId, action) {
  try {
    const post = await Post.findById(postId);
    if (!post) return;
    
    // Initialize stats if not exists
    if (!post.stats) {
      post.stats = {
        views_24h: 0,
        likes_24h: 0,
        comments_24h: 0,
        saves_24h: 0,
        shares_24h: 0,
        lastUpdated: new Date()
      };
    }
    
    // Check if stats need to be reset (older than 24h)
    const now = new Date();
    const lastUpdated = new Date(post.stats.lastUpdated || post.createdAt);
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate >= 24) {
      // Reset 24h stats
      post.stats.views_24h = 0;
      post.stats.likes_24h = 0;
      post.stats.comments_24h = 0;
      post.stats.saves_24h = 0;
      post.stats.shares_24h = 0;
      post.stats.lastUpdated = now;
    }
    
    // Increment appropriate counter
    const statKey = `${action}_24h`;
    if (post.stats[statKey] !== undefined) {
      post.stats[statKey] = (post.stats[statKey] || 0) + 1;
      post.stats.lastUpdated = now;
      await post.save();
    }
  } catch (error) {
    console.error(`Error updating 24h stats for post ${postId}:`, error);
  }
}

/**
 * Reset 24h stats for posts older than 24 hours
 * Should be called periodically (e.g., every hour)
 */
async function resetOld24hStats() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    const result = await Post.updateMany(
      {
        'stats.lastUpdated': { $lt: cutoffDate }
      },
      {
        $set: {
          'stats.views_24h': 0,
          'stats.likes_24h': 0,
          'stats.comments_24h': 0,
          'stats.saves_24h': 0,
          'stats.shares_24h': 0,
          'stats.lastUpdated': new Date()
        }
      }
    );
    
    console.log(`🔄 Reset 24h stats for ${result.modifiedCount} posts`);
    return result;
  } catch (error) {
    console.error('Error resetting 24h stats:', error);
    throw error;
  }
}

/**
 * Update trending scores for recent posts
 * @param {number} hoursWindow - Only update posts from last N hours (default: 48)
 * @param {number} limit - Maximum number of posts to process (default: 1000)
 */
async function updateTrendingScores(hoursWindow = 48, limit = 1000) {
  try {
    console.log(`🔄 Updating trending scores for posts from last ${hoursWindow} hours...`);

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

    // Get trending settings
    const TrendingSettings = require('../models/TrendingSettings');
    const settings = await TrendingSettings.getSettings();
    const minTrendingScore = settings.minTrendingScore || 5.0;
    
    // Get recent posts with populated user data
    // Only include posts that are eligible for trending (trendingEligibleAt <= now)
    const now = new Date();
    const posts = await Post.find({
      status: 'published',
      privacy: 'public', // Only public posts can trend
      createdAt: { $gte: cutoffDate },
      trendingEligibleAt: { $lte: now }, // Only posts that have passed the delay period
      flaggedCount: { $lt: 3 } // Exclude heavily flagged posts
    })
      .populate('userId', 'followersCount')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    console.log(`📊 Processing ${posts.length} posts for trending scores...`);

    let updated = 0;
    const currentTime = new Date();
    const scores = [];

    for (const post of posts) {
      try {
        // Ensure followerCountAtPost is set (for new posts)
        if (!post.followerCountAtPost && post.userId?.followersCount) {
          await Post.updateOne(
            { _id: post._id },
            { $set: { followerCountAtPost: post.userId.followersCount } }
          );
        }
        
        const trendingScore = calculateTrendingScore(post, currentTime);
        scores.push({ postId: post._id, score: trendingScore });
        
        // Update post with trending score
        await Post.updateOne(
          { _id: post._id },
          { $set: { trendingScore: trendingScore } }
        );

        updated++;
      } catch (error) {
        console.error(`Error updating trending score for post ${post._id}:`, error);
      }
    }

    // Filter posts by minimum trending score threshold
    const eligibleScores = scores.filter(s => s.score >= minTrendingScore);
    
    // Determine trending status (top X% or top N posts, whichever is larger to allow more posts)
    // Use MAX instead of MIN to allow more posts to trend
    const threshold = Math.max(
      Math.ceil(eligibleScores.length * (settings.trendingTopPercent / 100) || 0.05),
      Math.min(settings.trendingTopCount || 500, eligibleScores.length) // Cap at available posts
    );
    
    eligibleScores.sort((a, b) => b.score - a.score);
    
    // Update trending status for top posts that meet threshold
    const trendingPostIds = eligibleScores.slice(0, threshold).map(s => s.postId);
    const actualMinScore = eligibleScores[threshold - 1]?.score || minTrendingScore;
    
    console.log(`📊 Trending eligibility: ${eligibleScores.length} posts meet threshold (${minTrendingScore}), selecting top ${threshold} posts`);
    
    // Set trending status and ranks for all trending posts
    for (let i = 0; i < trendingPostIds.length; i++) {
      const postId = trendingPostIds[i];
      const postScore = scores.find(s => s.postId.toString() === postId.toString())?.score || 0;
      
      await Post.updateOne(
        { _id: postId },
        { 
          $set: { 
            trendingStatus: true,
            trendingSince: new Date(),
            trendingRank: i + 1
          }
        }
      );
      
      // Add to Redis sorted set for fast retrieval
      await addToTrendingSet('trending:global', postId.toString(), postScore);
      
      // Apply authenticity penalty to trending posts (async, don't wait)
      applyAuthenticityPenalty(postId).catch(err =>
        console.error(`Error applying authenticity penalty to post ${postId}:`, err)
      );
    }
    
    // Remove trending status from posts that fell out
    await Post.updateMany(
      { 
        _id: { $nin: trendingPostIds },
        trendingStatus: true
      },
      { 
        $set: { 
          trendingStatus: false,
          trendingSince: null,
          trendingRank: null
        } 
      }
    );
    
    // Cache trending posts list (increased limit to show more posts)
    const trendingPosts = await Post.find({ _id: { $in: trendingPostIds } })
      .populate('userId', 'name username avatarUrl isVerified followersCount')
      .sort({ trendingRank: 1 })
      .limit(500) // Increased from 100 to 500 to show more trending posts
      .lean();
    
    const trendingPostsData = trendingPosts.map(post => {
      const postInstance = new Post(post);
      return postInstance.getPublicData();
    });
    
    await setTrendingInCache('trending:global', trendingPostsData);

    console.log(`✅ Updated trending scores for ${updated} posts. ${trendingPostIds.length} posts are trending.`);

    return {
      success: true,
      updated,
      total: posts.length,
      trendingCount: trendingPostIds.length,
      minTrendingScore
    };
  } catch (error) {
    console.error('Error updating trending scores:', error);
    throw error;
  }
}

/**
 * Get trending posts
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of trending posts
 */
async function getTrendingPosts(options = {}) {
  try {
    const {
      limit = 50,
      region = null,
      hashtag = null,
      category = null
    } = options;

    const query = {
      status: 'published',
      privacy: 'public',
      trendingStatus: true
    };
    
    if (hashtag) {
      query.tags = { $in: [hashtag] };
    }
    
    // TODO: Add region and category filtering when those fields are available

    const posts = await Post.find(query)
      .populate('userId', 'name username avatarUrl isVerified followersCount')
      .sort({ trendingRank: 1, trendingScore: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return posts.map(post => {
      const postInstance = new Post(post);
      return postInstance.getPublicData();
    });
  } catch (error) {
    console.error('Error getting trending posts:', error);
    throw error;
  }
}

/**
 * Get trending posts by hashtag
 * @param {string} hashtag - Hashtag to filter by
 * @param {number} limit - Maximum number of posts
 * @returns {Promise<Array>} - Array of trending posts
 */
async function getTrendingByHashtag(hashtag, limit = 20) {
  return getTrendingPosts({ hashtag, limit });
}

/**
 * Get trending candidates (posts that might become trending)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of candidate posts
 */
async function getTrendingCandidates(options = {}) {
  try {
    const {
      limit = 100,
      minTrendingScore = 10,
      hoursWindow = 24
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

    // Get posts with high engagement but not yet trending
    const posts = await Post.find({
      status: 'published',
      privacy: 'public',
      trendingStatus: false,
      trendingScore: { $gte: minTrendingScore },
      createdAt: { $gte: cutoffDate }
    })
      .populate('userId', 'name username avatarUrl isVerified followersCount')
      .sort({ trendingScore: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Calculate trending scores for candidates
    const candidates = posts.map(post => {
      const trendingScore = calculateTrendingScore(post);
      return {
        post: new Post(post).getPublicData(),
        trendingScore,
        potential: trendingScore > 50 // Threshold for "trending potential"
      };
    });

    return candidates.sort((a, b) => b.trendingScore - a.trendingScore);
  } catch (error) {
    console.error('Error getting trending candidates:', error);
    throw error;
  }
}

/**
 * Background job to update trending scores periodically
 * Should be called via cron job every 1-5 minutes
 */
async function runTrendingUpdateJob() {
  try {
    console.log('🔄 Starting trending score update job...');
    
    // First, reset old 24h stats
    await resetOld24hStats();
    
    // Then update trending scores
    const result = await updateTrendingScores(48, 1000);
    console.log(`✅ Trending update job completed: ${result.updated}/${result.total} posts updated, ${result.trendingCount} trending`);
    return result;
  } catch (error) {
    console.error('❌ Trending update job failed:', error);
    throw error;
  }
}

module.exports = {
  calculateTrendingScore,
  updateTrendingScores,
  update24hStats,
  resetOld24hStats,
  getTrendingPosts,
  getTrendingByHashtag,
  getTrendingCandidates,
  runTrendingUpdateJob,
  WEIGHTS,
  DECAY_CONSTANT
};
