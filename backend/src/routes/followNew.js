const express = require('express');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Debug route to test routing
router.use((req, res, next) => {
  if (req.path.includes('/request/')) {
    console.log('🔍 Route debug - /request/ path detected:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl
    });
  }
  next();
});

// POST /api/follow - Follow a user
router.post('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    const currentUserId = req.user._id.toString();
    
    // Use current user as follower if not specified
    const actualFollowerId = followerId || currentUserId;
    
    // Validate IDs
    if (actualFollowerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only follow on behalf of yourself'
      });
    }
    
    if (!followeeId) {
      return res.status(400).json({
        success: false,
        message: 'followeeId is required'
      });
    }
    
    // Can't follow yourself
    if (actualFollowerId === followeeId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }
    
    // Check if followee exists
    const followee = await User.findById(followeeId);
    if (!followee) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if already following
    const existingFollow = await Follow.findOne({
      followerId: actualFollowerId,
      followeeId: followeeId
    });
    
    if (existingFollow) {
      if (existingFollow.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already following this user'
        });
      } else if (existingFollow.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Follow request is pending'
        });
      }
    }
    
    // Determine status based on account privacy
    const status = followee.isPrivate ? 'pending' : 'accepted';
    
    // Create follow relationship
    const follow = new Follow({
      followerId: actualFollowerId,
      followeeId: followeeId,
      status: status
    });
    
    await follow.save();
    
    // Update counters atomically
    if (status === 'accepted') {
      await User.findByIdAndUpdate(actualFollowerId, {
        $inc: { followingCount: 1 }
      });
      
      await User.findByIdAndUpdate(followeeId, {
        $inc: { followersCount: 1 }
      });
      
      // Create notification for followee (using User's notification system)
      try {
        const follower = await User.findById(actualFollowerId).select('name email avatarUrl');
        
        await User.findByIdAndUpdate(followeeId, {
          $push: {
            notifications: {
              type: 'follow',
              from: actualFollowerId,
              message: `${req.user.name} started following you`,
              createdAt: new Date(),
              metadata: {
                followId: follow._id.toString()
              }
            }
          }
        });
        
        console.log(`✅ Follow notification created for user: ${followeeId.toString()}`);
        
        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${followeeId.toString()}`).emit('new_notification', {
            type: 'follow',
            from: {
              _id: follower._id,
              name: follower.name,
              email: follower.email,
              avatarUrl: follower.avatarUrl
            },
            message: `${req.user.name} started following you`,
            metadata: {
              followId: follow._id.toString()
            },
            createdAt: new Date()
          });
          
          console.log(`📬 Follow notification sent via Socket.IO to user: ${followeeId}`);
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the request if notification fails
      }
    } else {
      // For private accounts, create follow request notification
      try {
        const follower = await User.findById(actualFollowerId).select('name email avatarUrl');
        
        // Add notification to User's notifications array
        await User.findByIdAndUpdate(followeeId, {
          $push: {
            notifications: {
              type: 'follow_request',
              from: actualFollowerId,
              message: `${req.user.name} wants to follow you`,
              createdAt: new Date(),
              metadata: {
                followId: follow._id.toString()
              }
            }
          }
        });
        
        console.log(`✅ Follow request notification created for user: ${followeeId.toString()}`);
        
        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${followeeId.toString()}`).emit('new_notification', {
            type: 'follow_request',
            from: {
              _id: follower._id,
              name: follower.name,
              email: follower.email,
              avatarUrl: follower.avatarUrl
            },
            message: `${req.user.name} wants to follow you`,
            metadata: {
              followId: follow._id.toString()
            },
            createdAt: new Date()
          });
          
          console.log(`📬 Follow request notification sent via Socket.IO to user: ${followeeId}`);
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }
    
    res.status(201).json({
      success: true,
      message: status === 'accepted' ? 'User followed successfully' : 'Follow request sent',
      follow: {
        _id: follow._id,
        followerId: follow.followerId,
        followeeId: follow.followeeId,
        status: follow.status,
        createdAt: follow.createdAt
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/follow/accept/:userId - Accept follow request (legacy endpoint - uses userId instead of followId)
router.post('/accept/:userId', authenticateToken, requireUser, validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    
    // Find the follow request where current user is followee and requester is userId
    console.log('🔍 Looking for follow request:', {
      followerId: userId,
      followeeId: currentUserId,
      currentUser: req.user.name
    });
    
    // First try to find pending request
    let follow = await Follow.findOne({
      followerId: userId,
      followeeId: currentUserId,
      status: 'pending'
    });
    
    // If not found, check if it already exists (might be accepted/declined)
    if (!follow) {
      follow = await Follow.findOne({
        followerId: userId,
        followeeId: currentUserId
      });
      
      if (follow) {
        console.log('📋 Found follow relationship with status:', follow.status);
        if (follow.status === 'accepted') {
          // Already accepted - return success (idempotent operation)
          console.log('✅ Follow request already accepted, returning success');
          return res.json({
            success: true,
            message: 'Follow request was already accepted',
            follow: {
              _id: follow._id,
              followerId: follow.followerId,
              followeeId: follow.followeeId,
              status: follow.status
            }
          });
        } else if (follow.status === 'declined') {
          // Allow re-accepting a declined request by updating it
          console.log('🔄 Re-accepting declined follow request');
          follow.status = 'pending';
        } else {
          return res.status(404).json({
            success: false,
            message: 'Follow request not found or already processed'
          });
        }
      } else {
        // No follow relationship exists at all
        console.log('❌ No follow relationship found');
        const requester = await User.findById(userId);
        if (!requester) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        
        // Check if there's a notification that suggests a follow request was sent
        // If so, we might need to create the follow relationship
        // For now, return a helpful error message
        return res.status(404).json({
          success: false,
          message: 'Follow request not found. The user may not have sent a follow request, or it may have been removed.',
          debug: {
            followerId: userId,
            followeeId: currentUserId,
            requesterName: requester.name
          }
        });
      }
    } else {
      console.log('✅ Found pending follow request');
    }
    
    // Update status to accepted
    const wasAlreadyAccepted = follow.status === 'accepted';
    follow.status = 'accepted';
    await follow.save();
    
    // Only update counters if it wasn't already accepted (to avoid double counting)
    if (!wasAlreadyAccepted) {
      await User.findByIdAndUpdate(follow.followerId, {
        $inc: { followingCount: 1 }
      });
      
      await User.findByIdAndUpdate(follow.followeeId, {
        $inc: { followersCount: 1 }
      });
    }
    
    // Remove the follow_request notification from the followee's notifications
    try {
      await User.findByIdAndUpdate(follow.followeeId, {
        $pull: {
          notifications: {
            type: 'follow_request',
            from: follow.followerId
          }
        }
      });
      console.log(`✅ Removed follow_request notification for user: ${follow.followeeId.toString()}`);
    } catch (removeNotifError) {
      console.error('Failed to remove follow_request notification:', removeNotifError);
    }
    
    // Create notification for follower (only if not already accepted)
    if (!wasAlreadyAccepted) {
      try {
        const followee = await User.findById(follow.followeeId).select('name email avatarUrl');
        
        await User.findByIdAndUpdate(follow.followerId, {
          $push: {
            notifications: {
              type: 'follow_accepted',
              from: follow.followeeId,
              message: `${req.user.name} accepted your follow request`,
              createdAt: new Date(),
              metadata: {
                followId: follow._id.toString()
              }
            }
          }
        });
        
        console.log(`✅ Follow accepted notification created for user: ${follow.followerId.toString()}`);
        
        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${follow.followerId.toString()}`).emit('new_notification', {
            type: 'follow_accepted',
            from: {
              _id: followee._id,
              name: followee.name,
              email: followee.email,
              avatarUrl: followee.avatarUrl
            },
            message: `${req.user.name} accepted your follow request`,
            metadata: {
              followId: follow._id.toString()
            },
            createdAt: new Date()
          });
        }
      } catch (notifError) {
        console.error('Failed to create acceptance notification:', notifError);
      }
    }
    
    res.json({
      success: true,
      message: wasAlreadyAccepted ? 'Follow request was already accepted' : 'Follow request accepted',
      follow: {
        _id: follow._id,
        followerId: follow.followerId,
        followeeId: follow.followeeId,
        status: follow.status
      }
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/follow/decline/:userId - Decline follow request (legacy endpoint - uses userId instead of followId)
router.post('/decline/:userId', authenticateToken, requireUser, validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    
    // Find and delete the follow request
    const follow = await Follow.findOneAndDelete({
      followerId: userId,
      followeeId: currentUserId,
      status: 'pending'
    });
    
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found or already processed'
      });
    }
    
    res.json({
      success: true,
      message: 'Follow request declined'
    });
  } catch (error) {
    console.error('Decline follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/follow/accept/:followId - Accept a follow request
router.post('/accept/:followId', authenticateToken, requireUser, validateObjectId('followId'), async (req, res) => {
  try {
    const { followId } = req.params;
    const currentUserId = req.user._id.toString();
    
    // Find the follow request
    const follow = await Follow.findById(followId);
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found'
      });
    }
    
    // Verify current user is the followee
    if (follow.followeeId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept follow requests sent to you'
      });
    }
    
    if (follow.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Follow request is already ${follow.status}`
      });
    }
    
    // Update status to accepted
    follow.status = 'accepted';
    await follow.save();
    
    // Update counters
    await User.findByIdAndUpdate(follow.followerId, {
      $inc: { followingCount: 1 }
    });
    
    await User.findByIdAndUpdate(follow.followeeId, {
      $inc: { followersCount: 1 }
    });
    
    // Create notification for follower
    try {
      const followee = await User.findById(follow.followeeId).select('name email avatarUrl');
      
      await User.findByIdAndUpdate(follow.followerId, {
        $push: {
          notifications: {
            type: 'follow_accepted',
            from: follow.followeeId,
            message: `${req.user.name} accepted your follow request`,
            createdAt: new Date(),
            metadata: {
              followId: follow._id.toString()
            }
          }
        }
      });
      
      console.log(`✅ Follow accepted notification created for user: ${follow.followerId.toString()}`);
      
      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${follow.followerId.toString()}`).emit('new_notification', {
          type: 'follow_accepted',
          from: {
            _id: followee._id,
            name: followee.name,
            email: followee.email,
            avatarUrl: followee.avatarUrl
          },
          message: `${req.user.name} accepted your follow request`,
          metadata: {
            followId: follow._id.toString()
          },
          createdAt: new Date()
        });
      }
    } catch (notifError) {
      console.error('Failed to create acceptance notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Follow request accepted',
      follow: {
        _id: follow._id,
        followerId: follow.followerId,
        followeeId: follow.followeeId,
        status: follow.status
      }
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/follow/decline/:followId - Decline a follow request
router.post('/decline/:followId', authenticateToken, requireUser, validateObjectId('followId'), async (req, res) => {
  try {
    const { followId } = req.params;
    const currentUserId = req.user._id.toString();
    
    // Find and delete the follow request
    const follow = await Follow.findOneAndDelete({
      _id: followId,
      followeeId: currentUserId,
      status: 'pending'
    });
    
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow request not found or already processed'
      });
    }
    
    // Create notification for follower that request was declined
    try {
      const followee = await User.findById(currentUserId).select('name email avatarUrl');
      const follower = await User.findById(follow.followerId).select('name email avatarUrl');
      
      await User.findByIdAndUpdate(follow.followerId, {
        $push: {
          notifications: {
            type: 'follow_declined',
            from: currentUserId,
            message: `${req.user.name} declined your follow request`,
            createdAt: new Date(),
            metadata: {
              followId: follow._id.toString()
            }
          }
        }
      });
      
      console.log(`✅ Follow declined notification created for user: ${follow.followerId.toString()}`);
      
      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${follow.followerId.toString()}`).emit('new_notification', {
          type: 'follow_declined',
          from: {
            _id: followee._id,
            name: followee.name,
            email: followee.email,
            avatarUrl: followee.avatarUrl
          },
          message: `${req.user.name} declined your follow request`,
          metadata: {
            followId: follow._id.toString()
          },
          createdAt: new Date()
        });
      }
    } catch (notifError) {
      console.error('Failed to create decline notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Follow request declined'
    });
  } catch (error) {
    console.error('Decline follow request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/follow/request/:userId - Send follow request (legacy endpoint for compatibility)
// IMPORTANT: This route must come BEFORE /requests route to avoid Express matching conflicts
router.post('/request/:userId', 
  (req, res, next) => {
    console.log('🔍 Route middleware - /request/:userId', {
      method: req.method,
      path: req.path,
      params: req.params,
      userId: req.params.userId
    });
    next();
  },
  authenticateToken, 
  requireUser, 
  validateObjectId('userId'), 
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user._id.toString();
      
      console.log('📤 Follow request received:', {
        followerId: currentUserId,
        followeeId: userId,
        followerName: req.user.name,
        route: '/request/:userId',
        method: 'POST'
      });
    
    // Can't follow yourself
    if (currentUserId === userId) {
      console.log('❌ User tried to follow themselves');
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }
    
    // Check if followee exists
    const followee = await User.findById(userId);
    if (!followee) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if already following
    const existingFollow = await Follow.findOne({
      followerId: currentUserId,
      followeeId: userId
    });
    
    if (existingFollow) {
      if (existingFollow.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already following this user'
        });
      } else if (existingFollow.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Follow request is pending'
        });
      }
    }
    
    // Determine status based on account privacy
    const status = followee.isPrivate ? 'pending' : 'accepted';
    
    console.log('🔒 Account privacy check:', {
      followeeId: userId,
      followeeName: followee.name,
      isPrivate: followee.isPrivate,
      determinedStatus: status
    });
    
    // Create follow relationship
    let follow;
    try {
      follow = new Follow({
        followerId: currentUserId,
        followeeId: userId,
        status: status
      });
      
      await follow.save();
      console.log('✅ Follow relationship created:', {
        followId: follow._id,
        status: follow.status,
        followerId: currentUserId,
        followeeId: userId,
        isPrivate: followee.isPrivate
      });
    } catch (saveError) {
      // Handle duplicate key error (race condition)
      if (saveError.code === 11000 || saveError.message?.includes('duplicate')) {
        console.log('⚠️ Duplicate follow detected, fetching existing');
        const existing = await Follow.findOne({
          followerId: currentUserId,
          followeeId: userId
        });
        
        if (existing) {
          if (existing.status === 'accepted') {
            return res.status(400).json({
              success: false,
              message: 'You are already following this user'
            });
          } else if (existing.status === 'pending') {
            return res.status(400).json({
              success: false,
              message: 'Follow request is pending'
            });
          }
          // Use existing follow if status is declined
          follow = existing;
          follow.status = status;
          await follow.save();
        } else {
          throw saveError; // Re-throw if we can't find the existing follow
        }
      } else {
        throw saveError; // Re-throw if not a duplicate error
      }
    }
    
    // Update counters if accepted
    if (status === 'accepted') {
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { followingCount: 1 }
      });
      
      await User.findByIdAndUpdate(userId, {
        $inc: { followersCount: 1 }
      });
      
      // Create notification for followee
      try {
        const follower = await User.findById(currentUserId).select('name email avatarUrl');
        
        await User.findByIdAndUpdate(userId, {
          $push: {
            notifications: {
              type: 'follow',
              from: currentUserId,
              message: `${req.user.name} started following you`,
              createdAt: new Date(),
              metadata: {
                followId: follow._id.toString()
              }
            }
          }
        });
        
        console.log(`✅ Follow notification created for user: ${userId}`);
        
        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${userId}`).emit('new_notification', {
            type: 'follow',
            from: {
              _id: follower._id,
              name: follower.name,
              email: follower.email,
              avatarUrl: follower.avatarUrl
            },
            message: `${req.user.name} started following you`,
            metadata: {
              followId: follow._id.toString()
            },
            createdAt: new Date()
          });
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    } else {
      // For private accounts, create follow request notification
      try {
        const follower = await User.findById(currentUserId).select('name email avatarUrl');
        
        await User.findByIdAndUpdate(userId, {
          $push: {
            notifications: {
              type: 'follow_request',
              from: currentUserId,
              message: `${req.user.name} wants to follow you`,
              createdAt: new Date(),
              metadata: {
                followId: follow._id.toString()
              }
            }
          }
        });
        
        console.log(`✅ Follow request notification created for user: ${userId}`);
        
        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${userId}`).emit('new_notification', {
            type: 'follow_request',
            from: {
              _id: follower._id,
              name: follower.name,
              email: follower.email,
              avatarUrl: follower.avatarUrl
            },
            message: `${req.user.name} wants to follow you`,
            metadata: {
              followId: follow._id.toString()
            },
            createdAt: new Date()
          });
          
          console.log(`📬 Follow request notification sent via Socket.IO to user: ${userId}`);
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }
    
    res.json({
      success: true,
      message: status === 'accepted' ? 'User followed successfully' : 'Follow request sent successfully',
      follow: {
        _id: follow._id,
        followerId: follow.followerId,
        followeeId: follow.followeeId,
        status: follow.status,
        createdAt: follow.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Send follow request error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user or have a pending request'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/follow/search - Search users for following (MUST come before all other GET routes)
router.get('/search', authenticateToken, requireUser, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const currentUserId = req.user._id.toString();

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = q.trim();
    const limitNum = parseInt(limit) || 20;

    // Search users by name or email (exclude current user and deleted users)
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // Exclude current user
        { deletedAt: null }, // Exclude deleted users
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { username: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email username avatarUrl bio isOnline lastSeen isVerified verifiedTill createdAt')
    .limit(limitNum)
    .sort({ createdAt: -1 });

    // Get current user's following list to check follow status
    const followingRelations = await Follow.find({
      followerId: currentUserId,
      status: 'accepted'
    }).select('followeeId');

    const followingIds = followingRelations.map(f => f.followeeId.toString());

    // Get pending follow requests
    const pendingRequests = await Follow.find({
      followerId: currentUserId,
      status: 'pending'
    }).select('followeeId');

    const pendingIds = pendingRequests.map(f => f.followeeId.toString());

    // Add follow status for each user
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      userObj.isFollowing = followingIds.includes(user._id.toString());
      userObj.hasPendingRequest = pendingIds.includes(user._id.toString());
      
      // Check if verification is still valid
      if (userObj.isVerified && userObj.verifiedTill) {
        const expiryDate = new Date(userObj.verifiedTill);
        const now = new Date();
        userObj.isVerified = expiryDate > now;
      } else {
        userObj.isVerified = false;
      }
      
      return userObj;
    });

    res.json({
      success: true,
      users: usersWithStatus,
      count: usersWithStatus.length
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/follow/requests - Get pending follow requests for current user
// NOTE: Must come AFTER /request/:userId route to avoid Express matching conflicts
router.get('/requests', authenticateToken, requireUser, async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    
    // Find all pending follow requests where current user is the followee
    const pendingRequests = await Follow.find({
      followeeId: currentUserId,
      status: 'pending'
    })
    .populate('followerId', 'name email avatarUrl profilePic bio createdAt')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      requests: pendingRequests.map(req => ({
        _id: req._id,
        follower: req.followerId,
        createdAt: req.createdAt,
        status: req.status
      }))
    });
  } catch (error) {
    console.error('Get follow requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/follow/followers - Get current user's followers list
router.get('/followers', authenticateToken, requireUser, async (req, res) => {
  // Set timeout for this request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ GET /follow/followers timeout - sending response');
      return res.status(200).json({
        success: true,
        followers: [],
        count: 0,
        message: 'Request completed with default values due to timeout'
      });
    }
  }, 25000); // 25 second timeout
  
  try {
    const currentUserId = req.user._id.toString();
    
    // Find all accepted follow relationships where current user is the followee
    // Add lean() for faster queries and limit to prevent huge datasets
    const followersList = await Follow.find({
      followeeId: currentUserId,
      status: 'accepted'
    })
    .populate('followerId', 'name email avatarUrl bio isOnline lastSeen isVerified verifiedTill createdAt')
    .sort({ createdAt: -1 })
    .limit(1000) // Limit to prevent huge queries
    .lean(); // Use lean() for faster queries
    
    // Extract user data from populated followerId
    const followers = followersList.map(follow => ({
      ...follow.followerId,
      _id: follow.followerId._id,
      followedAt: follow.createdAt
    }));
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        followers: followers,
        count: followers.length
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Get followers error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get followers list',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// GET /api/follow/following - Get current user's following list
router.get('/following', authenticateToken, requireUser, async (req, res) => {
  // Set timeout for this request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ GET /follow/following timeout - sending response');
      return res.status(200).json({
        success: true,
        following: [],
        count: 0,
        message: 'Request completed with default values due to timeout'
      });
    }
  }, 25000); // 25 second timeout
  
  try {
    const currentUserId = req.user._id.toString();
    
    // Find all accepted follow relationships where current user is the follower
    // Add lean() for faster queries and limit to prevent huge datasets
    const followingList = await Follow.find({
      followerId: currentUserId,
      status: 'accepted'
    })
    .populate('followeeId', 'name email avatarUrl bio isOnline lastSeen isVerified verifiedTill createdAt')
    .sort({ createdAt: -1 })
    .limit(1000) // Limit to prevent huge queries
    .lean(); // Use lean() for faster queries
    
    // Extract user data from populated followeeId
    const following = followingList.map(follow => ({
      ...follow.followeeId,
      _id: follow.followeeId._id,
      followedAt: follow.createdAt
    }));
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        following: following,
        count: following.length
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Get following error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get following list',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// GET /api/follow/check/:userId - Check if current user is following a specific user
router.get('/check/:userId', authenticateToken, requireUser, validateObjectId('userId'), async (req, res) => {
  // Set timeout for this request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ GET /follow/check/:userId timeout - sending default response');
      return res.status(200).json({
        success: true,
        isFollowing: false,
        isPending: false,
        followStatus: null,
        followId: null,
        message: 'Request completed with default values due to timeout'
      });
    }
  }, 25000); // 25 second timeout
  
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    
    // Check if current user is following this user (accepted status)
    // Use lean() and select only needed fields for faster query
    const follow = await Follow.findOne({
      followerId: currentUserId,
      followeeId: userId
    })
    .select('status _id')
    .lean();
    
    const isFollowing = follow && follow.status === 'accepted';
    const isPending = follow && follow.status === 'pending';
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        isFollowing: !!isFollowing,
        isPending: !!isPending,
        followStatus: follow ? follow.status : null,
        followId: follow ? follow._id : null
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ Check follow status error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check follow status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// DELETE /api/follow/unfollow/:userId - Unfollow a user by userId (URL parameter)
router.delete('/unfollow/:userId', authenticateToken, requireUser, validateObjectId('userId'), async (req, res) => {
  try {
    const followeeId = req.params.userId;
    const currentUserId = req.user._id.toString();
    
    // Find and delete follow relationship
    const follow = await Follow.findOneAndDelete({
      followerId: currentUserId,
      followeeId: followeeId
    });
    
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'You are not following this user'
      });
    }
    
    // Update counters atomically (only if status was accepted)
    if (follow.status === 'accepted') {
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { followingCount: -1 }
      });
      
      await User.findByIdAndUpdate(followeeId, {
        $inc: { followersCount: -1 }
      });
    }
    
    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/follow - Unfollow a user (body parameter - for backward compatibility)
router.delete('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    const currentUserId = req.user._id.toString();
    
    // Use current user as follower if not specified
    const actualFollowerId = followerId || currentUserId;
    
    if (actualFollowerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only unfollow on behalf of yourself'
      });
    }
    
    if (!followeeId) {
      return res.status(400).json({
        success: false,
        message: 'followeeId is required'
      });
    }
    
    // Find and delete follow relationship
    const follow = await Follow.findOneAndDelete({
      followerId: actualFollowerId,
      followeeId: followeeId
    });
    
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'You are not following this user'
      });
    }
    
    // Update counters atomically (only if status was accepted)
    if (follow.status === 'accepted') {
      await User.findByIdAndUpdate(actualFollowerId, {
        $inc: { followingCount: -1 }
      });
      
      await User.findByIdAndUpdate(followeeId, {
        $inc: { followersCount: -1 }
      });
    }
    
    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/follow/followers/:userId - Get followers list for a specific user
