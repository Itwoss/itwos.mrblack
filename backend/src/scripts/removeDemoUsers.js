const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Purchase = require('../models/Purchase');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');

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

// Remove demo users and their associated data
const removeDemoUsers = async () => {
  try {
    // List of demo user emails to remove
    const demoUserEmails = [
      'john@example.com',
      'jane@example.com',
      'mike@example.com'
    ];

    // Find demo users
    const demoUsers = await User.find({ 
      email: { $in: demoUserEmails } 
    });

    if (demoUsers.length === 0) {
      console.log('✅ No demo users found in database');
      return;
    }

    console.log(`📦 Found ${demoUsers.length} demo user(s) to remove:`);
    demoUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

    const demoUserIds = demoUsers.map(u => u._id);

    // Delete associated data
    console.log('\n🗑️  Removing associated data...');
    
    // Delete chat rooms
    const chatRooms = await ChatRoom.find({
      participants: { $in: demoUserIds }
    });
    const chatRoomIds = chatRooms.map(r => r._id);
    
    if (chatRoomIds.length > 0) {
      await Message.deleteMany({ chatRoom: { $in: chatRoomIds } });
      console.log(`  ✅ Removed messages from ${chatRoomIds.length} chat rooms`);
      
      await ChatRoom.deleteMany({ _id: { $in: chatRoomIds } });
      console.log(`  ✅ Removed ${chatRoomIds.length} chat rooms`);
    }

    // Delete purchases
    const purchases = await Purchase.deleteMany({ buyer: { $in: demoUserIds } });
    console.log(`  ✅ Removed ${purchases.deletedCount} purchase(s)`);

    // Delete notifications
    const notifications = await Notification.deleteMany({ userId: { $in: demoUserIds } });
    console.log(`  ✅ Removed ${notifications.deletedCount} notification(s)`);

    // Delete subscriptions
    const subscriptions = await Subscription.deleteMany({ userId: { $in: demoUserIds } });
    console.log(`  ✅ Removed ${subscriptions.deletedCount} subscription(s)`);

    // Delete demo users
    const result = await User.deleteMany({
      _id: { $in: demoUserIds }
    });

    console.log(`\n✅ Removed ${result.deletedCount} demo user(s) from database`);
    console.log('✅ Demo users and all associated data have been removed');

  } catch (error) {
    console.error('❌ Error removing demo users:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await removeDemoUsers();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { removeDemoUsers };

