const express = require('express')
const router = express.Router()

// No mock products - only real products from database
const mockProducts = []

// Get product by ID
router.get('/:id', (req, res) => {
  const productId = req.params.id
  const product = mockProducts.find(p => p._id === productId)
  
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
})

module.exports = router