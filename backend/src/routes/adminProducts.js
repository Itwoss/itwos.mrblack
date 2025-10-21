const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cheerio = require('cheerio')
const axios = require('axios')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const Product = require('../models/Product')

const router = express.Router()

console.log('🔍 AdminProducts router loaded')

// Test route without authentication
router.get('/test', async (req, res) => {
  try {
    console.log('🔍 Admin products test route called')
    res.json({
      success: true,
      message: 'Test route working',
      data: {
        products: [
          { _id: 'test-1', title: 'Test Product 1' }
        ]
      }
    })
  } catch (error) {
    console.error('Test route error:', error)
    res.status(500).json({
      success: false,
      message: 'Test route failed',
      error: error.message
    })
  }
})

// Get all products (admin view)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin products API called')
    console.log('User:', req.user)
    console.log('Query params:', req.query)
    
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      q,
      status,
      trending,
      category
    } = req.query

    // Build query
    const query = {}

    // Search query
    if (q && q.trim() !== '') {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { descriptionAuto: { $regex: q, $options: 'i' } },
        { descriptionManual: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }

    // Filters
    if (status) query.status = status
    if (trending !== undefined) query.trending = trending === 'true'
    if (category) query.categories = { $in: [category] }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20))
    
    const skip = (pageNum - 1) * limitNum
    console.log('🔍 Database query:', { query, sort, limitNum, skip })
    
    const products = await Product.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip(skip)

    console.log('🔍 Products found:', products.length)

    const total = await Product.countDocuments(query)
    console.log('🔍 Total products:', total)

    res.json({
      success: true,
      data: {
        products: products.map(product => {
          try {
            return product.getPublicData()
          } catch (error) {
            console.error('Error getting public data for product:', product._id, error)
            // Return basic product data if getPublicData fails
            return {
              _id: product._id,
              title: product.title || 'Untitled',
              slug: product.slug || '',
              status: product.status || 'draft',
              createdAt: product.createdAt,
              updatedAt: product.updatedAt
            }
          }
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('Get admin products error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products')
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// Create new product
router.post('/', authenticateToken, requireAdmin, upload.single('thumbnail'), async (req, res) => {
  try {
    const {
      title,
      websiteUrl,
      websiteTitle,
      websiteLink,
      descriptionAuto,
      descriptionManual,
      price,
      currency,
      trending,
      tags,
      categories,
      developerName,
      techStack,
      previewSaved,
      status,
      meta
    } = req.body

    // Fix status field - ensure it's a single string, not an array
    let statusValue = status
    if (Array.isArray(status)) {
      statusValue = status[0] // Take the first value if it's an array
    }
    if (!statusValue || typeof statusValue !== 'string') {
      statusValue = 'draft' // Default to draft if invalid
    }

    // Fix other fields that might be arrays
    let priceValue = price
    if (Array.isArray(price)) {
      priceValue = price[0]
    }
    if (!priceValue || isNaN(parseFloat(priceValue))) {
      priceValue = 0
    }

    let currencyValue = currency
    if (Array.isArray(currency)) {
      currencyValue = currency[0]
    }
    if (!currencyValue || typeof currencyValue !== 'string') {
      currencyValue = 'USD'
    }

    // Generate slug from title
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading and trailing dashes

    // Ensure slug is not empty
    if (!slug) {
      slug = 'product-' + Date.now()
    }

    // Check if slug already exists
    const existingProduct = await Product.findOne({ slug })
    if (existingProduct) {
      // Add timestamp to make slug unique
      slug = slug + '-' + Date.now()
    }

    // Validate required fields for preview save
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required'
      })
    }
    
    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required'
      })
    }

    // For preview save, we can allow missing price and developerName
    // but we need to provide defaults
    const productData = {
      title,
      slug,
      websiteUrl,
      websiteTitle: websiteTitle || '',
      websiteLink: websiteLink || '',
      descriptionAuto: descriptionAuto || '',
      descriptionManual: descriptionManual || '',
      price: parseFloat(priceValue), // Use fixed price value
      currency: currencyValue,
      trending: trending === 'true',
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      categories: categories ? (typeof categories === 'string' ? JSON.parse(categories) : categories) : [],
      developerName: developerName || 'TBD', // Default for preview
      techStack: techStack ? (typeof techStack === 'string' ? JSON.parse(techStack) : techStack) : [],
      previewSaved: previewSaved === 'true',
      status: statusValue,
      meta: meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : {}
    }

    // Add thumbnail if uploaded
    console.log('File upload debug:', {
      hasFile: !!req.file,
      file: req.file,
      body: req.body
    })
    
    if (req.file) {
      productData.thumbnailUrl = `/uploads/products/${req.file.filename}`
      console.log('Thumbnail URL set:', productData.thumbnailUrl)
    } else {
      console.log('No file uploaded')
    }

    const product = new Product(productData)
    await product.save()

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    })
  } catch (error) {
    console.error('Error creating product:', error)
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      })
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this title already exists'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Update product
router.put('/:id', authenticateToken, requireAdmin, upload.single('thumbnail'), async (req, res) => {
  try {
    const productId = req.params.id
    const updateData = { ...req.body }

    // Fix array fields that might be sent as arrays
    if (updateData.status && Array.isArray(updateData.status)) {
      updateData.status = updateData.status[0]
    }
    if (updateData.price && Array.isArray(updateData.price)) {
      updateData.price = parseFloat(updateData.price[0])
    }
    if (updateData.currency && Array.isArray(updateData.currency)) {
      updateData.currency = updateData.currency[0]
    }

    // Parse JSON fields safely
    if (updateData.tags) {
      updateData.tags = typeof updateData.tags === 'string' ? JSON.parse(updateData.tags) : updateData.tags
    }
    if (updateData.categories) {
      updateData.categories = typeof updateData.categories === 'string' ? JSON.parse(updateData.categories) : updateData.categories
    }
    if (updateData.techStack) {
      updateData.techStack = typeof updateData.techStack === 'string' ? JSON.parse(updateData.techStack) : updateData.techStack
    }
    if (updateData.meta) {
      updateData.meta = typeof updateData.meta === 'string' ? JSON.parse(updateData.meta) : updateData.meta
    }
    if (updateData.trending) updateData.trending = updateData.trending === 'true'
    if (updateData.previewSaved) updateData.previewSaved = updateData.previewSaved === 'true'
    if (updateData.price && !Array.isArray(updateData.price)) updateData.price = parseFloat(updateData.price)

    // Add thumbnail if uploaded
    if (req.file) {
      updateData.thumbnailUrl = `/uploads/products/${req.file.filename}`
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    })
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    })
  }
})

