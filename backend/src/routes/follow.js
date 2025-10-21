const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();

// Send follow request
router.post('/request/:userId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    await currentUser.sendFollowRequest(userId);

    res.json({
      success: true,
      message: 'Follow request sent successfully'
    });
  } catch (error) {
    console.error('Send follow request error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Accept follow request
router.post('/accept/:userId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    await currentUser.acceptFollowRequest(userId);

    res.json({
      success: true,
      message: 'Follow request accepted'
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Decline follow request
router.post('/decline/:userId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    await currentUser.declineFollowRequest(userId);

    res.json({
      success: true,
      message: 'Follow request declined'
    });
  } catch (error) {
    console.error('Decline follow request error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get follow requests
router.get('/requests', authenticateToken, requireUser, async (req, res) => {
  try {
    const currentUser = req.user;
    
    await currentUser.populate({
      path: 'followRequests.user',
      select: 'name email avatarUrl bio'
    });

    const pendingRequests = currentUser.followRequests.filter(req => req.status === 'pending');

    res.json({
      success: true,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Get follow requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow requests'
    });
  }
});

// Get followers
router.get('/followers', authenticateToken, requireUser, async (req, res) => {
  try {
    const currentUser = req.user;
    
    await currentUser.populate({
      path: 'followers',
      select: 'name email avatarUrl bio isOnline lastSeen'
    });

    res.json({
      success: true,
      followers: currentUser.followers
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get followers'
    });
  }
});

// Get following
router.get('/following', authenticateToken, requireUser, async (req, res) => {
  try {
    const currentUser = req.user;
    
    await currentUser.populate({
      path: 'following',
      select: 'name email avatarUrl bio isOnline lastSeen'
    });

    res.json({
      success: true,
      following: currentUser.following
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get following'
    });
  }
});

// Unfollow user
router.delete('/unfollow/:userId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // Remove from following
    currentUser.following = currentUser.following.filter(id => !id.equals(userId));
    await currentUser.save();

    // Remove from target user's followers
    const targetUser = await User.findById(userId);
    if (targetUser) {
      targetUser.followers = targetUser.followers.filter(id => !id.equals(currentUser._id));
      await targetUser.save();
    }

    res.json({
      success: true,
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user'
    });
  }
});

// Search users
router.get('/search', authenticateToken, requireUser, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const currentUser = req.user;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUser._id } }, // Exclude current user
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email avatarUrl bio isOnline lastSeen')
    .limit(parseInt(limit));

    // Add follow status for each user
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      userObj.isFollowing = currentUser.following.includes(user._id);
      userObj.hasFollowRequest = currentUser.sentFollowRequests.includes(user._id);
      userObj.isFollower = currentUser.followers.includes(user._id);
      return userObj;
    });

    res.json({
      success: true,
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

module.exports = router;
