const cron = require('node-cron');
const { runTrendingUpdateJob } = require('./trendingAlgorithm');

/**
 * Trending Score Update Cron Job
 * Runs every 15 minutes to update trending scores for recent posts
 */

let trendingCronJob = null;

function startTrendingCron() {
  // Run every 15 minutes
  // Format: minute hour day month dayOfWeek
  trendingCronJob = cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('⏰ Running scheduled trending score update...');
      await runTrendingUpdateJob();
    } catch (error) {
      console.error('❌ Scheduled trending update failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ Trending score update cron job started (runs every 15 minutes)');
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

