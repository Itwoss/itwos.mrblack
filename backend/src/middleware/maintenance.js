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
      // Check multiple path properties to handle Express route matching
      // req.originalUrl contains the full original URL (with query string)
      // req.url contains the URL path (with query string)
      // req.path contains the path (may be stripped by Express, no query string)
      const originalUrl = req.originalUrl || req.url || req.path || '';
      const path = req.path || '';
      const url = req.url || '';
      // Remove query string for path matching
      const originalUrlPath = originalUrl.split('?')[0];
      const urlPath = url.split('?')[0];
      
      // Combine all path variations for checking
      const allPaths = [originalUrl, originalUrlPath, url, urlPath, path].filter(p => p);
      
      // Allow ALL admin routes FIRST - admins should always have access (even without auth token)
      // This allows admin login to work during maintenance
      // Check for:
      // 1. Routes starting with /api/admin
      // 2. Routes containing /admin (like /api/notifications/admin)
      // 3. Routes ending with /admin
      // 4. Path is exactly /admin (Express might strip prefix)
      const isAdminRoute = allPaths.some(p => {
        const normalized = p.toLowerCase();
        return normalized.startsWith('/api/admin') || 
               normalized.includes('/admin') || 
               normalized.endsWith('/admin') ||
               normalized === '/admin';
      });
      
      if (isAdminRoute) {
        console.log('✅ Maintenance bypass: Admin route detected', { 
          originalUrl: originalUrl.substring(0, 100), 
          path: path.substring(0, 100), 
          url: url.substring(0, 100),
          originalUrlPath: originalUrlPath.substring(0, 100),
          urlPath: urlPath.substring(0, 100),
          isAdminRoute 
        });
        return next();
      }
      
      // Additional check: if path is just '/admin', it's likely an admin route
      // (Express might strip the prefix before middleware runs)
      if (path === '/admin' || path.startsWith('/admin/')) {
        console.log('✅ Maintenance bypass: Admin route detected (path check)', { path });
        return next();
      }
      
      // Allow authenticated admin users to bypass maintenance mode for all routes
      if (req.user && req.user.role === 'admin') {
        console.log('✅ Maintenance bypass: Admin user detected', { userId: req.user._id, role: req.user.role });
        return next();
      }
      
      // Allow access to public maintenance status endpoint and all settings routes
      if (originalUrl.startsWith('/api/settings') || path.startsWith('/api/settings') || originalUrl.includes('/api/settings')) {
        return next();
      }
      
      // Block all other requests (regular users only)
      console.log('❌ Maintenance block: Regular user request', { originalUrl, path, hasUser: !!req.user });
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

