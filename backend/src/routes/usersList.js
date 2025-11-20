const express = require('express');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/users - List all users with follow state
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'new', // 'new' or 'old'
      search,
      excludeSelf = true
    } = req.query;
    
    const viewerId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { isActive: true };
    
    // Exclude self if requested
    if (excludeSelf === 'true' || excludeSelf === true) {
      query._id = { $ne: viewerId };
    }
    
    // Search filter
    if (search && search.trim().length > 0) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort order
    const sortOrder = sort === 'old' ? 1 : -1;
    
    // Fetch users - fetch more if filtering for new users to ensure we get enough results
    const fetchLimit = req.query.onlyNew === 'true' ? parseInt(limit) * 3 : parseInt(limit);
    const users = await User.find(query)
      .select('name username email avatarUrl profilePic bio createdAt followersCount followingCount isPrivate')
      .sort({ createdAt: sortOrder })
      .limit(fetchLimit)
      .skip(skip);
    
    // Get user IDs
    const userIds = users.map(user => user._id);
    
    // Get follow statuses for viewer
    const followStatuses = await Follow.getFollowStatuses(viewerId, userIds);
    
    // Calculate "new" users (created in last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    console.log('📅 Date Check:', {
      now: now.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      usersCount: users.length,
      viewerId: viewerId.toString()
    });
    
    // Format response with follow state and isNew flag
    const usersWithState = users.map(user => {
      const userObj = user.toObject();
      userObj.isFollowed = followStatuses[user._id.toString()] || false;
      
      // Check if user is new (created in last 7 days)
      const userCreatedAt = user.createdAt ? new Date(user.createdAt) : null;
      if (userCreatedAt) {
        // Compare dates - use >= to include users created exactly 7 days ago
        // Don't normalize userCreatedAt to preserve exact creation time
        const isNew = userCreatedAt >= sevenDaysAgo;
        userObj.isNew = isNew;
        
        // Debug logging for all users to see what's happening
        const daysDiff = Math.ceil((now - userCreatedAt) / (1000 * 60 * 60 * 24));
        console.log('👤 User Check:', {
          name: user.name,
          email: user.email,
          userId: user._id.toString(),
          createdAt: userCreatedAt.toISOString(),
          sevenDaysAgo: sevenDaysAgo.toISOString(),
          isNew: isNew,
          daysDiff: daysDiff,
          hoursDiff: Math.ceil((now - userCreatedAt) / (1000 * 60 * 60)),
          isViewer: user._id.toString() === viewerId.toString()
        });
      } else {
        userObj.isNew = false; // If no createdAt, not considered new
        console.warn('⚠️ User missing createdAt:', user._id, user.email);
      }
      
      return userObj;
    });
    
    // Filter to only new users if requested (for new users page)
    const filteredUsers = req.query.onlyNew === 'true' 
      ? usersWithState.filter(user => user.isNew === true)
      : usersWithState;
    
    // Limit results back to requested limit
    const limitedUsers = filteredUsers.slice(0, parseInt(limit));
    
    // Get total count
    const total = req.query.onlyNew === 'true'
      ? await User.countDocuments({ ...query, createdAt: { $gte: sevenDaysAgo } })
      : await User.countDocuments(query);
    
    console.log('📊 Response:', {
      requestedLimit: parseInt(limit),
      fetchedUsers: users.length,
      filteredUsers: filteredUsers.length,
      finalUsers: limitedUsers.length,
      newUsersCount: limitedUsers.filter(u => u.isNew).length
    });
    
    res.json({
      success: true,
      users: limitedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

