const Settings = require('../models/Settings');

/**
 * Middleware to check maintenance mode
 * Allows admin users to bypass maintenance mode
 */
const checkMaintenanceMode = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    // If maintenance mode is enabled
    if (settings.maintenanceMode) {
      // Allow ALL admin routes FIRST - admins should always have access (even without auth token)
      // This allows admin login to work during maintenance
      if (req.path.startsWith('/api/admin')) {
        return next();
      }
      
      // Allow authenticated admin users to bypass maintenance mode for all routes
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      
      // Allow access to public maintenance status endpoint and all settings routes
      if (req.path.startsWith('/api/settings')) {
        return next();
      }
      
      // Block all other requests (regular users only)
      return res.status(503).json({
        success: false,
        message: 'Service is currently under maintenance',
        maintenanceMode: true,
        settings: {
          siteName: settings.siteName,
          siteDescription: settings.siteDescription
        }
      });
    }
    
    // Maintenance mode is off, continue normally
    next();
  } catch (error) {
    console.error('Maintenance mode check error:', error);
    // On error, allow request to continue (fail open)
    next();
  }
};

module.exports = { checkMaintenanceMode };

