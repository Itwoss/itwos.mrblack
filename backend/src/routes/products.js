const express = require('express')
const mongoose = require('mongoose')
const Product = require('../models/Product')
const PrebookRequest = require('../models/PrebookRequest')
const Notification = require('../models/Notification')
const User = require('../models/User')
const { optionalAuth } = require('../middleware/auth')
const { getPublishedProducts, getTrendingProducts } = require('../data/mockProducts')
const { sendPrebookConfirmationEmail, sendPrebookAdminNotificationEmail } = require('../services/mailjet')

const router = express.Router()

// Test notification endpoint for development
router.post('/test-notification', async (req, res) => {
  try {
    const { userId, type = 'test', title, message } = req.body
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      })
    }

    const notification = new Notification({
      userId: userId,
      type: type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification to verify the system is working.',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    })

    await notification.save()

    res.json({
      success: true,
      message: 'Test notification created successfully',
      data: {
        notification: notification
      }
    })
  } catch (error) {
    console.error('Error creating test notification:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    })
  }
})

// Get all published products
router.get('/', async (req, res) => {
  try {
    console.log('Products API called with query:', req.query)
    
    // Check if MongoDB is connected and has data
    const mongoose = require('mongoose')
    const isMongoConnected = mongoose.connection.readyState === 1
    
    // Use mock data if MongoDB is not connected
    if (!isMongoConnected) {
      console.log('⚠️  MongoDB not connected, returning mock products')
      
      // Get products from shared mock data store
      const mockProducts = getPublishedProducts()
      
      const { 
        page = 1, 
        limit = 12, 
        trending, 
        category, 
        tag, 
        search
      } = req.query
      
      let filteredProducts = mockProducts.filter(p => p.status === 'published')
      
      // Apply filters
      if (trending === 'true') {
        filteredProducts = filteredProducts.filter(p => p.trending)
      }
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.categories.includes(category))
      }
      if (tag) {
        filteredProducts = filteredProducts.filter(p => p.tags.includes(tag))
      }
      if (search) {
        const searchTerm = search.toLowerCase()
        filteredProducts = filteredProducts.filter(p => 
          p.title.toLowerCase().includes(searchTerm) ||
          p.descriptionAuto.toLowerCase().includes(searchTerm) ||
          p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }
      
      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12))
      const skip = (pageNum - 1) * limitNum
      
      const paginatedProducts = filteredProducts.slice(skip, skip + limitNum)
      const total = filteredProducts.length
      
      return res.json({
        success: true,
        data: {
          products: paginatedProducts,
          pagination: {
            current: pageNum,
            pages: Math.ceil(total / limitNum),
            total: total
          }
        }
      })
    }
    
    const { 
      page = 1, 
      limit = 12, 
      trending, 
      category, 
      tag, 
      search,
      sort = 'newest'
    } = req.query

    const skip = (page - 1) * limit
    const filters = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      trending: trending === 'true',
      category,
      tag,
      search
    }

    console.log('Products filters:', filters)

    let sortOptions = { createdAt: -1 }
    if (sort === 'trending') {
      sortOptions = { trending: -1, createdAt: -1 }
    } else if (sort === 'price-low') {
      sortOptions = { price: 1 }
    } else if (sort === 'price-high') {
      sortOptions = { price: -1 }
    } else if (sort === 'rating') {
      sortOptions = { 'reviews.rating': -1, createdAt: -1 }
    }

    console.log('Products sort options:', sortOptions)

    const products = await Product.findForUser(filters)
      .sort(sortOptions)
      .populate('reviews.userId', 'name email')

    console.log('Products found:', products.length)

    const total = await Product.countDocuments({ status: 'published' })
    
    console.log('Total products:', total)

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Get trending products
router.get('/trending', async (req, res) => {
  try {
    const { limit = 6 } = req.query

    // Use shared mock data store for trending products
    const products = getTrendingProducts().slice(0, parseInt(limit))

    res.json({
      success: true,
      data: { products }
    })
  } catch (error) {
    console.error('Error fetching trending products:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending products',
      error: error.message
    })
  }
})

