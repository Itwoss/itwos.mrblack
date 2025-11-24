const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth')
const PrebookRequest = require('../models/PrebookRequest')
const Product = require('../models/Product')

const router = express.Router()

// Get all prebook requests (admin only) - Simple version
router.get('/admin/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query
    const skip = (page - 1) * limit

    let query = {}
    if (status) query.status = status
    if (search) {
      query.$or = [
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ]
    }

    const prebooks = await PrebookRequest.find(query)
      .populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await PrebookRequest.countDocuments(query)

    // Get statistics
    const stats = await PrebookRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    res.json({
      success: true,
      data: {
        prebooks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error('Error fetching admin prebooks:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebook requests',
      error: error.message
    })
  }
})

// Update prebook request status (admin only)
router.put('/admin/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes, estimatedPrice, estimatedTimeline } = req.body

    const prebook = await PrebookRequest.findByIdAndUpdate(
      id,
      { 
        status, 
        adminNotes, 
        estimatedPrice, 
        estimatedTimeline,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
     .populate('userId', 'name email')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    res.json({
      success: true,
      message: 'Prebook request updated successfully',
      data: prebook
    })
  } catch (error) {
    console.error('Error updating prebook status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update prebook request',
      error: error.message
    })
  }
})

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/prebook')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'), false)
    }
  }
})

// Create new prebook request
router.post('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { productId, projectType, budget, timeline, features, notes, contactInfo } = req.body
    const userId = req.user._id || req.user.id

    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      })
    }

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    // Create prebook request
    const prebookRequest = new PrebookRequest({
      userId,
      productId,
      projectType: projectType || 'custom',
      budget: budget || 0,
      timeline: timeline || 'flexible',
      features: features || [],
      notes: notes || '',
      contactInfo: contactInfo || {},
      status: 'pending'
    })

    await prebookRequest.save()

    // Populate the response
    await prebookRequest.populate('productId', 'title slug thumbnailUrl price prebookAmount currency')

    // Create notification for admin
    try {
      const Notification = require('../models/Notification')
      const adminUsers = await require('../models/User').find({ role: 'admin' })
      
      for (const admin of adminUsers) {
        const notification = new Notification({
          userId: admin._id,
          type: 'prebook_request',
          title: 'New Prebook Request',
          message: `New prebook request for ${product.title} from ${req.user.name || 'User'}`,
          data: {
            prebookId: prebookRequest._id,
            productId: product._id,
            requesterId: userId
          }
        })
        await notification.save()
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      data: prebookRequest,
      message: 'Prebook request created successfully'
    })
  } catch (error) {
    console.error('Error creating prebook request:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create prebook request',
      error: error.message
    })
  }
})

// Get user's prebook requests
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const skip = (page - 1) * limit

    // If user is admin, show all prebooks; otherwise show only user's prebooks
    let query = {}
    if (req.user.role === 'admin') {
      // Admin can see all prebooks
      if (status) query.status = status
    } else {
      // Regular user sees only their prebooks
      query = { userId: req.user._id || req.user.id }
      if (status) query.status = status
    }

    const prebooks = await PrebookRequest.find(query)
      .populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await PrebookRequest.countDocuments(query)

    res.json({
      success: true,
      data: {
        prebooks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching prebooks:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebook requests',
      error: error.message
    })
  }
})

// Get single prebook request
router.get('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const prebook = await PrebookRequest.findOne({
      _id: req.params.id,
      userId: req.user._id || req.user.id
    }).populate('productId', 'title slug thumbnailUrl price prebookAmount currency')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    res.json({
      success: true,
      data: prebook
    })
  } catch (error) {
    console.error('Error fetching prebook:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebook request',
      error: error.message
    })
  }
})

// Update prebook request
router.put('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { projectType, budget, timeline, features, notes, contactInfo } = req.body

    const updateData = {}
    if (projectType) updateData.projectType = projectType
    if (budget) updateData.budget = budget
    if (timeline) updateData.timeline = parseInt(timeline)
    if (features) updateData.features = features
    if (notes) updateData.notes = notes
    if (contactInfo) updateData.contactInfo = contactInfo

    const prebook = await PrebookRequest.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    ).populate('productId', 'title slug thumbnailUrl price prebookAmount currency')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    res.json({
      success: true,
      message: 'Prebook request updated successfully',
      data: prebook
    })
  } catch (error) {
    console.error('Error updating prebook:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update prebook request',
      error: error.message
    })
  }
})

