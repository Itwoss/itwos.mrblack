const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    console.error('❌ Request body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('publicKey')
    .optional(),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Password reset request validation
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];


// Password reset validation
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];

// User profile update validation
const validateUserProfileUpdate = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // Allow empty/undefined/null
      if (!value || value.trim() === '') return true;
      // If provided, must be 2-100 characters
      return value.length >= 2 && value.length <= 100;
    })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Allow empty/undefined/null
      if (!value || value.trim() === '') return true;
      // If provided, must match phone format
      return /^[\+]?[1-9][\d]{0,15}$/.test(value.trim());
    })
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Allow empty/undefined/null
      if (!value) return true;
      // If provided, must not exceed 500 characters
      return value.length <= 500;
    })
    .withMessage('Bio cannot exceed 500 characters'),
  body('avatarUrl')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Allow empty/undefined/null
      if (!value || value === '') return true;
      
      // Check if it's a valid URL (including localhost) or a relative path
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        // If URL parsing fails, check if it's a relative path
        const relativePathPattern = /^\/uploads\/avatars\/[a-zA-Z0-9\-\.]+\.(jpg|jpeg|png|gif|webp)$/;
        return relativePathPattern.test(value);
      }
    })
    .withMessage('Avatar URL must be a valid URL or relative path'),
  handleValidationErrors
];

// Product creation validation
const validateProductCreation = [
  body('type')
    .isIn(['product'])
    .withMessage('Type must be product'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR'])
    .withMessage('Currency must be INR, USD, or EUR'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  body('contentUrl')
    .optional()
    .isURL()
    .withMessage('Content URL must be a valid URL'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  handleValidationErrors
];

// Product update validation
const validateProductUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR'])
    .withMessage('Currency must be INR, USD, or EUR'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  body('contentUrl')
    .optional()
    .isURL()
    .withMessage('Content URL must be a valid URL'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean'),
  handleValidationErrors
];

// Payment order creation validation
const validatePaymentOrder = [
  body('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('amount')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR'])
    .withMessage('Currency must be INR, USD, or EUR'),
  body('billingAddress')
    .optional()
    .isObject()
    .withMessage('Billing address must be an object'),
  body('billingAddress.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Billing name must be between 2 and 100 characters'),
  body('billingAddress.email')
    .optional()
    .isEmail()
    .withMessage('Billing email must be valid'),
  body('billingAddress.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Billing phone must be valid'),
  handleValidationErrors
];

// Payment verification validation
const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  handleValidationErrors
];

// Chat room creation validation
const validateChatRoomCreation = [
  body('participants')
    .isArray({ min: 2 })
    .withMessage('At least 2 participants are required'),
  body('participants.*')
    .isMongoId()
    .withMessage('Each participant must be a valid MongoDB ObjectId'),
  body('isGroup')
    .optional()
    .isBoolean()
    .withMessage('isGroup must be a boolean'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  handleValidationErrors
];

// Message creation validation
const validateMessageCreation = [
  body('chatRoom')
    .isMongoId()
    .withMessage('Chat room ID must be a valid MongoDB ObjectId'),
  body('ciphertext')
    .notEmpty()
    .withMessage('Ciphertext is required for E2EE'),
  body('iv')
    .notEmpty()
    .withMessage('IV is required for AES-GCM encryption'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Message type must be text, image, file, or system'),
  body('fileName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('File name cannot exceed 255 characters'),
  body('fileSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer'),
  body('fileUrl')
    .optional()
    .isURL()
    .withMessage('File URL must be a valid URL'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Reply to message ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'price', '-price', 'title', '-title', 'new', 'old'])
    .withMessage('Sort must be a valid field with optional - prefix, or "new" or "old"'),
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  query('type')
    .optional()
    .isIn(['product'])
    .withMessage('Type must be product'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateUserProfileUpdate,
  validateProductCreation,
  validateProductUpdate,
  validatePaymentOrder,
  validatePaymentVerification,
  validateChatRoomCreation,
  validateMessageCreation,
  validateObjectId,
  validatePagination,
  validateSearch
};
