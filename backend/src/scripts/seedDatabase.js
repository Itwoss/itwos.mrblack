const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Product = require('../models/Product');
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

// Create sample products
const createSampleProducts = async () => {
  try {
    const products = [
      {
        title: 'AI-Powered Task Manager',
        slug: 'ai-powered-task-manager',
        websiteUrl: 'https://example.com/task-manager',
        websiteTitle: 'TaskMaster Pro',
        websiteLink: 'https://example.com/task-manager',
        thumbnailUrl: '/uploads/products/thumbnail-1760585707225-57191184.JPEG',
        descriptionAuto: 'An intelligent task management application powered by AI to help you organize and prioritize your daily tasks efficiently.',
        descriptionManual: 'Revolutionary task management with AI insights and smart scheduling.',
        price: 29.99,
        currency: 'USD',
        trending: true,
        tags: ['AI', 'Productivity', 'Task Management', 'Automation'],
        categories: ['Productivity', 'AI Tools'],
        developerName: 'TechCorp Solutions',
        techStack: ['React', 'Node.js', 'MongoDB', 'AI/ML'],
        status: 'published',
        meta: {
          title: 'AI Task Manager - Boost Your Productivity',
          description: 'Smart task management with AI-powered insights',
          keywords: ['task management', 'AI', 'productivity', 'automation']
        }
      },
      {
        title: 'E-Commerce Analytics Dashboard',
        slug: 'ecommerce-analytics-dashboard',
        websiteUrl: 'https://example.com/analytics',
        websiteTitle: 'Analytics Pro',
        websiteLink: 'https://example.com/analytics',
        thumbnailUrl: '/uploads/products/thumbnail-1760585714527-177960529.JPEG',
        descriptionAuto: 'Comprehensive analytics dashboard for e-commerce businesses with real-time insights and reporting.',
        descriptionManual: 'Advanced analytics platform for e-commerce success.',
        price: 49.99,
        currency: 'USD',
        trending: false,
        tags: ['Analytics', 'E-commerce', 'Dashboard', 'Business Intelligence'],
        categories: ['Analytics', 'Business Tools'],
        developerName: 'DataViz Inc',
        techStack: ['Vue.js', 'Python', 'PostgreSQL', 'D3.js'],
        status: 'published',
        meta: {
          title: 'E-Commerce Analytics Dashboard',
          description: 'Real-time insights for your online business',
          keywords: ['analytics', 'e-commerce', 'dashboard', 'business intelligence']
        }
      },
      {
        title: 'Social Media Scheduler',
        slug: 'social-media-scheduler',
        websiteUrl: 'https://example.com/scheduler',
        websiteTitle: 'SocialScheduler',
        websiteLink: 'https://example.com/scheduler',
        thumbnailUrl: '/uploads/products/thumbnail-1760585720696-817176932.JPEG',
        descriptionAuto: 'Automate your social media presence with intelligent scheduling and content optimization.',
        descriptionManual: 'Smart social media management made simple.',
        price: 19.99,
        currency: 'USD',
        trending: true,
        tags: ['Social Media', 'Scheduling', 'Marketing', 'Automation'],
        categories: ['Marketing', 'Social Media'],
        developerName: 'SocialTech',
        techStack: ['Angular', 'Express', 'MongoDB', 'Redis'],
        status: 'published',
        meta: {
          title: 'Social Media Scheduler - Automate Your Posts',
          description: 'Schedule and optimize your social media content',
          keywords: ['social media', 'scheduling', 'marketing', 'automation']
        }
      },
      {
        title: 'Code Review Assistant',
        slug: 'code-review-assistant',
        websiteUrl: 'https://example.com/code-review',
        websiteTitle: 'CodeReview Pro',
        websiteLink: 'https://example.com/code-review',
        thumbnailUrl: '/uploads/products/thumbnail-1760585803679-924120959.JPEG',
        descriptionAuto: 'AI-powered code review tool that helps developers improve code quality and catch bugs early.',
        descriptionManual: 'Intelligent code analysis and review automation.',
        price: 39.99,
        currency: 'USD',
        trending: false,
        tags: ['Development', 'Code Review', 'AI', 'Quality Assurance'],
        categories: ['Development Tools', 'AI'],
        developerName: 'DevTools Inc',
        techStack: ['React', 'Python', 'TensorFlow', 'Docker'],
        status: 'published',
        meta: {
          title: 'AI Code Review Assistant',
          description: 'Automated code review with AI insights',
          keywords: ['code review', 'AI', 'development', 'quality assurance']
        }
      },
      {
        title: 'Customer Support Chatbot',
        slug: 'customer-support-chatbot',
        websiteUrl: 'https://example.com/chatbot',
        websiteTitle: 'SupportBot AI',
        websiteLink: 'https://example.com/chatbot',
        thumbnailUrl: '/uploads/products/thumbnail-1760585808384-751002739.JPEG',
        descriptionAuto: 'Intelligent chatbot solution for customer support with natural language processing capabilities.',
        descriptionManual: '24/7 customer support with AI-powered conversations.',
        price: 59.99,
        currency: 'USD',
        trending: true,
        tags: ['Chatbot', 'Customer Support', 'AI', 'Automation'],
        categories: ['Customer Service', 'AI Tools'],
        developerName: 'BotSolutions',
        techStack: ['Node.js', 'OpenAI', 'MongoDB', 'WebSocket'],
        status: 'published',
        meta: {
          title: 'AI Customer Support Chatbot',
          description: 'Intelligent customer support automation',
          keywords: ['chatbot', 'customer support', 'AI', 'automation']
        }
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
    }

    console.log(`📦 Created ${createdProducts.length} sample products`);
    return createdProducts;
  } catch (error) {
    console.error('Error creating sample products:', error);
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

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const adminUser = await createAdminUser();
    const demoUsers = await createDemoUsers();
    const products = await createSampleProducts();
    await createSampleNotifications([adminUser, ...demoUsers]);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@itwos.ai / admin123');
    console.log('- Demo users: john@example.com, jane@example.com, mike@example.com (password: password123)');
    console.log(`- Products: ${products.length} sample products created`);
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
