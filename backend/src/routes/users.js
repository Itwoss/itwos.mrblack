const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, requireUser, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateUserProfileUpdate, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.getFullProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update current user profile
router.put('/me', authenticateToken, validateUserProfileUpdate, async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      bio, 
      avatarUrl, 
      location, 
      dateOfBirth, 
      company, 
      jobTitle, 
      website, 
      interests, 
      skills, 
      socialLinks 
    } = req.body;
    const user = req.user;

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (location !== undefined) user.location = location;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (website !== undefined) user.website = website;
    if (interests !== undefined) user.interests = interests;
    if (skills !== undefined) user.skills = skills;
    if (socialLinks !== undefined) user.socialLinks = socialLinks;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getFullProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user by ID (public profile)
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Follow user
router.post('/:id/follow', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    // Can't follow yourself
    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    // Find target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    if (req.user.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }

    // Add to following list
    req.user.following.push(targetUserId);
    await req.user.save();

    res.json({
      success: true,
      message: 'User followed successfully',
      following: req.user.following
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Unfollow user
router.delete('/:id/follow', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Check if following
    if (!req.user.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }

    // Remove from following list
    req.user.following = req.user.following.filter(id => !id.equals(targetUserId));
    await req.user.save();

    res.json({
      success: true,
      message: 'User unfollowed successfully',
      following: req.user.following
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

// Get user's following list
router.get('/:id/following', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name email avatarUrl bio role createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      following: user.following
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get following list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user's followers (users who follow this user)
router.get('/:id/followers', validateObjectId('id'), async (req, res) => {
  try {
    const followers = await User.find({ following: req.params.id })
      .select('name email avatarUrl bio role createdAt');

    res.json({
      success: true,
      followers: followers
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get followers list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user's purchases
router.get('/:id/purchases', authenticateToken, validateObjectId('id'), requireOwnershipOrAdmin('id'), async (req, res) => {
  try {
    const Purchase = require('../models/Purchase');
    const purchases = await Purchase.findByBuyer(req.params.id);

    res.json({
      success: true,
      purchases: purchases.map(purchase => purchase.getPublicData())
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchases',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user's public key (for E2EE)
router.put('/me/public-key', authenticateToken, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        message: 'Public key is required'
      });
    }

    req.user.publicKey = publicKey;
    await req.user.save();

    res.json({
      success: true,
      message: 'Public key updated successfully'
    });
  } catch (error) {
    console.error('Update public key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update public key',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user password
router.put('/me/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    req.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q, role, limit = 20, page = 1 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    };

    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('name email avatarUrl bio role createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
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

// Get user statistics
router.get('/:id/stats', authenticateToken, validateObjectId('id'), requireOwnershipOrAdmin('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    const Purchase = require('../models/Purchase');
    const Product = require('../models/Product');

    // Get purchase statistics
    const purchaseStats = await Purchase.aggregate([
      { $match: { buyer: userId, status: 'paid' } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          averageOrderValue: { $avg: '$amount' }
        }
      }
    ]);


    // Get favorite products count
    const favoriteProductsCount = await Product.countDocuments({ 
      favoritedBy: userId 
    });

    // Get upcoming sessions count (products with type 'live-session' and future dates)
    const upcomingSessionsCount = await Product.countDocuments({
      type: 'live-session',
      scheduledDate: { $gte: new Date() },
      isActive: true
    });

    // Get following/followers count
    const user = await User.findById(userId);
    const followersCount = await User.countDocuments({ following: userId });

    const stats = {
      totalPurchases: purchaseStats[0]?.totalPurchases || 0,
      totalSpent: purchaseStats[0]?.totalSpent || 0,
      averageOrderValue: purchaseStats[0]?.averageOrderValue || 0,
      favoriteProducts: favoriteProductsCount,
      upcomingSessions: upcomingSessionsCount,
      followingCount: user.following.length,
      followersCount: followersCount,
      memberSince: user.createdAt
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user account
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    // Verify password for account deletion
    if (!req.user.googleId) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      const isPasswordValid = await req.user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }
    }

    // Soft delete - mark as inactive instead of actually deleting
    req.user.isActive = false;
    await req.user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
