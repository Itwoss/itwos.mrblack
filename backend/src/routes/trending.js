const express = require('express');
const router = express.Router();

// Mount sub-routes
router.use('/analytics', require('./trendingAnalytics'));
router.use('/settings', require('./trendingSettings'));

module.exports = router;