// Get product by slug
router.get('/:slug', async (req, res) => {
  try {
    console.log('🔍 Fetching product by slug:', req.params.slug)
    
    // Check if MongoDB is connected and has data
    const mongoose = require('mongoose')
    const isMongoConnected = mongoose.connection.readyState === 1
    
    // Use mock data if MongoDB is not connected
    if (!isMongoConnected) {
      console.log('⚠️  Using mock data for product fetch')
      
      // Get products from shared mock data store
      const mockProducts = getPublishedProducts()
      const product = mockProducts.find(p => p.slug === req.params.slug && p.status === 'published')
      
      if (!product) {
        console.log('❌ Product not found in mock data:', req.params.slug)
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        })
      }
      
      console.log('✅ Product found in mock data:', product.title)
      return res.json({
        success: true,
        data: { product }
      })
    }
    
    // Database query (fallback)
    const product = await Product.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    }).populate('reviews.userId', 'name email')

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    res.json({
      success: true,
      data: { product }
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    })
  }
})

// Track product visit
router.post('/:id/visit', async (req, res) => {
  try {
    const productId = req.params.id
    const { ip, userAgent, referrer } = req.body

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    // Add visit record
    product.visitsLast30Days.push({
      date: new Date(),
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent'),
      referrer: referrer || req.get('Referer')
    })

    // Keep only last 30 days of visits
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    product.visitsLast30Days = product.visitsLast30Days.filter(
      visit => visit.date > thirtyDaysAgo
    )

    await product.save()

    res.json({
      success: true,
      message: 'Visit tracked successfully'
    })
  } catch (error) {
    console.error('Error tracking visit:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to track visit',
      error: error.message
    })
  }
})

// Get product analytics
router.get('/:id/analytics/30d', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const visits = product.visitsLast30Days.filter(
      visit => visit.date > thirtyDaysAgo
    )

    // Group visits by day
    const visitsByDay = {}
    visits.forEach(visit => {
      const date = visit.date.toISOString().split('T')[0]
      visitsByDay[date] = (visitsByDay[date] || 0) + 1
    })

    res.json({
      success: true,
      data: {
        totalVisits: visits.length,
        visitsByDay,
        averageRating: product.averageRating,
        reviewsCount: product.reviewsCount
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    })
  }
})