// Delete prebook request
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const prebook = await PrebookRequest.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id || req.user.id
    })

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    res.json({
      success: true,
      message: 'Prebook request deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting prebook:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete prebook request',
      error: error.message
    })
  }
})

// Upload attachment
router.post('/:id/upload', authenticateToken, requireUser, upload.single('file'), async (req, res) => {
  try {
    const prebook = await PrebookRequest.findOne({
      _id: req.params.id,
      userId: req.user._id || req.user.id
    })

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date()
    }

    prebook.attachments.push(attachment)
    await prebook.save()

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: attachment
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    })
  }
})

// Admin routes
// Get all prebook requests (admin)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, productId } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (status) query.status = status
    if (productId) query.productId = productId

    const prebooks = await PrebookRequest.find(query)
      .populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await PrebookRequest.countDocuments(query)

    res.json({
      success: true,
      data: {
        prebooks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching all prebooks:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebook requests',
      error: error.message
    })
  }
})

// Update prebook status (admin)
router.put('/admin/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes, estimatedPrice, estimatedTimeline } = req.body

    const updateData = { status }
    if (adminNotes) updateData.adminNotes = adminNotes
    if (estimatedPrice) updateData.estimatedPrice = parseFloat(estimatedPrice)
    if (estimatedTimeline) updateData.estimatedTimeline = parseInt(estimatedTimeline)

    const prebook = await PrebookRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
     .populate('userId', 'name email')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook request not found'
      })
    }

    res.json({
      success: true,
      message: 'Prebook status updated successfully',
      data: prebook
    })
  } catch (error) {
    console.error('Error updating prebook status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update prebook status',
      error: error.message
    })
  }
})

// Get prebook statistics (admin)
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const total = await PrebookRequest.countDocuments()
    const pending = await PrebookRequest.countDocuments({ status: 'pending' })
    const reviewed = await PrebookRequest.countDocuments({ status: 'reviewed' })
    const accepted = await PrebookRequest.countDocuments({ status: 'accepted' })
    const rejected = await PrebookRequest.countDocuments({ status: 'rejected' })
    const completed = await PrebookRequest.countDocuments({ status: 'completed' })

    // Get recent prebooks
    const recent = await PrebookRequest.find()
      .populate('productId', 'title slug thumbnailUrl price prebookAmount currency')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)

    res.json({
      success: true,
      data: {
        stats: {
          total,
          pending,
          reviewed,
          accepted,
          rejected,
          completed
        },
        recent
      }
    })
  } catch (error) {
    console.error('Error fetching prebook stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebook statistics',
      error: error.message
    })
  }
})

// Update prebook status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes } = req.body

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected', 'completed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, reviewed, accepted, rejected, or completed'
      })
    }

    // Find prebook
    const prebook = await PrebookRequest.findById(id)
      .populate('userId', 'name email')
      .populate('productId', 'title slug thumbnailUrl price prebookAmount currency')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook not found'
      })
    }

    // Update status
    prebook.status = status
    if (adminNotes) {
      prebook.adminNotes = adminNotes
    }
    prebook.updatedAt = new Date()
    await prebook.save()

    // Create notification for user
    try {
      const Notification = require('../models/Notification')
      const notification = new Notification({
        userId: prebook.userId._id,
        type: 'prebook_status_update',
        title: `Prebook ${status}`,
        message: `Your prebook request for ${prebook.productId.title} has been ${status}. ${adminNotes ? 'Admin notes: ' + adminNotes : ''}`,
        data: {
          prebookId: prebook._id,
          status: status,
          adminNotes: adminNotes
        }
      })
      await notification.save()
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      data: prebook,
      message: `Prebook ${status} successfully`
    })
  } catch (error) {
    console.error('Error updating prebook status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update prebook status',
      error: error.message
    })
  }
})

module.exports = router


