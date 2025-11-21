const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, requireUser, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateUserProfileUpdate, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Refresh user data from database to get latest verification status
    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: freshUser.getFullProfile(),
      data: freshUser.getFullProfile() // Also include in data for consistency
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
    console.log('📝 Profile update request received:', {
      userId: req.user._id,
      bodyKeys: Object.keys(req.body),
      hasName: !!req.body.name,
      hasAvatarUrl: !!req.body.avatarUrl
    });

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
      socialLinks,
      isPrivate,
      activeStatusVisible
    } = req.body;
    
    // Fetch fresh user from database to ensure we have the latest data
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields (only update if value is provided)
    if (name !== undefined && name !== null) user.name = name.trim();
    if (phone !== undefined && phone !== null) user.phone = phone.trim();
    if (bio !== undefined && bio !== null) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || null; // Allow empty string to clear avatar
    if (location !== undefined && location !== null) user.location = location.trim();
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;
    if (company !== undefined && company !== null) user.company = company.trim();
    if (jobTitle !== undefined && jobTitle !== null) user.jobTitle = jobTitle.trim();
    if (website !== undefined && website !== null) user.website = website.trim();
    if (interests !== undefined) user.interests = Array.isArray(interests) ? interests : [];
    if (skills !== undefined) user.skills = Array.isArray(skills) ? skills : [];
    if (socialLinks !== undefined) {
      // Ensure socialLinks is an object
      user.socialLinks = typeof socialLinks === 'object' && socialLinks !== null ? socialLinks : {};
    }
    if (isPrivate !== undefined) {
      user.isPrivate = Boolean(isPrivate);
      console.log('🔒 Privacy setting updated:', { userId: user._id, isPrivate: user.isPrivate });
    }
    if (activeStatusVisible !== undefined) {
      user.activeStatusVisible = Boolean(activeStatusVisible);
      console.log('👁️ Active status visibility updated:', { userId: user._id, activeStatusVisible: user.activeStatusVisible });
    }

    // Validate before saving
    const validationError = user.validateSync();
    if (validationError) {
      console.error('❌ User validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(validationError.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    await user.save();

    console.log('✅ Profile updated successfully for user:', user._id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getFullProfile()
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user by ID (public profile) - with privacy check
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if viewer is authenticated
    const viewerId = req.user?._id;
    const isViewingOwnProfile = viewerId && viewerId.toString() === user._id.toString();
    
    // If user is private and viewer is not the owner
    if (user.isPrivate && !isViewingOwnProfile) {
      // Check if viewer is following this user
      const Follow = require('../models/Follow');
      const isFollowing = viewerId ? await Follow.findOne({
        followerId: viewerId,
        followeeId: user._id,
        status: 'accepted'
      }) : false;
      
      if (!isFollowing) {
        // Check if verification is still valid
        const isCurrentlyVerified = user.isVerified && user.verifiedTill && user.verifiedTill > new Date();
        
        // Return limited profile for private accounts (but include bio like Instagram)
        return res.json({
          success: true,
          user: {
            _id: user._id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            bio: user.bio || null, // Include bio for all users (Instagram style)
            website: user.website || null, // Include website
            location: user.location || null, // Include location
            company: user.company || null,
            jobTitle: user.jobTitle || null,
            isPrivate: true,
            requiresFollow: true,
            isVerified: isCurrentlyVerified, // Include verification status
            verifiedTill: user.verifiedTill, // Include verification expiry
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
            createdAt: user.createdAt
          },
          message: 'This account is private. Follow to see their content.'
        });
      }
    }

    // Return full public profile if public or if viewer is following
    res.json({
      success: true,
      user: user.getPublicProfile(),
      isPrivate: user.isPrivate
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

// Get user's purchases (including subscriptions)
router.get('/:id/purchases', authenticateToken, validateObjectId('id'), requireOwnershipOrAdmin('id'), async (req, res) => {
  try {
    const Purchase = require('../models/Purchase');
    const Subscription = require('../models/Subscription');
    
    // Get product purchases
    const purchases = await Purchase.findByBuyer(req.params.id);
    
    // Get subscriptions (verified badge purchases)
    const subscriptions = await Subscription.find({ userId: req.params.id })
      .sort({ createdAt: -1 });
    
    // Format purchases
    const formattedPurchases = purchases.map(purchase => ({
      ...purchase.getPublicData(),
      type: 'product',
      product: purchase.product
    }));
    
    // Format subscriptions as purchases
    const formattedSubscriptions = subscriptions.map(subscription => ({
      _id: subscription._id,
      type: 'subscription',
      product: {
        _id: 'verified-badge',
        title: `Verified Badge - ${subscription.planMonths} Month${subscription.planMonths > 1 ? 's' : ''}`,
        description: 'Blue Checkmark – Verified Badge Subscription'
      },
      amount: subscription.price,
      currency: subscription.currency || 'INR',
      status: subscription.status === 'active' ? 'paid' : subscription.status === 'expired' ? 'completed' : subscription.status,
      paymentMethod: subscription.paymentMethod || 'card',
      razorpayOrderId: subscription.razorpayOrderId || subscription.paymentId,
      razorpayPaymentId: subscription.razorpayPaymentId || subscription.paymentId,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      // Subscription-specific fields
      planMonths: subscription.planMonths,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      isSubscription: true
    }));
    
    // Combine and sort by creation date (newest first)
    const allPurchases = [...formattedPurchases, ...formattedSubscriptions].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      purchases: allPurchases
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
    const users = await User.find({ ...query, deletedAt: null })
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

// Request account deletion (Step 1 of 3)
router.post('/me/request-deletion', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already deleted
    if (user.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Account is already deleted'
      });
    }

    // Verify password for account deletion
    if (!user.googleId) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }
    }

    // Start deletion confirmation process
    user.deletionConfirmationCount = 1;
    user.deletionRequestedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Deletion request initiated. This is confirmation 1 of 3. Please confirm 2 more times.',
      confirmationCount: 1,
      remainingConfirmations: 2
    });
  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Confirm account deletion (Step 2 and 3)
router.post('/me/confirm-deletion', authenticateToken, async (req, res) => {
  try {
    const { confirmationText } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already deleted
    if (user.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Account is already deleted'
      });
    }

    // Check if deletion was requested
    if (!user.deletionRequestedAt) {
      return res.status(400).json({
        success: false,
        message: 'No deletion request found. Please request deletion first.'
      });
    }

    // Verify confirmation text
    if (confirmationText !== `DELETE ${user.email}`) {
      return res.status(400).json({
        success: false,
        message: `Confirmation text must be exactly: DELETE ${user.email}`
      });
    }

    // Increment confirmation count
    const newCount = (user.deletionConfirmationCount || 0) + 1;

    if (newCount < 3) {
      // Not yet at 3 confirmations
      user.deletionConfirmationCount = newCount;
      await user.save();

      return res.json({
        success: true,
        message: `Deletion confirmed. This is confirmation ${newCount} of 3.`,
        confirmationCount: newCount,
        remainingConfirmations: 3 - newCount
      });
    }

    // 3rd confirmation - proceed with soft deletion
    user.deletedAt = new Date();
    user.isActive = false;
    user.deletionConfirmationCount = 3;
    await user.save();

    res.json({
      success: true,
      message: 'Your account has been deleted successfully',
      deleted: true,
      deletedAt: user.deletedAt
    });
  } catch (error) {
    console.error('Confirm account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Cancel deletion request
router.post('/me/cancel-deletion', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.deletionConfirmationCount = 0;
    user.deletionRequestedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Deletion request cancelled'
    });
  } catch (error) {
    console.error('Cancel deletion request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user account (DEPRECATED - Use request-deletion and confirm-deletion instead)
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    return res.status(400).json({
      success: false,
      message: 'This endpoint is deprecated. Please use POST /me/request-deletion and POST /me/confirm-deletion with 3-step confirmation instead.'
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
