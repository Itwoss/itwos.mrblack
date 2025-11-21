const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Test user credentials
const TEST_USERS = [
  {
    email: 'usera@test.com',
    name: 'User A',
    password: 'TestUserA123!',
    username: 'usera'
  },
  {
    email: 'userb@test.com',
    name: 'User B',
    password: 'TestUserB123!',
    username: 'userb'
  }
];

// Ensure test users exist and get their credentials
router.get('/test-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const testUsersData = [];

    for (const testUser of TEST_USERS) {
      // Check if user exists
      let user = await User.findOne({ 
        $or: [
          { email: testUser.email },
          { username: testUser.username }
        ]
      });

      if (!user) {
        // Create test user if it doesn't exist
        const passwordHash = await bcrypt.hash(testUser.password, 12);
        user = new User({
          name: testUser.name,
          email: testUser.email,
          username: testUser.username,
          passwordHash: passwordHash,
          role: 'user',
          isEmailVerified: true,
          isActive: true,
          bio: 'Test User for Testing Purposes'
        });
        await user.save();
        console.log(`✅ Created test user: ${testUser.email}`);
      } else {
        // Update password if user exists (to ensure password is correct)
        const isPasswordCorrect = await bcrypt.compare(testUser.password, user.passwordHash);
        if (!isPasswordCorrect) {
          user.passwordHash = await bcrypt.hash(testUser.password, 12);
          user.isActive = true;
          user.isEmailVerified = true;
          await user.save();
          console.log(`✅ Updated password for test user: ${testUser.email}`);
        }
      }

      testUsersData.push({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        password: testUser.password, // Return password for testing
        role: user.role,
        isActive: user.isActive
      });
    }

    res.json({
      success: true,
      testUsers: testUsersData,
      message: 'Test users are ready for testing'
    });
  } catch (error) {
    console.error('Error ensuring test users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ensure test users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Reset test users (recreate them with default credentials)
router.post('/test-users/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    for (const testUser of TEST_USERS) {
      // Delete existing test user if exists
      await User.deleteOne({ 
        $or: [
          { email: testUser.email },
          { username: testUser.username }
        ]
      });

      // Create new test user
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      const user = new User({
        name: testUser.name,
        email: testUser.email,
        username: testUser.username,
        passwordHash: passwordHash,
        role: 'user',
        isEmailVerified: true,
        isActive: true,
        bio: 'Test User for Testing Purposes'
      });
      await user.save();
      console.log(`✅ Reset test user: ${testUser.email}`);
    }

    res.json({
      success: true,
      message: 'Test users have been reset successfully'
    });
  } catch (error) {
    console.error('Error resetting test users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset test users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

