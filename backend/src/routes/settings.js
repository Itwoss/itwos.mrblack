const express = require('express');
const Settings = require('../models/Settings');

const router = express.Router();

// Public endpoint to check maintenance mode status
// This endpoint should NOT be protected by maintenance mode middleware
router.get('/maintenance-status', async (req, res) => {
  console.log('📡 Maintenance status endpoint called:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url
  });
  
  try {
    const settings = await Settings.getSettings();
    
    console.log('✅ Maintenance status retrieved:', {
      maintenanceMode: settings.maintenanceMode,
      siteName: settings.siteName
    });
    
    res.json({
      success: true,
      data: {
        maintenanceMode: settings.maintenanceMode,
        siteName: settings.siteName,
        siteDescription: settings.siteDescription
      }
    });
  } catch (error) {
    console.error('❌ Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance status',
      data: {
        maintenanceMode: false
      }
    });
  }
});

module.exports = router;

