const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Daily cron job to check and update expired subscriptions
 * Runs every day at 2:00 AM
 */
const checkExpiredSubscriptions = async () => {
  try {
    console.log('🕒 Running subscription expiry check...');
    const now = new Date();

    // Find all active subscriptions that have expired
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      expiryDate: { $lte: now }
    });

    console.log(`Found ${expiredSubscriptions.length} expired subscription(s)`);

    if (expiredSubscriptions.length === 0) {
      console.log('✅ No expired subscriptions found');
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(expiredSubscriptions.map(sub => sub.userId.toString()))];

    // Update expired subscriptions
    const updateResult = await Subscription.updateMany(
      {
        status: 'active',
        expiryDate: { $lte: now }
      },
      {
        $set: { status: 'expired' }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} subscription(s) to expired status`);

    // Check each user's verification status
    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`⚠️ User ${userId} not found, skipping`);
          continue;
        }

        // Check if user has any active subscriptions remaining
        const activeSubscriptions = await Subscription.find({
          userId: userId,
          status: 'active',
          expiryDate: { $gt: now }
        }).sort({ expiryDate: -1 });

        if (activeSubscriptions.length === 0) {
          // No active subscriptions, remove verification
          if (user.isVerified || (user.verifiedTill && user.verifiedTill <= now)) {
            user.isVerified = false;
            user.verifiedTill = null;
            await user.save();
            console.log(`✅ Removed verification for user ${userId} (${user.email || user.name})`);
          }
        } else {
          // User has active subscriptions, update verifiedTill to the latest expiry date
          const latestExpiry = activeSubscriptions[0].expiryDate;
          if (!user.verifiedTill || user.verifiedTill < latestExpiry) {
            user.isVerified = true;
            user.verifiedTill = latestExpiry;
            await user.save();
            console.log(`✅ Updated verification expiry for user ${userId} to ${latestExpiry}`);
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${userId}:`, userError);
      }
    }

    console.log('✅ Subscription expiry check completed');
  } catch (error) {
    console.error('❌ Error in subscription expiry check:', error);
  }
};

// Schedule cron job to run daily at 2:00 AM
const startSubscriptionCron = () => {
  // Run immediately on startup (for testing/debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: Running subscription check on startup');
    checkExpiredSubscriptions();
  }

  // Schedule daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('🕒 Scheduled subscription expiry check triggered');
    checkExpiredSubscriptions();
  });

  console.log('✅ Subscription expiry cron job scheduled (daily at 2:00 AM)');
};

module.exports = {
  checkExpiredSubscriptions,
  startSubscriptionCron
};

