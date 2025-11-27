/**
 * Manual Trending Trigger Script
 * 
 * Usage: node triggerTrending.js
 * 
 * This script manually triggers the trending calculation
 * without waiting for the cron job (which runs every 5 minutes)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runTrendingUpdateJob } = require('./src/services/trendingAlgorithm');

async function triggerTrending() {
  try {
    console.log('🚀 Starting manual trending calculation...');
    console.log('⏰ This will calculate trending scores for all posts...\n');
    
    // Connect to MongoDB first
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/itwos-ai';
    console.log('📡 Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully\n');
    
    // Now run the trending job
    await runTrendingUpdateJob();
    
    console.log('\n✅ Trending calculation complete!');
    console.log('📊 Check your posts to see if they became trending.');
    console.log('💡 Tip: Use GET /api/posts/:id to check trendingStatus');
    
    // Close connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error triggering trending calculation:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the function
triggerTrending();

