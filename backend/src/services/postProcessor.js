const Post = require('../models/Post');
const Follow = require('../models/Follow');
const { processImage, processImageFromUrl, checkDuplicate, moderateImage } = require('./imageProcessor');
const path = require('path');
const fs = require('fs');

/**
 * Post Processing Service
 * Handles the complete post processing workflow:
 * 1. Process images (generate variants)
 * 2. Check for duplicates
 * 3. Run moderation
 * 4. Update post status
 */

/**
 * Process a post (called after post creation)
 * @param {string} postId - Post ID to process
 */
async function processPost(postId) {
  try {
    console.log(`🔄 Starting post processing for post ${postId}`);

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Check if already processed
    if (post.status === 'published' && post.processedAt) {
      console.log(`✅ Post ${postId} already processed`);
      return { success: true, message: 'Post already processed' };
    }

    // Update status to processing
    post.status = 'processing';
    await post.save();

    let imagePath = null;
    let processingResult = null;

    // Determine image source
    if (post.mediaKeys && post.mediaKeys.length > 0) {
      // New flow: Use mediaKeys (S3 or local storage)
      const mediaKey = post.mediaKeys[0];
      
      // Check if it's a local path or URL
      if (mediaKey.startsWith('http://') || mediaKey.startsWith('https://')) {
        // Remote URL - download and process
        processingResult = await processImageFromUrl(mediaKey, postId);
      } else if (mediaKey.startsWith('/uploads/')) {
        // Local path - process directly
        imagePath = path.join(__dirname, '../..', mediaKey);
        if (fs.existsSync(imagePath)) {
          processingResult = await processImage(imagePath, postId);
        } else {
          throw new Error(`Image file not found: ${imagePath}`);
        }
      } else {
        // Assume it's a file path relative to uploads
        imagePath = path.join(__dirname, '../../uploads', mediaKey);
        if (fs.existsSync(imagePath)) {
          processingResult = await processImage(imagePath, postId);
        } else {
          throw new Error(`Image file not found: ${imagePath}`);
        }
      }
    } else if (post.imageUrl) {
      // Legacy flow: Use imageUrl
      imagePath = path.join(__dirname, '../..', post.imageUrl);
      if (fs.existsSync(imagePath)) {
        processingResult = await processImage(imagePath, postId);
      } else {
        // If local file doesn't exist, try as URL
        if (post.imageUrl.startsWith('http://') || post.imageUrl.startsWith('https://')) {
          processingResult = await processImageFromUrl(post.imageUrl, postId);
        } else {
          throw new Error(`Image file not found: ${imagePath}`);
        }
      }
    } else {
      throw new Error('No image source found for post');
    }

    if (!processingResult || !processingResult.success) {
      throw new Error('Image processing failed');
    }

    // Check for duplicates using pHash
    console.log(`🔍 Checking for duplicates using pHash: ${processingResult.pHash}`);
    const duplicateCheck = await checkDuplicate(processingResult.pHash, postId);
    
    if (duplicateCheck.isDuplicate) {
      console.log(`⚠️ Duplicate post detected: ${duplicateCheck.duplicatePostId}`);
      // Don't block, but flag for review
      post.flaggedCount = (post.flaggedCount || 0) + 1;
      if (!post.flaggedReasons) {
        post.flaggedReasons = [];
      }
      if (!post.flaggedReasons.includes('duplicate')) {
        post.flaggedReasons.push('duplicate');
      }
    }

    // Run moderation (placeholder for now)
    if (imagePath && fs.existsSync(imagePath)) {
      const moderationResult = await moderateImage(imagePath);
      
      if (moderationResult.requiresReview || !moderationResult.safe) {
        console.log(`⚠️ Post ${postId} flagged for moderation review`);
        post.status = 'moderation_pending';
        post.flaggedCount = (post.flaggedCount || 0) + 1;
        if (!post.flaggedReasons) {
          post.flaggedReasons = [];
        }
        moderationResult.flags.forEach(flag => {
          if (!post.flaggedReasons.includes(flag)) {
            post.flaggedReasons.push(flag);
          }
        });
      }
    }

    // Update post with processing results
    post.cdnUrls = processingResult.cdnUrls;
    post.phashValueUploaded = processingResult.pHash;
    
    // If not flagged, mark as published
    if (post.status === 'processing') {
      post.status = 'published';
    }
    
    post.processedAt = new Date();

    await post.save();

    // Deliver post to follower feeds (fan-out)
    if (post.status === 'published') {
      const { deliverPostToFeeds } = require('./feedDelivery');
      deliverPostToFeeds(postId, post.userId.toString(), 'following')
        .then(async (result) => {
          console.log(`📤 Feed delivery result for post ${postId}:`, result);
          
          // Emit realtime notification to followers
          const notification = await emitNewPostNotification(post, result);
          if (notification) {
            // Get io instance from global (set in server.js)
            const io = global.io;
            
            if (io) {
              // Emit to specific user rooms
              notification.targetUserIds.forEach(userId => {
                io.to(`user:${userId}`).emit(notification.event, notification.data);
              });
              console.log(`📢 Emitted new_post notifications to ${notification.targetUserIds.length} followers`);
            } else {
              console.warn('Socket.IO not available for new post notification');
            }
          }
        })
        .catch(error => {
          console.error(`❌ Feed delivery failed for post ${postId}:`, error);
          // Don't fail the processing if feed delivery fails
        });
    }

    console.log(`✅ Post ${postId} processed successfully. Status: ${post.status}`);

    return {
      success: true,
      postId: postId,
      status: post.status,
      variants: processingResult.variants,
      cdnUrls: processingResult.cdnUrls,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicatePostId: duplicateCheck.duplicatePostId
    };
  } catch (error) {
    console.error(`❌ Error processing post ${postId}:`, error);
    
    // Update post status to indicate failure
    try {
      const post = await Post.findById(postId);
      if (post) {
        post.status = 'processing'; // Keep as processing, admin can review
        await post.save();
      }
    } catch (saveError) {
      console.error('Error updating post status:', saveError);
    }

    throw error;
  }
}

/**
 * Process posts in batch (for background jobs)
 * @param {Array<string>} postIds - Array of post IDs to process
 */
async function processPostsBatch(postIds) {
  const results = [];
  
  for (const postId of postIds) {
    try {
      const result = await processPost(postId);
      results.push({ postId, success: true, result });
    } catch (error) {
      results.push({ postId, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Emit new post notification to followers via Socket.IO
 * @param {Object} post - Post object
 * @param {Object} deliveryResult - Result from deliverPostToFeeds
 */
function emitNewPostNotification(post, deliveryResult) {
  try {
    // Get io instance from app
    const app = require('../../server');
    const io = app.get('io');
    
    if (!io) {
      console.warn('Socket.IO not available for new post notification');
      return;
    }

    // Get post owner info for notification
    const postPreview = {
      _id: post._id,
      userId: post.userId,
      title: post.title,
      bio: post.bio,
      imageUrl: post.cdnUrls?.feed || post.cdnUrls?.thumb || post.imageUrl,
      createdAt: post.createdAt,
      privacy: post.privacy
    };

    // Emit to all followers (they're in user:userId rooms)
    // We'll emit to all connected clients and let them filter
    io.emit('new_post', {
      post: postPreview,
      ownerId: post.userId.toString(),
      timestamp: new Date()
    });

    console.log(`📢 Emitted new_post notification for post ${post._id}`);
  } catch (error) {
    console.error('Error emitting new post notification:', error);
    // Don't throw - notification failure shouldn't break processing
  }
}

module.exports = {
  processPost,
  processPostsBatch,
  emitNewPostNotification
};

