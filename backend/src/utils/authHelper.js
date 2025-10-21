// Authentication helper utilities for backend - Mock JWT implementation

// Create a mock JWT token that matches the frontend format
const createMockJWT = (userId = '1', role = 'user', email = 'user@example.com', name = 'Test User') => {
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

  // Create a simple mock token that matches frontend format
  const mockToken = `mock-${Buffer.from(JSON.stringify(payload)).toString('base64')}`
  return mockToken
}

// Create mock refresh token
const createMockRefreshJWT = (userId = '1', role = 'user') => {
  const payload = {
    userId: userId,
    role: role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    iss: 'itwos-ai',
    aud: 'itwos-ai-users'
  }

  // Create a simple mock refresh token that matches frontend format
  const mockRefreshToken = `mock-refresh-${Buffer.from(JSON.stringify(payload)).toString('base64')}`
  return mockRefreshToken
}

// Create mock user data
const createMockUser = (email, name, role = 'user') => ({
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

module.exports = {
  createMockJWT,
  createMockRefreshJWT,
  createMockUser
}

