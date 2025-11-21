const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/itwos-ai', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Remove demo/test products
const removeDemoProducts = async () => {
  try {
    await connectDB();
    
    // List of demo product titles/slugs to remove
    const demoProductTitles = [
      'AI Task Manager Pro',
      'Smart Analytics Dashboard',
      'AI Content Generator'
    ];
    
    const demoProductSlugs = [
      'ai-task-manager-pro',
      'smart-analytics-dashboard',
      'ai-content-generator'
    ];
    
    // Also remove products with example.com or placeholder URLs
    const demoPatterns = [
      /example\.com/i,
      /placeholder/i,
      /via\.placeholder/i
    ];
    
    // Find and delete demo products
    const demoProducts = await Product.find({
      $or: [
        { title: { $in: demoProductTitles } },
        { slug: { $in: demoProductSlugs } },
        { websiteUrl: { $regex: /example\.com/i } },
        { thumbnailUrl: { $regex: /placeholder/i } },
        { images: { $regex: /placeholder/i } }
      ]
    });
    
    if (demoProducts.length === 0) {
      console.log('✅ No demo products found in database');
      return;
    }
    
    console.log(`📦 Found ${demoProducts.length} demo product(s) to remove:`);
    demoProducts.forEach(product => {
      console.log(`  - ${product.title} (${product.slug})`);
    });
    
    // Delete demo products
    const result = await Product.deleteMany({
      _id: { $in: demoProducts.map(p => p._id) }
    });
    
    console.log(`✅ Removed ${result.deletedCount} demo product(s) from database`);
    
  } catch (error) {
    console.error('❌ Error removing demo products:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run if executed directly
if (require.main === module) {
  removeDemoProducts();
}

module.exports = { removeDemoProducts };

