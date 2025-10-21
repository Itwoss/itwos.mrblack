const jwt = require('jsonwebtoken');

// Generate access token
const generateAccessToken = (userId, role = 'user') => {
  try {
    const payload = {
      userId: userId,
      role: role,
      type: 'access'
    };

    const options = {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    };

    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, options);
    
    return {
      success: true,
      token: token,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
    };
  } catch (error) {
    console.error('Access token generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate access token'
    };
  }
};

// Generate refresh token
const generateRefreshToken = (userId, role = 'user') => {
  try {
    const payload = {
      userId: userId,
      role: role,
      type: 'refresh'
    };

    const options = {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    };

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, options);
    
    return {
      success: true,
      token: token,
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
    };
  } catch (error) {
    console.error('Refresh token generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate refresh token'
    };
  }
};

// Generate token pair (access + refresh)
const generateTokenPair = (userId, role = 'user') => {
  try {
    const accessTokenResult = generateAccessToken(userId, role);
    if (!accessTokenResult.success) {
      return accessTokenResult;
    }

    const refreshTokenResult = generateRefreshToken(userId, role);
    if (!refreshTokenResult.success) {
      return refreshTokenResult;
    }

    return {
      success: true,
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      accessTokenExpiresIn: accessTokenResult.expiresIn,
      refreshTokenExpiresIn: refreshTokenResult.expiresIn
    };
  } catch (error) {
    console.error('Token pair generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate token pair'
    };
  }
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    });

    if (decoded.type !== 'access') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    return {
      success: true,
      decoded: decoded
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        error: 'Invalid access token'
      };
    }
    
    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        error: 'Access token expired'
      };
    }

    console.error('Access token verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify access token'
    };
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    });

    if (decoded.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    return {
      success: true,
      decoded: decoded
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
    
    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        error: 'Refresh token expired'
      };
    }

    console.error('Refresh token verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify refresh token'
    };
  }
};

// Decode token without verification (for debugging)
const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    
    return {
      success: true,
      decoded: decoded
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return {
      success: false,
      error: error.message || 'Failed to decode token'
    };
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return {
        success: false,
        error: 'Token does not contain expiration information'
      };
    }

    const expirationDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const timeUntilExpiry = expirationDate.getTime() - now.getTime();
    
    return {
      success: true,
      expirationDate: expirationDate,
      timeUntilExpiry: timeUntilExpiry,
      isExpired: timeUntilExpiry <= 0
    };
  } catch (error) {
    console.error('Token expiration check error:', error);
    return {
      success: false,
      error: error.message || 'Failed to check token expiration'
    };
  }
};

// Generate password reset token
const generatePasswordResetToken = (userId) => {
  try {
    const payload = {
      userId: userId,
      type: 'password-reset',
      purpose: 'password-reset'
    };

    const options = {
      expiresIn: '1h', // Password reset tokens expire in 1 hour
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    };

    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, options);
    
    return {
      success: true,
      token: token,
      expiresIn: '1h'
    };
  } catch (error) {
    console.error('Password reset token generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate password reset token'
    };
  }
};

// Verify password reset token
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    });

    if (decoded.type !== 'password-reset') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    return {
      success: true,
      decoded: decoded
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        error: 'Invalid password reset token'
      };
    }
    
    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        error: 'Password reset token expired'
      };
    }

    console.error('Password reset token verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify password reset token'
    };
  }
};

// Generate email verification token
const generateEmailVerificationToken = (userId) => {
  try {
    const payload = {
      userId: userId,
      type: 'email-verification',
      purpose: 'email-verification'
    };

    const options = {
      expiresIn: '24h', // Email verification tokens expire in 24 hours
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    };

    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, options);
    
    return {
      success: true,
      token: token,
      expiresIn: '24h'
    };
  } catch (error) {
    console.error('Email verification token generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate email verification token'
    };
  }
};

// Verify email verification token
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'itwos-ai',
      audience: 'itwos-ai-users'
    });

    if (decoded.type !== 'email-verification') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    return {
      success: true,
      decoded: decoded
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        error: 'Invalid email verification token'
      };
    }
    
    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        error: 'Email verification token expired'
      };
    }

    console.error('Email verification token verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify email verification token'
    };
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken
};
