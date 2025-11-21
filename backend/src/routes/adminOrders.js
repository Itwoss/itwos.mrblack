const express = require('express')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const Purchase = require('../models/Purchase')
const User = require('../models/User')
const Product = require('../models/Product')

const router = express.Router()

// Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      q,
      status,
      paymentStatus
    } = req.query

    const skip = (page - 1) * limit
    const limitNum = parseInt(limit)

    // Build query
    let query = {}
    
    if (q) {
      query.$or = [
        { razorpayOrderId: { $regex: q, $options: 'i' } },
        { razorpayPaymentId: { $regex: q, $options: 'i' } }
      ]
    }
    
    if (status) {
      query.status = status
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus
    }

    // Get orders with populated user and product data
    const orders = await Purchase.find(query)
      .populate('buyer', 'name email avatarUrl profilePic')
      .populate('product', 'title price thumbnailUrl images')
      .sort(sort)
      .limit(limitNum)
      .skip(skip)
      .lean()

    const total = await Purchase.countDocuments(query)

    res.json({
      success: true,
      data: {
        orders,
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    })
  }
})

// Get order by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const order = await Purchase.findById(req.params.id)
      .populate('buyer', 'name email avatarUrl profilePic')
      .populate('product', 'title price description thumbnailUrl images')
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    })
  }
})

// Update order status
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body
    
    const order = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('buyer', 'name email avatarUrl profilePic')
     .populate('product', 'title price thumbnailUrl images')
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    })
  } catch (error) {
    console.error('Error updating order:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    })
  }
})

// Delete order
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const order = await Purchase.findByIdAndDelete(req.params.id)
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    })
  }
})

module.exports = router
