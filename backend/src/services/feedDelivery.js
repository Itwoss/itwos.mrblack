const FeedItem = require('../models/FeedItem');
const Follow = require('../models/Follow');
const Post = require('../models/Post');

/**
 * Fan-Out Feed Delivery Service
 * Populates feed_items for followers when a post is published
 */

/**
 * Deliver post to follower feeds (fan-out)
 * @param {string} postId - Post ID to deliver
 * @param {string} postOwnerId - Post owner ID
 * @param {string} source - Source of feed item ('following', 'explore', 'trending', 'featured')
 */
async function deliverPostToFeeds(postId, postOwnerId, source = 'following') {
  try {
    console.log(`📤 Delivering post ${postId} to follower feeds (source: ${source})`);

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Only deliver published posts
    if (post.status !== 'published') {
      console.log(`⏭️ Skipping delivery - post status is ${post.status}`);
      return { success: false, message: `Post status is ${post.status}, not published` };
    }

    // Get all followers of the post owner
    const followers = await Follow.find({
      followeeId: postOwnerId,
      status: 'accepted'
    }).select('followerId');

    console.log(`👥 Found ${followers.length} followers for user ${postOwnerId}`);

    if (followers.length === 0) {
      return { success: true, delivered: 0, message: 'No followers to deliver to' };
    }

    // Prepare feed items for batch insert
    const feedItems = followers.map(follower => ({
      userId: follower.followerId,
      postId: postId,
      postOwnerId: postOwnerId,
      postCreatedAt: post.createdAt,
      postEngagementScore: post.engagementScore || 0,
      source: source
    }));

    // Batch insert feed items (handle duplicates gracefully)
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const feedItem of feedItems) {
      try {
        // Check if feed item already exists
        const existing = await FeedItem.findOne({
          userId: feedItem.userId,
          postId: feedItem.postId
        });

        if (!existing) {
          await FeedItem.create(feedItem);
          insertedCount++;
        } else {
          // Update existing feed item if needed
          existing.postEngagementScore = feedItem.postEngagementScore;
          existing.source = feedItem.source;
          await existing.save();
          duplicateCount++;
        }
      } catch (error) {
        // Handle unique constraint violations gracefully
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          console.error(`Error creating feed item for user ${feedItem.userId}:`, error);
        }
      }
    }

    console.log(`✅ Delivered post ${postId} to ${insertedCount} feeds (${duplicateCount} duplicates skipped)`);

    return {
      success: true,
      delivered: insertedCount,
      duplicates: duplicateCount,
      total: followers.length
    };
  } catch (error) {
    console.error(`❌ Error delivering post ${postId} to feeds:`, error);
    throw error;
  }
}

/**
 * Deliver post to specific users (for featured/explore)
 * @param {string} postId - Post ID
 * @param {Array<string>} userIds - Array of user IDs to deliver to
 * @param {string} source - Source of feed item
 */
async function deliverPostToUsers(postId, userIds, source = 'explore') {
  try {
    console.log(`📤 Delivering post ${postId} to ${userIds.length} specific users (source: ${source})`);

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    if (post.status !== 'published') {
      return { success: false, message: `Post status is ${post.status}, not published` };
    }

    let insertedCount = 0;
    let duplicateCount = 0;

    for (const userId of userIds) {
      try {
        const existing = await FeedItem.findOne({
          userId: userId,
          postId: postId
        });

        if (!existing) {
          await FeedItem.create({
            userId: userId,
            postId: postId,
            postOwnerId: post.userId,
            postCreatedAt: post.createdAt,
            postEngagementScore: post.engagementScore || 0,
            source: source
          });
          insertedCount++;
        } else {
          duplicateCount++;
        }
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          console.error(`Error delivering to user ${userId}:`, error);
        }
      }
    }

    console.log(`✅ Delivered post ${postId} to ${insertedCount} users (${duplicateCount} duplicates)`);

    return {
      success: true,
      delivered: insertedCount,
      duplicates: duplicateCount,
      total: userIds.length
    };
  } catch (error) {
    console.error(`❌ Error delivering post to users:`, error);
    throw error;
  }
}

/**
 * Remove post from all feeds (when post is deleted/hidden)
 * @param {string} postId - Post ID to remove
 */
async function removePostFromFeeds(postId) {
  try {
    console.log(`🗑️ Removing post ${postId} from all feeds`);

    const result = await FeedItem.deleteMany({ postId: postId });

    console.log(`✅ Removed post ${postId} from ${result.deletedCount} feeds`);

    return {
      success: true,
      removed: result.deletedCount
    };
  } catch (error) {
    console.error(`❌ Error removing post from feeds:`, error);
    throw error;
  }
}

/**
 * Update feed item engagement score (when post engagement changes)
 * @param {string} postId - Post ID
 */
async function updateFeedItemEngagement(postId) {
  try {
    const post = await Post.findById(postId);
    if (!post) return;

    await FeedItem.updateMany(
      { postId: postId },
      { 
        $set: { 
          postEngagementScore: post.engagementScore || 0 
        } 
      }
    );

    console.log(`✅ Updated engagement scores for post ${postId} in feed items`);
  } catch (error) {
    console.error(`❌ Error updating feed item engagement:`, error);
  }
}

/**
 * Get user feed using feed_items (fan-out approach)
 * @param {string} userId - User ID
 * @param {Object} options - Query options (page, limit, source)
 */
async function getUserFeed(userId, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      source = null // Filter by source if provided
    } = options;

    const skip = (page - 1) * limit;

    const query = { userId: userId };
    if (source) {
      query.source = source;
    }

    const feedItems = await FeedItem.find(query)
      .populate('postId')
      .populate('postOwnerId', 'name username avatarUrl isVerified')
      .sort({ postCreatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeedItem.countDocuments(query);

    // Filter out posts that are not published or are hidden
    const validFeedItems = feedItems.filter(item => {
      const post = item.postId;
      return post && post.status === 'published' && post.isActive !== false;
    });

    return {
      success: true,
      feedItems: validFeedItems.map(item => ({
        _id: item._id,
        post: item.postId ? item.postId.getPublicData(userId) : null,
        postOwner: item.postOwnerId,
        source: item.source,
        createdAt: item.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  } catch (error) {
    console.error(`❌ Error getting user feed:`, error);
    throw error;
  }
}

/**
 * Clean up old feed items (maintenance job)
 * @param {number} daysOld - Remove items older than this many days
 */
async function cleanupOldFeedItems(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await FeedItem.deleteMany({
      postCreatedAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} feed items older than ${daysOld} days`);

    return {
      success: true,
      removed: result.deletedCount
    };
  } catch (error) {
    console.error(`❌ Error cleaning up feed items:`, error);
    throw error;
  }
}

module.exports = {
  deliverPostToFeeds,
  deliverPostToUsers,
  removePostFromFeeds,
  updateFeedItemEngagement,
  getUserFeed,
  cleanupOldFeedItems
};

