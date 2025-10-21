const express = require('express');
const router = express.Router();

console.log('🔐 Password Reset routes loaded successfully');

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Password reset routes working!' });
});

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Import email service
const { sendEmailOTP, sendSMSOTP } = require('../services/emailService');


// Request password reset
router.post('/request', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('method').isIn(['email', 'phone']).withMessage('Method must be email or phone')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, method } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate OTP and expiry (5 minutes)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in user document
    user.passwordResetOTP = otp;
    user.passwordResetExpiry = otpExpiry;
    user.passwordResetMethod = method;
    await user.save();

    // Send OTP based on method
    if (method === 'email') {
      const emailResult = await sendEmailOTP(email, otp);
      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: emailResult.message
        });
      }
    } else if (method === 'phone') {
      if (!user.phone) {
        return res.status(400).json({
          success: false,
          message: 'No phone number associated with this account'
        });
      }
      
      const smsResult = await sendSMSOTP(user.phone, otp);
      if (!smsResult.success) {
        return res.status(500).json({
          success: false,
          message: smsResult.message
        });
      }
    }

    res.json({
      success: true,
      message: `OTP sent to your ${method}`,
      data: {
        email: email,
        method: method,
        expiry: otpExpiry,
        otp: otp // Include OTP in response for testing (remove in production)
      }
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.passwordResetOTP || !user.passwordResetExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No password reset request found'
      });
    }

    if (new Date() > user.passwordResetExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken: resetToken,
        expiry: user.passwordResetTokenExpiry
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Reset password
router.post('/reset', [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { resetToken, newPassword } = req.body;

    // Find user by reset token
    const user = await User.findOne({ 
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset fields
    user.passwordHash = hashedPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetExpiry = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.passwordResetMethod = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Check if user exists (for frontend validation)
router.post('/check-user', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    res.json({
      success: true,
      data: {
        exists: !!user,
        hasPhone: !!(user && user.phone)
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user'
    });
  }
});

module.exports = router;