// Create prebook request
router.post('/:id/prebook', optionalAuth, async (req, res) => {
  try {
    const productId = req.params.id
    const {
      projectType,
      budget,
      timeline,
      features,
      notes,
      contactInfo
    } = req.body

    // Validate required fields
    if (!projectType || !budget || !timeline || !contactInfo?.name || !contactInfo?.email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    // Check if product exists (handle both database and mock products)
    let product = null
    
    // First try to find in database
    try {
      product = await Product.findById(productId)
    } catch (error) {
      console.log('⚠️ Product ID is not a valid MongoDB ObjectId, checking mock data')
    }
    
    // If not found in database, check mock data
    if (!product) {
      const mockProducts = getPublishedProducts()
      product = mockProducts.find(p => p._id === productId)
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }
    
    console.log('✅ Product found:', product.title)

    // Handle mock product IDs by using a placeholder ObjectId
    let finalProductId = productId
    if (productId.startsWith('mock-')) {
      // Use a placeholder ObjectId for mock products
      finalProductId = new mongoose.Types.ObjectId()
      console.log('🔄 Using placeholder ObjectId for mock product:', finalProductId)
    }

    const prebookData = {
      productId: finalProductId,
      userId: req.user?.id || null,
      projectType,
      budget,
      timeline: parseInt(timeline),
      features: features || [],
      notes: notes || '',
      contactInfo: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone || '',
        company: contactInfo.company || ''
      }
    }

    const prebookRequest = new PrebookRequest(prebookData)
    await prebookRequest.save()

    // Populate product data for response
    await prebookRequest.populate('productId', 'title slug')

    // Send email notifications
    try {
      // Send confirmation email to user
      await sendPrebookConfirmationEmail(
        contactInfo.email,
        contactInfo.name,
        product.title
      )

      // Send notification email to admin
      const adminUsers = await User.find({ role: 'admin' }).select('email')
      
      // Always send to specific admin email
      const adminEmails = ['sjay9327@gmail.com']
      
      // Add any admin users from database
      adminUsers.forEach(admin => {
        if (!adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email)
        }
      })
      
      for (const adminEmail of adminEmails) {
        await sendPrebookAdminNotificationEmail(
          adminEmail,
          contactInfo.name,
          contactInfo.email,
          product.title,
          {
            projectType,
            budget,
            timeline,
            features: features || [],
            notes: notes || ''
          }
        )
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError)
      // Don't fail the request if email fails
    }

    // Create database notifications
    try {
      // Create notification for user (if logged in)
      if (req.user?.id) {
        const userNotification = new Notification({
          userId: req.user._id || req.user.id,
          type: 'general',
          title: 'Prebook Request Submitted',
          message: `Your prebook request for "${product.title}" has been submitted successfully.`,
          read: false
        })
        await userNotification.save()
        console.log('✅ User notification created:', userNotification._id)
      }

      // Create notifications for all admins
      const adminUsers = await User.find({ role: 'admin' }).select('_id')
      console.log('👥 Found admin users:', adminUsers.length)
      
      if (adminUsers.length > 0) {
        for (const admin of adminUsers) {
          const adminNotification = new Notification({
            userId: admin._id,
            type: 'general',
            title: 'New Prebook Request',
            message: `New prebook request from ${contactInfo.name} for "${product.title}".`,
            read: false
          })
          await adminNotification.save()
          console.log('✅ Admin notification created:', adminNotification._id)
        }
      } else {
        console.log('⚠️ No admin users found in database, email notifications still sent')
      }
    } catch (notificationError) {
      console.error('Database notification error:', notificationError)
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Prebook request submitted successfully',
      data: prebookRequest
    })
  } catch (error) {
    console.error('Error creating prebook request:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit prebook request',
      error: error.message
    })
  }
})

// Get user notifications
router.get('/notifications', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query
    const skip = (page - 1) * limit

    let query = { userId: req.user._id || req.user.id }
    if (unreadOnly === 'true') {
      query.read = false
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id || req.user.id, 
      read: false 
    })

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: notifications.length,
          totalCount: total
        },
        unreadCount
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    })
  }
})

// Mark notification as read
router.patch('/notifications/:id/read', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    )

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    })
  }
})

// Mark all notifications as read
router.patch('/notifications/read-all', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    )

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: { modifiedCount: result.modifiedCount }
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    })
  }
})

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('categories', { status: 'published' })
    res.json({
      success: true,
      data: { categories }
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    })
  }
})

// Get tags
router.get('/tags/list', async (req, res) => {
  try {
    const tags = await Product.distinct('tags', { status: 'published' })
    res.json({
      success: true,
      data: { tags }
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    })
  }
})

// Create new product (public - mock)
router.post('/', async (req, res) => {
  try {
    console.log('🔍 Public create product API called')
    console.log('Product data:', req.body)
    
    const {
      title,
      websiteUrl,
      description,
      price,
      currency,
      tags,
      categories,
      developerName,
      techStack
    } = req.body

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')

    // Create mock product
    const newProduct = {
      _id: `public-${Date.now()}`,
      title: title || 'New Public Product',
      slug: slug || 'new-public-product',
      websiteUrl: websiteUrl || 'https://example.com',
      websiteTitle: 'Public Website',
      descriptionAuto: description || 'Public product description',
      descriptionManual: description || 'Public product description',
      price: price ? parseFloat(price) : 0,
      currency: currency || 'USD',
      trending: false,
      tags: tags || [],
      categories: categories || [],
      developerName: developerName || 'Public Developer',
      techStack: techStack || [],
      status: 'published',
      previewSaved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('🔍 Mock public product created:', newProduct.title)

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    })
  } catch (error) {
    console.error('Mock create public product error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    })
  }
})

module.exports = router