router.get('/followers/:userId', authenticateToken, async (req, res) => {
  // Set timeout for this request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ GET /follow/followers/:userId timeout - sending response');
      return res.status(200).json({
        success: true,
        followers: [],
        count: 0,
        message: 'Request completed with default values due to timeout'
      });
    }
  }, 25000); // 25 second timeout
  
  try {
    const targetUserId = req.params.userId;
    
    // Find all accepted follow relationships where target user is the followee
    // Add lean() for faster queries and limit to prevent huge datasets
    const followersList = await Follow.find({
      followeeId: targetUserId,
      status: 'accepted'
    })
    .populate('followerId', 'name email avatarUrl bio isOnline lastSeen isVerified verifiedTill createdAt')
    .sort({ createdAt: -1 })
    .limit(1000) // Limit to prevent huge queries
    .lean(); // Use lean() for faster queries
    
    // Extract user data from populated followerId
    const followers = followersList.map(follow => ({
      ...follow.followerId,
      _id: follow.followerId._id,
      followedAt: follow.createdAt
    }));
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        followers: followers,
        count: followers.length
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Get followers error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get followers list',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// GET /api/follow/following/:userId - Get following list for a specific user
router.get('/following/:userId', authenticateToken, async (req, res) => {
  // Set timeout for this request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ GET /follow/following/:userId timeout - sending response');
      return res.status(200).json({
        success: true,
        following: [],
        count: 0,
        message: 'Request completed with default values due to timeout'
      });
    }
  }, 25000); // 25 second timeout
  
  try {
    const targetUserId = req.params.userId;
    
    // Find all accepted follow relationships where target user is the follower
    // Add lean() for faster queries and limit to prevent huge datasets
    const followingList = await Follow.find({
      followerId: targetUserId,
      status: 'accepted'
    })
    .populate('followeeId', 'name email avatarUrl bio isOnline lastSeen isVerified verifiedTill createdAt')
    .sort({ createdAt: -1 })
    .limit(1000) // Limit to prevent huge queries
    .lean(); // Use lean() for faster queries
    
    // Extract user data from populated followeeId
    const following = followingList.map(follow => ({
      ...follow.followeeId,
      _id: follow.followeeId._id,
      followedAt: follow.createdAt
    }));
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        following: following,
        count: following.length
      });
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Get following error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get following list',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

module.exports = router;

