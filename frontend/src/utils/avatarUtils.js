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

/**
 * Creates avatar props for Ant Design Avatar component
 * @param {Object} user - The user object
 * @param {Object} options - Additional options (size, style, etc.)
 * @returns {Object} - Props for Ant Design Avatar component
 */
export const getAvatarProps = (user, options = {}) => {
  const avatarUrl = getUserAvatarUrl(user);
  
  return {
    src: avatarUrl,
    onError: (e) => {
      // Silently handle image load errors - Avatar component will show fallback
      e.target.style.display = 'none';
    },
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