// Duplicate route removed - using the first one above

// Get single product (admin)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    res.json({
      success: true,
      data: product
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

// Delete product
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    })
  }
})

// Generate description from website
router.post('/generate-description', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { websiteUrl } = req.body

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required'
      })
    }

    // Rate limiting removed as requested

    // Validate URL format
    try {
      new URL(websiteUrl)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      })
    }

    // Fetch website content
    const response = await axios.get(websiteUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5
    })

    const $ = cheerio.load(response.data)
    
    // Extract title
    const websiteTitle = $('title').text().trim() || 
                        $('h1').first().text().trim() || 
                        'Untitled'

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || ''

    // Extract main content
    const paragraphs = []
    $('p').each((i, el) => {
      const text = $(el).text().trim()
      if (text.length > 50) {
        paragraphs.push(text)
      }
    })

    // Extract headings
    const headings = []
    $('h1, h2, h3').each((i, el) => {
      const text = $(el).text().trim()
      if (text.length > 0) {
        headings.push(text)
      }
    })

    // Generate short description (first paragraph or meta description)
    const shortDescription = metaDescription || paragraphs[0] || 'No description available'

    // Generate long description (combine paragraphs)
    const longDescription = paragraphs.slice(0, 3).join(' ')

    res.json({
      success: true,
      data: {
        websiteTitle,
        descriptionAuto: longDescription || shortDescription,
        shortDescription,
        longDescription,
        headings: headings.slice(0, 5),
        paragraphs: paragraphs.slice(0, 3)
      }
    })
  } catch (error) {
    console.error('Error generating description:', error)
    
    let errorMessage = 'Failed to generate description'
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Website not found. Please check the URL.'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The website may be down.'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout. The website took too long to respond.'
    } else if (error.response?.status === 403) {
      errorMessage = 'Access forbidden. The website blocked our request.'
    } else if (error.response?.status === 404) {
      errorMessage = 'Website not found (404). Please check the URL.'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Website server error. Please try again later.'
    } else if (error.message.includes('Invalid URL')) {
      errorMessage = 'Invalid URL format. Please enter a valid website URL.'
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    })
  }
})

// Publish product with notifications
router.post('/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { notifyUsers = true, notifyAdmins = true } = req.body

    // Find the product
    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    // Update product status to published
    product.status = 'published'
    product.publishedAt = new Date()
    await product.save()

    // Send notifications if requested
    if (notifyUsers || notifyAdmins) {
      try {
        // Import notification service
        const { sendNotification } = require('../services/notificationService')
        
        const notificationData = {
          type: 'product_published',
          title: 'New Product Published',
          message: `A new product "${product.title}" has been published and is now available.`,
          productId: product._id,
          productTitle: product.title,
          productSlug: product.slug,
          publishedBy: req.user._id || req.user.id,
          publishedAt: product.publishedAt
        }

        if (notifyUsers) {
          // Send notification to all users
          await sendNotification({
            ...notificationData,
            targetType: 'all_users',
            priority: 'normal'
          })
        }

        if (notifyAdmins) {
          // Send notification to all admins
          await sendNotification({
            ...notificationData,
            targetType: 'all_admins',
            priority: 'normal'
          })
        }

        console.log(`Notifications sent for product publication: ${product.title}`)
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the publish operation if notifications fail
      }
    }

    res.json({
      success: true,
      message: 'Product published successfully',
      data: {
        product: product.getPublicData(),
        notificationsSent: notifyUsers || notifyAdmins
      }
    })
  } catch (error) {
    console.error('Error publishing product:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to publish product',
      error: error.message
    })
  }
})

module.exports = router
