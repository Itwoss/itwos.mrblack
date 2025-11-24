const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Banner = require('../models/Banner');
const User = require('../models/User');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for banner image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/banners');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  }
});

// ==================== PUBLIC ROUTES ====================

// GET /api/banners - Get all active banners (public)
router.get('/', async (req, res) => {
  try {
    const { rarity, category, minPrice, maxPrice } = req.query;
    
    let query = { isActive: true };
    
    if (rarity) query.rarity = rarity;
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    const banners = await Banner.find(query)
      .sort({ rarity: -1, createdAt: -1 });
    
    res.json({
      success: true,
      banners: banners.map(b => b.getPublicData())
    });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/banners/:id - Get single banner
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    
    res.json({
      success: true,
      banner: banner.getPublicData()
    });
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ==================== USER ROUTES ====================

// GET /api/banners/user/inventory - Get user's banner inventory
router.get('/user/inventory', authenticateToken, requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('bannerInventory.bannerId')
      .populate('equippedBanner');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const inventory = user.bannerInventory
      .filter(item => item.bannerId) // Filter out null banners
      .map(item => ({
        ...item.bannerId.getPublicData(),
        purchasedAt: item.purchasedAt,
        isEquipped: user.equippedBanner && user.equippedBanner._id.toString() === item.bannerId._id.toString()
      }));
    
    res.json({
      success: true,
      inventory,
      equippedBanner: user.equippedBanner ? user.equippedBanner.getPublicData() : null
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/banners/user/purchase/:id/create-order - Create Razorpay order for banner purchase
router.post('/user/purchase/:id/create-order', authenticateToken, requireUser, async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured'
      });
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });

    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    
    if (!banner.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This banner is no longer available'
      });
    }
    
    // Check stock
    if (banner.stock !== -1 && banner.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Banner is out of stock'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if user already owns this banner
    const alreadyOwned = user.bannerInventory.some(
      item => item.bannerId.toString() === banner._id.toString()
    );
    
    if (alreadyOwned) {
      return res.status(400).json({
        success: false,
        message: 'You already own this banner'
      });
    }

    // Create Razorpay order
    const receipt = `banner_${req.params.id.slice(-8)}_${Date.now().toString().slice(-8)}`.substring(0, 40);
    const amount = Math.round(banner.price * 100); // Convert to paise

    const orderData = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: req.user._id.toString(),
        bannerId: banner._id.toString(),
        bannerName: banner.name
      }
    };

    const order = await razorpay.orders.create(orderData);

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Create banner order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/banners/user/purchase/:id/verify - Verify banner purchase payment
router.post('/user/purchase/:id/verify', authenticateToken, requireUser, async (req, res) => {
  try {
    const crypto = require('crypto');
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }

    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check if user already owns this banner
    const alreadyOwned = user.bannerInventory.some(
      item => item.bannerId.toString() === banner._id.toString()
    );
    
    if (alreadyOwned) {
      return res.status(400).json({
        success: false,
        message: 'You already own this banner'
      });
    }

    // Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Skip signature verification in development
    if (!isDevelopment && !isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Check if user had an equipped banner before
    const hadEquippedBanner = !!user.equippedBanner;

    // Add banner to user's inventory
    user.bannerInventory.push({
      bannerId: banner._id,
      purchasedAt: new Date()
    });
    
    // If user has no equipped banner, equip this one automatically
    const wasAutoEquipped = !user.equippedBanner;
    if (!user.equippedBanner) {
      user.equippedBanner = banner._id;
    }
    
    await user.save();
    
    // Update banner purchase count and stock
    banner.purchaseCount += 1;
    if (banner.stock !== -1) {
      banner.stock -= 1;
    }
    await banner.save();
    
    res.json({
      success: true,
      message: 'Banner purchased successfully',
      banner: banner.getPublicData(),
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      wasAutoEquipped: wasAutoEquipped, // Indicates if banner was auto-equipped
      hadEquippedBanner: hadEquippedBanner // Indicates if user had a banner equipped before
    });
  } catch (error) {
    console.error('Verify banner purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/banners/user/equip/:id - Equip a banner
router.post('/user/equip/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check if user owns this banner
    const ownsBanner = user.bannerInventory.some(
      item => item.bannerId.toString() === req.params.id
    );
    
    if (!ownsBanner) {
      return res.status(400).json({
        success: false,
        message: 'You do not own this banner'
      });
    }
    
    user.equippedBanner = req.params.id;
    await user.save();
    
    const banner = await Banner.findById(req.params.id);
    
    res.json({
      success: true,
      message: 'Banner equipped successfully',
      equippedBanner: banner.getPublicData()
    });
  } catch (error) {
    console.error('Equip banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to equip banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/banners/user/unequip - Unequip current banner
router.post('/user/unequip', authenticateToken, requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.equippedBanner = null;
    await user.save();
    
    res.json({
      success: true,
      message: 'Banner unequipped successfully'
    });
  } catch (error) {
    console.error('Unequip banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unequip banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// GET /api/banners/admin/all - Get all banners (including inactive)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const banners = await Banner.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      banners
    });
  } catch (error) {
    console.error('Get all banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/banners/admin/create - Create new banner
router.post('/admin/create', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, rarity, effect, effectColor, category, season, stock } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }
    
    const imageUrl = `/uploads/banners/${req.file.filename}`;
    
    const banner = new Banner({
      name,
      description,
      imageUrl,
      price: parseFloat(price),
      rarity: rarity || 'Common',
      effect: effect || 'none',
      effectColor: effectColor || '#FFD700',
      category: category || 'Default',
      season,
      stock: stock ? parseInt(stock) : -1,
      createdBy: req.user._id
    });
    
    await banner.save();
    
    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner: banner.getPublicData()
    });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/banners/admin/:id - Update banner
router.put('/admin/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, rarity, effect, effectColor, category, season, stock, isActive } = req.body;
    
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    
    // Update fields
    if (name) banner.name = name;
    if (description !== undefined) banner.description = description;
    if (price) banner.price = parseFloat(price);
    if (rarity) banner.rarity = rarity;
    if (effect) banner.effect = effect;
    if (effectColor) banner.effectColor = effectColor;
    if (category) banner.category = category;
    if (season !== undefined) banner.season = season;
    if (stock !== undefined) banner.stock = parseInt(stock);
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
    
    // Update image if provided
    if (req.file) {
      // Delete old image
      if (banner.imageUrl) {
        const oldImagePath = path.join(__dirname, '../..', banner.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      banner.imageUrl = `/uploads/banners/${req.file.filename}`;
    }
    
    await banner.save();
    
    res.json({
      success: true,
      message: 'Banner updated successfully',
      banner: banner.getPublicData()
    });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/banners/admin/:id - Delete banner
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    
    // Delete image file
    if (banner.imageUrl) {
      const imagePath = path.join(__dirname, '../..', banner.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Banner.findByIdAndDelete(req.params.id);
    
    // Remove from all users' inventories and equipped banners
    await User.updateMany(
      { 'bannerInventory.bannerId': req.params.id },
      { $pull: { bannerInventory: { bannerId: req.params.id } } }
    );
    
    await User.updateMany(
      { equippedBanner: req.params.id },
      { $set: { equippedBanner: null } }
    );
    
    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/banners/admin/stats - Get banner statistics
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });
    const totalPurchases = await Banner.aggregate([
      { $group: { _id: null, total: { $sum: '$purchaseCount' } } }
    ]);
    
    const bannersByRarity = await Banner.aggregate([
      { $group: { _id: '$rarity', count: { $sum: 1 } } }
    ]);
    
    const topBanners = await Banner.find()
      .sort({ purchaseCount: -1 })
      .limit(5)
      .select('name purchaseCount rarity imageUrl');
    
    res.json({
      success: true,
      stats: {
        totalBanners,
        activeBanners,
        totalPurchases: totalPurchases[0]?.total || 0,
        bannersByRarity,
        topBanners
      }
    });
  } catch (error) {
    console.error('Get banner stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

