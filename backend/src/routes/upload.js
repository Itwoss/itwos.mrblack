const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireUser } = require('../middleware/auth');
const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Configure multer for image uploads (chat messages)
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageUpload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Configure multer for audio uploads (chat messages)
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/audio');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for audio
  },
  fileFilter: function (req, file, cb) {
    // Accept all audio MIME types
    const isValidMimeType = file.mimetype.startsWith('audio/');
    // Also check file extension as fallback (some browsers may not set MIME type correctly)
    const isValidExtension = /\.(wav|wave|mp3|ogg|webm|m4a|aac|flac)$/i.test(file.originalname);
    
    if (isValidMimeType || isValidExtension) {
      cb(null, true);
    } else {
      console.error('❌ Invalid audio file:', {
        mimetype: file.mimetype,
        originalname: file.originalname
      });
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Test route to verify upload router is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Upload router is working',
    routes: ['/avatar', '/image', '/audio']
  });
});

// Avatar upload endpoint - requires authentication
router.post('/avatar', authenticateToken, requireUser, upload.single('avatar'), (req, res) => {
  try {
    console.log('📤 Avatar upload request received:', {
      userId: req.user?._id,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    console.log('✅ Avatar uploaded successfully:', {
      filename: req.file.filename,
      url: avatarUrl,
      userId: req.user?._id
    });
    
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      url: avatarUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Image upload endpoint for chat messages - requires authentication
router.post('/image', authenticateToken, requireUser, imageUpload.single('image'), (req, res) => {
  try {
    console.log('📤 Image upload request received:', {
      userId: req.user?._id,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    console.log('✅ Image uploaded successfully:', {
      filename: req.file.filename,
      url: imageUrl,
      userId: req.user?._id
    });
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: imageUrl,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Audio upload endpoint for chat messages - requires authentication
router.post('/audio', authenticateToken, requireUser, audioUpload.single('audio'), (req, res) => {
  try {
    console.log('📤 Audio upload request received:', {
      userId: req.user?._id,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      title: req.body.title,
      note: req.body.note
    });

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;
    
    console.log('✅ Audio uploaded successfully:', {
      filename: req.file.filename,
      url: audioUrl,
      userId: req.user?._id
    });
    
    res.json({
      success: true,
      message: 'Audio uploaded successfully',
      url: audioUrl,
      data: {
        url: audioUrl,
        filename: req.file.filename,
        size: req.file.size,
        title: req.body.title || null,
        note: req.body.note || null
      }
    });
  } catch (error) {
    console.error('❌ Audio upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error);
    console.error('❌ Multer error details:', {
      code: error.code,
      field: error.field,
      message: error.message,
      route: req.path
    });
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSize = req.path.includes('/audio') ? '10MB' : '5MB';
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${maxSize}.`
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field name'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload error'
    });
  }
  
  if (error) {
    console.error('❌ Upload route error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      route: req.path
    });
    
    // Handle file filter errors
    if (error.message && error.message.includes('Only audio files') || error.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
  
  next();
});

module.exports = router;
