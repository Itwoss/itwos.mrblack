// Authentication helper utilities - Browser compatible JWT implementation

// Simple JWT implementation for browser environment
const createBrowserJWT = (payload, secret) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  // Create signature (simplified for browser)
  const signature = btoa(JSON.stringify({
    ...payload,
    secret: secret,
    timestamp: Date.now()
  }))
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Create a mock JWT token that matches the backend format
export const createMockJWT = (userId = '1', role = 'user', email = 'user@example.com', name = 'Test User') => {
  const payload = {
    userId: userId,
    role: role,
    email: email,
    name: name,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    iss: 'itwos-ai',
    aud: 'itwos-ai-users'
  }

  // Create a simple mock token that the backend will recognize
  const mockToken = `mock-${btoa(JSON.stringify(payload))}`
  return mockToken
}

// Create mock refresh token
export const createMockRefreshJWT = (userId = '1', role = 'user') => {
  const payload = {
    userId: userId,
    role: role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    iss: 'itwos-ai',
    aud: 'itwos-ai-users'
  }

  // Create a simple mock refresh token that the backend will recognize
  const mockRefreshToken = `mock-refresh-${btoa(JSON.stringify(payload))}`
  return mockRefreshToken
}

// Browser-compatible token decoding
const decodeBrowserJWT = (token) => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    throw new Error('Failed to decode JWT')
  }
}

// Check if token is expired
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeBrowserJWT(token)
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch (error) {
    // Try to decode as base64 fallback
    try {
      const payload = JSON.parse(atob(token))
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000)
        return payload.exp < currentTime
      }
    } catch (fallbackError) {
      console.error('Error decoding token:', fallbackError)
    }
    return true
  }
}

// Get token info for debugging
export const getTokenInfo = (token) => {
  try {
    const decoded = decodeBrowserJWT(token)
    const currentTime = Math.floor(Date.now() / 1000)
    return {
      valid: true,
      payload: decoded,
      header: null,
      expired: decoded.exp ? decoded.exp < currentTime : true
    }
  } catch (error) {
    // Try to decode as base64 fallback
    try {
      const payload = JSON.parse(atob(token))
      const currentTime = Math.floor(Date.now() / 1000)
      return {
        valid: true,
        payload: payload,
        header: null,
        expired: payload.exp ? payload.exp < currentTime : true
      }
    } catch (fallbackError) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

// Create mock user data
export const createMockUser = (email, name, role = 'user') => ({
  _id: `mock-${role}-id`,
  id: `mock-${role}-id`,
  name: name || email.split('@')[0] || 'Test User',
  email: email,
  role: role,
  avatarUrl: null,
  bio: `Mock ${role} for testing`,
  isOnline: true,
  lastSeen: new Date().toISOString()
})

// Store authentication data properly
export const storeAuthData = (user, accessToken, refreshToken) => {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', accessToken)
  localStorage.setItem('accessToken', accessToken)
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
}

// Clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// Get stored authentication data
export const getStoredAuthData = () => {
  const user = localStorage.getItem('user')
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  
  return {
    user: user ? JSON.parse(user) : null,
    token,
    refreshToken
  }
}
