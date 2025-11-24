/**
 * Utility functions for handling user avatars
 */

/**
 * Constructs a full avatar URL from a relative path or returns the full URL as-is
 * @param {string} avatarUrl - The avatar URL (can be relative or absolute)
 * @returns {string} - The full avatar URL
 */
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  
  // If it's already a full URL, return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If it's a relative path, construct the full URL
  if (avatarUrl.startsWith('/')) {
    return `http://localhost:7000${avatarUrl}`;
  }
  
  // If it doesn't start with /, assume it's a relative path and add the base URL
  return `http://localhost:7000/${avatarUrl}`;
};

/**
 * Gets the avatar URL for a user object
 * @param {Object} user - The user object
 * @returns {string|null} - The full avatar URL or null if no avatar
 */
export const getUserAvatarUrl = (user) => {
  if (!user) return null;
  
  const avatarUrl = user.avatarUrl || user.avatar;
  return getAvatarUrl(avatarUrl);
};

// Cache for failed Google images to avoid repeated attempts
const failedGoogleImages = new Set();

// Track Google image requests to detect rate limiting
let googleImageRequestCount = 0;
const GOOGLE_IMAGE_RATE_LIMIT = 10; // Max requests before skipping

/**
 * Creates avatar props for Ant Design Avatar component
 * @param {Object} user - The user object
 * @param {Object} options - Additional options (size, style, etc.)
 * @returns {Object} - Props for Ant Design Avatar component
 */
export const getAvatarProps = (user, options = {}) => {
  const avatarUrl = getUserAvatarUrl(user);
  
  // Check if it's a Google profile image (likely to hit rate limits or CORS)
  const isGoogleImage = avatarUrl && avatarUrl.includes('googleusercontent.com');
  
  // Skip Google images if:
  // 1. This specific image has failed before
  // 2. We've made too many Google image requests (rate limit protection)
  if (isGoogleImage) {
    if (failedGoogleImages.has(avatarUrl)) {
      // This specific image failed before - skip it
      return {
        src: undefined, // Don't set src - Avatar will show initials
        ...options
      };
    }
    
    // If we've made too many Google image requests, skip to prevent 429 errors
    if (googleImageRequestCount >= GOOGLE_IMAGE_RATE_LIMIT) {
      // Don't increment counter - we're skipping the request
      return {
        src: undefined, // Don't set src - Avatar will show initials
        ...options
      };
    }
    
    // Increment counter for this Google image request
    googleImageRequestCount++;
  }
  
  return {
    src: avatarUrl,
    onError: (e) => {
      // Handle CORS, 429 (Too Many Requests), and other image load errors
      // Hide the broken image - Avatar component will show fallback initials
      if (e && e.target) {
        e.target.style.display = 'none';
        
        // Cache failed Google images to avoid repeated attempts
        if (isGoogleImage && avatarUrl) {
          failedGoogleImages.add(avatarUrl);
        }
      }
      
      // Suppress console errors for Google images (they're expected to fail)
      // Only log if it's not a Google image or if we want to debug
      if (!isGoogleImage && e?.target?.src) {
        console.warn('Avatar image failed to load:', e.target.src);
      }
    },
    // DO NOT set crossOrigin for Google images - it causes CORS errors
    // Google's CDN doesn't allow cross-origin requests
    crossOrigin: undefined,
    // Don't set referrerPolicy for Google images - it doesn't help with CORS
    referrerPolicy: undefined,
    ...options
  };
};

/**
 * Creates a fallback avatar with user initials
 * @param {string|Object} nameOrUser - The user's name (string) or user object
 * @returns {string} - The initials (first letter of each word)
 */
export const getUserInitials = (nameOrUser) => {
  // Handle null/undefined
  if (!nameOrUser) return 'U';
  
  // If it's an object (user), extract the name
  let name = nameOrUser;
  if (typeof nameOrUser === 'object' && nameOrUser !== null) {
    name = nameOrUser.name || nameOrUser.username || nameOrUser.email || '';
  }
  
  // Ensure name is a string
  if (typeof name !== 'string') {
    return 'U';
  }
  
  // If name is empty, try email
  if (!name && typeof nameOrUser === 'object' && nameOrUser?.email) {
    name = nameOrUser.email.split('@')[0];
  }
  
  // If still no name, return default
  if (!name || name.trim() === '') {
    return 'U';
  }
  
  // Extract initials from name
  try {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  } catch (error) {
    console.error('Error generating initials:', error, { nameOrUser, name });
    return 'U';
  }
};
