const cron = require('node-cron');
const { runTrendingUpdateJob } = require('./trendingAlgorithm');
const { clearTrendingCache } = require('./trendingCache');

/**
 * Trending Score Update Cron Job
 * Runs every 15 minutes to update trending scores for recent posts
 */

let trendingCronJob = null;

function startTrendingCron() {
  // Run every 5 minutes (as per specification: 1-5 minutes)
  // Format: minute hour day month dayOfWeek
  trendingCronJob = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ Running scheduled trending score update...');
      
      // Clear cache before updating (will be repopulated with fresh data)
      await clearTrendingCache();
      
      await runTrendingUpdateJob();
    } catch (error) {
      console.error('❌ Scheduled trending update failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ Trending score update cron job started (runs every 5 minutes)');
}

function stopTrendingCron() {
  if (trendingCronJob) {
    trendingCronJob.stop();
    console.log('⏹️ Trending score update cron job stopped');
  }
}

module.exports = {
  startTrendingCron,
  stopTrendingCron
};

