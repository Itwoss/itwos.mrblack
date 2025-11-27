const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/itwos_ai';

async function createTestUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    console.log('👥 Creating test users...\n');
    
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      const crypto = require('crypto');
      const publicKey = crypto.randomBytes(32).toString('hex'); // Generate public key for E2EE
      
      let user = await User.findOne({ email: `testuser${i}@test.com` });
      
      if (user) {
        // Update existing user
        user.name = `Test User ${i}`;
        user.username = `testuser${i}`;
        user.passwordHash = hashedPassword;
        user.publicKey = publicKey;
        user.isVerified = true;
        user.followersCount = i * 10;
        user.isActive = true;
        await user.save();
      } else {
        // Create new user
        user = new User({
          name: `Test User ${i}`,
          username: `testuser${i}`,
          email: `testuser${i}@test.com`,
          passwordHash: hashedPassword,
          publicKey: publicKey,
          isVerified: true,
          followersCount: i * 10,
          isActive: true,
        });
        await user.save();
      }
      
      users.push(user);
      console.log(`✅ Created/Updated: ${user.name} (${user.email})`);
    }
    
    console.log('\n✅ All test users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   URL: http://localhost:5173/login');
    console.log('   Email: testuser2@test.com');
    console.log('   Password: test123');
    console.log('\n   All users use password: test123');
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUsers();

