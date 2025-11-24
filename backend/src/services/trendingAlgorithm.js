const Post = require('../models/Post');
const FeedItem = require('../models/FeedItem');

/**
 * Trending Algorithm Service
 * Computes trending scores with time decay for posts
 */

/**
 * Calculate trending score for a post
 * @param {Object} post - Post object
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {number} - Trending score
 */
function calculateTrendingScore(post, currentTime = new Date()) {
  try {
    const hoursSincePost = (currentTime - new Date(post.createdAt)) / (1000 * 60 * 60);
    
    // Base engagement score
    const baseScore = post.engagementScore || 0;
    
    // Time decay factor (exponential decay)
    // Lambda = 0.1 means score halves every ~7 hours
    // Adjust lambda to control decay rate (higher = faster decay)
    const lambda = 0.1;
    const timeDecay = Math.exp(-lambda * hoursSincePost);
    
    // Normalize by follower count (boost small creators with high engagement)
    // Use log to prevent division by zero and smooth the curve
    const followerCount = post.userId?.followersCount || 1;
    const normalizationFactor = Math.log(1 + followerCount);
    
    // Calculate adjusted score
    const adjustedScore = (baseScore * timeDecay) / normalizationFactor;
    
    // Bonus for featured posts
    const featuredBonus = post.featured ? 1.5 : 1.0;
    
    // Final trending score
    const trendingScore = adjustedScore * featuredBonus;
    
    return Math.max(0, trendingScore); // Ensure non-negative
  } catch (error) {
    console.error('Error calculating trending score:', error);
    return 0;
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

    // Get recent posts
    const posts = await Post.find({
      status: 'published',
      privacy: 'public', // Only public posts can trend
      createdAt: { $gte: cutoffDate }
    })
      .populate('userId', 'followersCount')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    console.log(`📊 Processing ${posts.length} posts for trending scores...`);

    let updated = 0;
    const currentTime = new Date();

    for (const post of posts) {
      try {
        const trendingScore = calculateTrendingScore(post, currentTime);
        
        // Update post with trending score
        await Post.updateOne(
          { _id: post._id },
          { $set: { trendingScore: trendingScore } }
        );

        // Update feed items with new trending score
        await FeedItem.updateMany(
          { postId: post._id },
          { $set: { postEngagementScore: post.engagementScore || 0 } }
        );

        updated++;
      } catch (error) {
        console.error(`Error updating trending score for post ${post._id}:`, error);
      }
    }

    console.log(`✅ Updated trending scores for ${updated} posts`);

    return {
      success: true,
      updated,
      total: posts.length
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
      minTrendingScore = 0,
      hoursWindow = 48
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

    const posts = await Post.find({
      status: 'published',
      privacy: 'public',
      trendingScore: { $gte: minTrendingScore },
      createdAt: { $gte: cutoffDate }
    })
      .populate('userId', 'name username avatarUrl isVerified followersCount')
      .sort({ trendingScore: -1, createdAt: -1 })
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
 * Get trending candidates (posts that might become trending)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of candidate posts
 */
async function getTrendingCandidates(options = {}) {
  try {
    const {
      limit = 100,
      minEngagementScore = 10,
      hoursWindow = 24
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

    // Get posts with high engagement but not yet trending
    const posts = await Post.find({
      status: 'published',
      privacy: 'public',
      engagementScore: { $gte: minEngagementScore },
      createdAt: { $gte: cutoffDate }
    })
      .populate('userId', 'name username avatarUrl isVerified followersCount')
      .sort({ engagementScore: -1, createdAt: -1 })
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
 * Should be called via cron job every 5-15 minutes
 */
async function runTrendingUpdateJob() {
  try {
    console.log('🔄 Starting trending score update job...');
    const result = await updateTrendingScores(48, 1000);
    console.log(`✅ Trending update job completed: ${result.updated}/${result.total} posts updated`);
    return result;
  } catch (error) {
    console.error('❌ Trending update job failed:', error);
    throw error;
  }
}

module.exports = {
  calculateTrendingScore,
  updateTrendingScores,
  getTrendingPosts,
  getTrendingCandidates,
  runTrendingUpdateJob
};

