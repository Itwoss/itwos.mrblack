const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Notification = require('../models/Notification');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/itwos-ai');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Purchase.deleteMany({});
    await Notification.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@itwos.ai',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'admin',
      publicKey: 'admin-public-key-123',
      isEmailVerified: true,
      bio: 'System Administrator'
    });

    await adminUser.save();
    console.log('👤 Created admin user: admin@itwos.ai / admin123');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Create demo users
const createDemoUsers = async () => {
  try {
    const users = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        publicKey: 'john-public-key-123',
        isEmailVerified: true,
        bio: 'Software Developer'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        publicKey: 'jane-public-key-123',
        isEmailVerified: true,
        bio: 'UI/UX Designer'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        publicKey: 'mike-public-key-123',
        isEmailVerified: true,
        bio: 'Product Manager'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }

    console.log(`👥 Created ${createdUsers.length} demo users`);
    return createdUsers;
  } catch (error) {
    console.error('Error creating demo users:', error);
  }
};

// Create sample products (only with prebook amounts, no demo products)
const createSampleProducts = async () => {
  try {
    const sampleProducts = [
      {
        title: 'AI Task Manager Pro',
        slug: 'ai-task-manager-pro',
        websiteUrl: 'https://aitaskmanager.example.com',
        websiteTitle: 'AI Task Manager Pro - Intelligent Task Management',
        websiteLink: 'https://aitaskmanager.example.com',
        thumbnailUrl: 'https://via.placeholder.com/400x300/1890ff/ffffff?text=AI+Task+Manager',
        descriptionManual: 'Advanced AI-powered task management system with intelligent scheduling and priority optimization.',
        category: 'AI Tools',
        prebookAmount: 99.99,
        currency: 'USD',
        status: 'published',
        trending: true,
        stock: 50,
        images: ['https://via.placeholder.com/400x300/1890ff/ffffff?text=AI+Task+Manager'],
        features: ['AI Scheduling', 'Priority Optimization', 'Team Collaboration'],
        tags: ['AI', 'Productivity', 'Management']
      },
      {
        title: 'Smart Analytics Dashboard',
        slug: 'smart-analytics-dashboard',
        websiteUrl: 'https://analytics.example.com',
        websiteTitle: 'Smart Analytics Dashboard - Real-time Data Visualization',
        websiteLink: 'https://analytics.example.com',
        thumbnailUrl: 'https://via.placeholder.com/400x300/52c41a/ffffff?text=Analytics+Dashboard',
        descriptionManual: 'Comprehensive analytics dashboard with real-time data visualization and predictive insights.',
        category: 'Analytics',
        prebookAmount: 149.99,
        currency: 'USD',
        status: 'published',
        trending: true,
        stock: 25,
        images: ['https://via.placeholder.com/400x300/52c41a/ffffff?text=Analytics+Dashboard'],
        features: ['Real-time Data', 'Predictive Analytics', 'Custom Reports'],
        tags: ['Analytics', 'Dashboard', 'Data Visualization']
      },
      {
        title: 'AI Content Generator',
        slug: 'ai-content-generator',
        websiteUrl: 'https://contentgen.example.com',
        websiteTitle: 'AI Content Generator - Advanced Content Creation',
        websiteLink: 'https://contentgen.example.com',
        thumbnailUrl: 'https://via.placeholder.com/400x300/fa8c16/ffffff?text=Content+Generator',
        descriptionManual: 'Advanced AI content generation tool for blogs, articles, and marketing materials.',
        category: 'Content Creation',
        prebookAmount: 199.99,
        currency: 'USD',
        status: 'published',
        trending: false,
        stock: 15,
        images: ['https://via.placeholder.com/400x300/fa8c16/ffffff?text=Content+Generator'],
        features: ['AI Writing', 'SEO Optimization', 'Multi-language Support'],
        tags: ['AI', 'Content', 'Writing']
      }
    ];

    const products = await Product.insertMany(sampleProducts);
    console.log(`📦 Created ${products.length} sample products`);
    return products;
  } catch (error) {
    console.error('Error creating sample products:', error);
    return [];
  }
};

// Create sample notifications
const createSampleNotifications = async (users) => {
  try {
    if (!users || users.length === 0) return;

    const notifications = [
      {
        userId: users[0]._id,
        type: 'system_announcement',
        title: 'Welcome to ITWOS AI!',
        message: 'Welcome to our platform. Explore our amazing products and start your journey.',
        read: false,
        priority: 'normal'
      },
      {
        userId: users[0]._id,
        type: 'product_published',
        title: 'New Product Available',
        message: 'Check out our latest AI-powered task manager!',
        read: false,
        priority: 'normal'
      }
    ];

    for (const notificationData of notifications) {
      const notification = new Notification(notificationData);
      await notification.save();
    }

    console.log(`🔔 Created ${notifications.length} sample notifications`);
  } catch (error) {
    console.error('Error creating sample notifications:', error);
  }
};

// Create sample orders
const createSampleOrders = async (users, products) => {
  try {
    if (!users || users.length === 0 || !products || products.length === 0) {
      console.log('📦 No sample orders created - need users and products first');
      return [];
    }

    const sampleOrders = [
      {
        buyer: users[0]._id,
        product: products[0]._id,
        razorpayOrderId: 'order_' + Date.now() + '_1',
        amount: 99.99,
        currency: 'USD',
        status: 'paid',
        paymentMethod: 'card',
        razorpaySignature: 'signature_' + Date.now() + '_1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        buyer: users[1]._id,
        product: products[1]._id,
        razorpayOrderId: 'order_' + Date.now() + '_2',
        amount: 149.99,
        currency: 'USD',
        status: 'paid',
        paymentMethod: 'card',
        razorpaySignature: 'signature_' + Date.now() + '_2',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        buyer: users[2]._id,
        product: products[0]._id,
        razorpayOrderId: 'order_' + Date.now() + '_3',
        amount: 199.99,
        currency: 'USD',
        status: 'created',
        paymentMethod: 'card',
        createdAt: new Date() // today
      },
      {
        buyer: users[0]._id,
        product: products[1]._id,
        razorpayOrderId: 'order_' + Date.now() + '_4',
        amount: 79.99,
        currency: 'USD',
        status: 'paid',
        paymentMethod: 'upi',
        razorpaySignature: 'signature_' + Date.now() + '_4',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        buyer: users[1]._id,
        product: products[0]._id,
        razorpayOrderId: 'order_' + Date.now() + '_5',
        amount: 299.99,
        currency: 'USD',
        status: 'cancelled',
        paymentMethod: 'card',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    ];

    const orders = await Purchase.insertMany(sampleOrders);
    console.log(`🛒 Created ${orders.length} sample orders`);
    return orders;
  } catch (error) {
    console.error('Error creating sample orders:', error);
    return [];
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const adminUser = await createAdminUser();
    const demoUsers = await createDemoUsers();
    const products = await createSampleProducts();
    const orders = await createSampleOrders([adminUser, ...demoUsers], products);
    await createSampleNotifications([adminUser, ...demoUsers]);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@itwos.ai / admin123');
    console.log('- Demo users: john@example.com, jane@example.com, mike@example.com (password: password123)');
    console.log(`- Products: ${products.length} sample products created`);
    console.log(`- Orders: ${orders.length} sample orders created`);
    console.log('- Notifications: Sample notifications created');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
