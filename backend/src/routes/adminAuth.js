const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')
const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-here-change-this-in-production'

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
  
  return { accessToken, refreshToken }
}

// POST /admin/login
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      })
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id)

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.profile?.avatar,
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken, // Include refresh token in response
        expiresIn: '15m'
      }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// POST /admin/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      })
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      })
    }

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      })
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user._id, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        expiresIn: '15m'
      }
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    })
  }
})

// POST /admin/logout
router.post('/logout', async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })

    // In a real application, you might want to:
    // 1. Add the access token to a blacklist
    // 2. Store blacklisted tokens in Redis or database
    // 3. Check blacklist during token validation

    res.status(200).json({
      success: true,
      message: 'Admin logout successful'
    })

  } catch (error) {
    console.error('Admin logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// GET /admin/me - Get current admin user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token not provided'
      })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      })
    }

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Admin user not found'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.profile?.avatar,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    })

  } catch (error) {
    console.error('Get admin profile error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }
})

module.exports = router









