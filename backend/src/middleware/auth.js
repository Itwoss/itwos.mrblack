const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT access token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Reject mock tokens - they cause backend to ignore auth and never respond
    // Only allow in development with explicit flag
    const allowMockTokens = process.env.ALLOW_MOCK_TOKENS === 'true' && process.env.NODE_ENV !== 'production';
    
    if ((token.includes('mock') || token.includes('Mock')) && !allowMockTokens) {
      console.warn('⚠️ Mock token rejected - use real JWT tokens for authentication');
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Please login again to get a valid token.'
      });
    }
    
    // Development mode: Handle mock tokens (only if explicitly allowed)
    if (allowMockTokens && (token.includes('mock') || token.includes('Mock'))) {
      console.log('🔧 Development mode: Using mock token authentication (ALLOW_MOCK_TOKENS=true)')
      
      try {
        // Handle both simple mock tokens and complex JWT-like mock tokens
        let tokenData;
        if (token.includes('mock-') && token.split('-').length > 1) {
          const encodedData = token.split('-')[1];
          tokenData = JSON.parse(atob(encodedData));
        } else {
          // Fallback for simple mock tokens
          tokenData = { role: 'user', userId: 'mock-user-id' };
        }
        
        // Find a real user in the database that matches the role (exclude deleted users)
        let realUser = null;
        if (tokenData.role === 'admin') {
          realUser = await User.findOne({ role: 'admin', deletedAt: null }).select('_id email name role');
        } else {
          // Try to find user by userId from token if available
          if (tokenData.userId && tokenData.userId !== 'mock-user-id') {
            realUser = await User.findOne({ 
              $or: [
                { _id: tokenData.userId },
                { googleId: tokenData.userId }
              ],
              deletedAt: null 
            }).select('_id email name role');
          }
          
          // If not found, get any user
          if (!realUser) {
            realUser = await User.findOne({ role: 'user', deletedAt: null }).select('_id email name role');
          }
        }
        
        if (realUser) {
          // Get full user object for proper authentication
          const fullUser = await User.findById(realUser._id).select('-passwordHash');
          if (fullUser) {
            req.user = fullUser;
            console.log('🔧 Using real user for mock token:', fullUser.email);
            return next();
          }
        }
        
        return res.status(401).json({
          success: false,
          message: 'User not found in database. Please login again.'
        });
      } catch (error) {
        console.error('🔧 Mock token processing error:', error);
        return res.status(401).json({
          success: false,
          message: 'Invalid mock token format. Please login again.'
        });
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findOne({ 
      _id: decoded.userId, 
      deletedAt: null 
    }).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account has been deleted'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Verify refresh token
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
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

    console.error('Refresh token middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Refresh token error'
    });
  }
};

// Require user role (user or admin)
const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['user', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'User access required'
    });
  }

  next();
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'Resource user ID not found'
      });
    }

    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources'
      });
    }

    next();
  };
};

// Check if user is participant in chat room
const requireChatRoomAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const ChatRoom = require('../models/ChatRoom');
    const roomId = req.params.roomId || req.params.id;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID required'
      });
    }

    const room = await ChatRoom.findById(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Admin can access any room
    if (req.user.role === 'admin') {
      req.chatRoom = room;
      return next();
    }

    // Check if user is participant
    if (!room.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this chat room'
      });
    }

    req.chatRoom = room;
    next();
  } catch (error) {
    console.error('Chat room access middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking chat room access'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateRefreshToken,
  requireUser,
  requireAdmin,
  optionalAuth,
  requireOwnershipOrAdmin,
  requireChatRoomAccess
};
