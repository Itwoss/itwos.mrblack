const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

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

// Find deleted Google users (users with googleId but deletedAt set)
const findDeletedGoogleUsers = async () => {
  try {
    // Find users with googleId that have deletedAt set
    const deletedGoogleUsers = await User.find({
      googleId: { $exists: true, $ne: null },
      deletedAt: { $ne: null }
    }).sort({ deletedAt: -1 });

    if (deletedGoogleUsers.length === 0) {
      console.log('✅ No deleted Google users found');
      return [];
    }

    console.log(`\n📦 Found ${deletedGoogleUsers.length} deleted Google user(s):\n`);
    deletedGoogleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Google ID: ${user.googleId}`);
      console.log(`   Deleted At: ${user.deletedAt}`);
      console.log(`   Created At: ${user.createdAt}`);
      console.log(`   Is Active: ${user.isActive}`);
      console.log('');
    });

    return deletedGoogleUsers;
  } catch (error) {
    console.error('❌ Error finding deleted Google users:', error);
    throw error;
  }
};

// Restore deleted Google user
const restoreGoogleUser = async (googleId) => {
  try {
    const user = await User.findOne({ googleId });

    if (!user) {
      console.log(`❌ User with Google ID ${googleId} not found`);
      return null;
    }

    if (!user.deletedAt) {
      console.log(`ℹ️  User with Google ID ${googleId} is not deleted`);
      return user;
    }

    // Restore user
    user.deletedAt = null;
    user.isActive = true;
    user.deletionConfirmationCount = 0;
    user.deletionRequestedAt = null;
    await user.save();

    console.log(`✅ Restored user: ${user.name} (${user.email})`);
    return user;
  } catch (error) {
    console.error('❌ Error restoring Google user:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    const deletedUsers = await findDeletedGoogleUsers();
    
    if (deletedUsers.length > 0) {
      console.log('\n💡 To restore a user, use:');
      console.log('   node -e "require(\'./findDeletedGoogleUsers\').restoreGoogleUser(\'GOOGLE_ID_HERE\')"');
      console.log('\n   Or run this script with a Google ID as argument:');
      console.log('   node findDeletedGoogleUsers.js RESTORE GOOGLE_ID_HERE');
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Handle restore command
if (process.argv[2] === 'RESTORE' && process.argv[3]) {
  const googleId = process.argv[3];
  connectDB().then(() => {
    restoreGoogleUser(googleId).then(() => {
      mongoose.connection.close();
      process.exit(0);
    }).catch(err => {
      console.error('❌ Restore failed:', err);
      mongoose.connection.close();
      process.exit(1);
    });
  });
} else if (require.main === module) {
  main();
}

module.exports = { findDeletedGoogleUsers, restoreGoogleUser };

