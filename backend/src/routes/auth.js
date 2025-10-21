const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateTokenPair, generatePasswordResetToken, verifyPasswordResetToken, generateEmailVerificationToken, verifyEmailVerificationToken } = require('../utils/jwt');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/mailjet');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin, validatePasswordResetRequest, validatePasswordReset } = require('../middleware/validation');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password, publicKey } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password,
      publicKey,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });

    await user.save();

    // Generate tokens
    const tokenResult = generateTokenPair(user._id, user.role);
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate authentication tokens'
      });
    }

    // Send welcome email
    const emailResult = await sendWelcomeEmail(user.email, user.name);
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.getPublicProfile(),
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        accessTokenExpiresIn: tokenResult.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokenResult = generateTokenPair(user._id, user.role);
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate authentication tokens'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: user.getPublicProfile(),
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        accessTokenExpiresIn: tokenResult.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { access_token, userInfo } = req.body;

    if (!access_token || !userInfo) {
      return res.status(400).json({
        success: false,
        message: 'Google access token and user info are required'
      });
    }

    // Verify Google access token by making a request to Google's userinfo endpoint
    const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`);
    
    if (!googleResponse.ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google access token'
      });
    }

    const googleUserInfo = await googleResponse.json();
    const { id: googleId, email, name, picture } = googleUserInfo;

    // Check if user exists
    let user = await User.findByGoogleId(googleId);
    
    if (!user) {
      // Check if user exists with this email
      user = await User.findByEmail(email);
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.avatarUrl = picture;
        await user.save();
      } else {
        // Create new user
        user = new User({
          name,
          email,
          googleId,
          avatarUrl: picture,
          publicKey: crypto.randomBytes(32).toString('hex'), // Generate temporary public key
          isEmailVerified: true
        });
        await user.save();

        // Send welcome email
        const emailResult = await sendWelcomeEmail(user.email, user.name);
        if (!emailResult.success) {
          console.error('Failed to send welcome email:', emailResult.error);
        }
      }
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Generate tokens
    const tokenResult = generateTokenPair(user._id, user.role);
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate authentication tokens'
      });
    }

    res.json({
      success: true,
      message: 'Google login successful',
      user: user.getPublicProfile(),
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        accessTokenExpiresIn: tokenResult.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Development mode: Handle mock refresh tokens
    if (process.env.NODE_ENV !== 'production' && (refreshToken.includes('mock') || refreshToken.includes('Mock'))) {
      console.log('🔧 Development mode: Using mock refresh token');
      
      try {
        // Try to decode the mock refresh token
        const tokenData = JSON.parse(atob(refreshToken.split('-')[1]));
        
        // Find a real user in the database that matches the role
        let realUser = null;
        if (tokenData.role === 'admin') {
          realUser = await User.findOne({ role: 'admin' }).select('_id email name role');
        } else {
          realUser = await User.findOne({ role: 'user' }).select('_id email name role');
        }
        
        if (realUser) {
          // Generate new mock tokens
          const { createMockJWT, createMockRefreshJWT } = require('../utils/authHelper');
          const newAccessToken = createMockJWT(realUser._id, realUser.role, realUser.email, realUser.name);
          const newRefreshToken = createMockRefreshJWT(realUser._id, realUser.role);
          
          res.json({
            success: true,
            message: 'Token refreshed successfully (mock mode)',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: '15m'
          });
          return;
        } else {
          return res.status(401).json({
            success: false,
            message: 'User not found in database'
          });
        }
      } catch (error) {
        console.log('🔧 Mock refresh token decode failed, using fallback');
        
        // Find the first admin user in the database
        const adminUser = await User.findOne({ role: 'admin' }).select('_id email name role');
        if (adminUser) {
          const { createMockJWT, createMockRefreshJWT } = require('../utils/authHelper');
          const newAccessToken = createMockJWT(adminUser._id, adminUser.role, adminUser.email, adminUser.name);
          const newRefreshToken = createMockRefreshJWT(adminUser._id, adminUser.role);
          
          res.json({
            success: true,
            message: 'Token refreshed successfully (mock mode)',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: '15m'
          });
          return;
        } else {
          return res.status(401).json({
            success: false,
            message: 'No admin user found in database'
          });
        }
      }
    }

    // Production mode: Use real JWT verification
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const { generateAccessToken } = require('../utils/jwt');
    const tokenResult = generateAccessToken(user._id, user.role);
    
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate new access token'
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokenResult.token,
      expiresIn: tokenResult.expiresIn
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Forgot password
router.post('/forgot-password', validatePasswordResetRequest, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate password reset token
    const tokenResult = generatePasswordResetToken(user._id);
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate password reset token'
      });
    }

    // Save reset token to user
    user.passwordResetToken = tokenResult.token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, tokenResult.token);
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', validatePasswordReset, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify reset token
    const tokenResult = verifyPasswordResetToken(token);
    if (!tokenResult.success) {
      return res.status(400).json({
        success: false,
        message: tokenResult.error
      });
    }

    // Find user
    const user = await User.findById(tokenResult.decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token is still valid
    if (!user.passwordResetToken || user.passwordResetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Update password
    user.passwordHash = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify email verification token
    const tokenResult = verifyEmailVerificationToken(token);
    if (!tokenResult.success) {
      return res.status(400).json({
        success: false,
        message: tokenResult.error
      });
    }

    // Find user
    const user = await User.findById(tokenResult.decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Check if token matches
    if (user.emailVerificationToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const tokenResult = generateEmailVerificationToken(user._id);
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate verification token'
      });
    }

    // Update user with new token
    user.emailVerificationToken = tokenResult.token;
    await user.save();

    // Send verification email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, tokenResult.token);
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing tokens from storage
    // Optionally, you could maintain a blacklist of tokens
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
