const express = require('express')
const Product = require('../models/Product')
const router = express.Router()

// Get product by ID from database
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id
    
    // Validate MongoDB ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      })
    }
    
    const product = await Product.findById(productId)
    
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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

module.exports = router