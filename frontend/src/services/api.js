import axios from 'axios'
import toast from 'react-hot-toast'

// Get API URL with automatic localhost fallback
const getApiURL = () => {
  const envURL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'
  
  // If it's already localhost, use it
  if (envURL.includes('localhost') || envURL.includes('127.0.0.1')) {
    return envURL
  }
  
  // For network IPs, check if we should fallback to localhost
  // This will be determined by failed requests, so we'll start with env URL
  // and let the error handler suggest localhost if needed
  return envURL
}

// Helper to check if token is a mock token
const isMockToken = (token) => {
  if (!token) return false
  return token.includes('mock-') || token.includes('Mock') || token.startsWith('mock')
}

// Helper to get valid JWT token (allow mock tokens in dev mode when backend is unavailable)
const getValidToken = () => {
  // Prioritize admin token for admin routes, then accessToken, then token
  let token = localStorage.getItem('accessToken') || 
               localStorage.getItem('token') || 
               localStorage.getItem('adminToken')
  
  // If no token, return null
  if (!token) {
    return null
  }
  
  // In development mode, allow mock tokens (backend might be unavailable)
  // In production, reject mock tokens
  if (isMockToken(token)) {
    if (import.meta.env.DEV) {
      // In dev mode, allow mock tokens (backend might be down)
      console.warn('⚠️ Mock token detected in dev mode - allowing for offline development')
      return token
    }
    
    // In production, reject mock tokens
    console.warn('⚠️ Mock token detected, attempting to get real token from refresh')
    // Try to get refresh token and refresh
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken && !isMockToken(refreshToken)) {
      // Return null to trigger refresh
      return null
    }
    return null
  }
  
  return token
}

// Create axios instance with increased timeout
const api = axios.create({
  baseURL: getApiURL(),
  timeout: 30000, // Increased to 30 seconds
  withCredentials: true, // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
  },
})

// Create public API instance (no auth headers)
const publicApi = axios.create({
  baseURL: getApiURL(),
  timeout: 30000, // Increased to 30 seconds
  withCredentials: true, // Important for CORS
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Prioritize admin token for admin routes, then accessToken, then token
    let token = null
    if (config.url?.includes('/admin/') || config.url?.includes('/notifications/admin')) {
      // For admin routes, prioritize adminToken
      token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken') || localStorage.getItem('token')
      // Allow mock tokens in dev mode
      if (token && isMockToken(token) && !import.meta.env.DEV) {
        token = null // Reject mock tokens in production
      }
    } else {
      // For regular routes, use standard token
      token = getValidToken()
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Only log in development
      if (import.meta.env.DEV) {
        console.log(`🔑 API Request: ${config.method?.toUpperCase()} ${config.url} - Token: ${token.substring(0, 20)}...`)
      }
    } else {
      // Don't log warnings for public endpoints
      if (!config.url?.includes('/public') && !config.url?.includes('/settings/maintenance-status')) {
        console.warn(`⚠️ API Request: ${config.method?.toUpperCase()} ${config.url} - No valid token found`)
      }
    }
    
    // For FormData uploads, remove the default Content-Type to let axios set it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        
        // Reject mock refresh tokens
        if (!refreshToken || isMockToken(refreshToken)) {
          throw new Error('No valid refresh token available')
        }
        
        console.log('🔄 Attempting token refresh...')
        
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken
        }, {
          timeout: 10000
        })
        
        if (response.data && (response.data.accessToken || response.data.tokens?.accessToken)) {
          const accessToken = response.data.accessToken || response.data.tokens?.accessToken
          const newRefreshToken = response.data.refreshToken || response.data.tokens?.refreshToken
          
          // Validate new tokens are not mock tokens
          if (isMockToken(accessToken)) {
            throw new Error('Received mock token from refresh endpoint')
          }
          
          // Update all token storage locations
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('token', accessToken) // Also store as 'token' for compatibility
          
          // If this is an admin route, also update adminToken
          if (originalRequest.url?.includes('/admin/') || originalRequest.url?.includes('/notifications/admin')) {
            localStorage.setItem('adminToken', accessToken)
            console.log('✅ Admin token refreshed')
          }
          
          // Update refresh token if provided
          if (newRefreshToken && !isMockToken(newRefreshToken)) {
            localStorage.setItem('refreshToken', newRefreshToken)
          }
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          
          console.log('✅ Token refreshed successfully')
          return api(originalRequest)
        } else {
          throw new Error('Invalid refresh response')
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        
        // Check if this is an admin route
        const isAdminRoute = originalRequest.url?.includes('/admin/') || originalRequest.url?.includes('/notifications/admin')
        
        // Clear all auth data
        localStorage.removeItem('accessToken')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        
        // Redirect to appropriate login page
        if (isAdminRoute) {
          if (window.location.pathname !== '/admin/login') {
            window.location.href = '/admin/login'
          }
        } else {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        
        return Promise.reject(refreshError)
      }
    }

    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Server error details:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      })
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.')
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s on background requests
      const isBackgroundRequest = originalRequest?.url?.includes('/settings/maintenance-status') || 
                                   originalRequest?.url?.includes('/notifications')
      if (!isBackgroundRequest) {
        toast.error('Resource not found.')
      }
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.')
    } else if (error.code === 'ECONNABORTED') {
      // Don't show toast for maintenance check or background requests
      const isBackgroundRequest = originalRequest?.url?.includes('/settings/maintenance-status') || 
                                   originalRequest?.url?.includes('/notifications')
      if (!isBackgroundRequest) {
        toast.error('Request timeout. Please check your connection.')
      }
    } else if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.')
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      // Don't log network errors for background requests to reduce console spam
      const isBackgroundRequest = originalRequest?.url?.includes('/settings/maintenance-status') || 
                                   originalRequest?.url?.includes('/notifications')
      if (!isBackgroundRequest) {
        console.error('Network error details:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          method: error.config?.method
        })
        toast.error('Network error. Please check your connection and try again.')
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  googleLogin: (token) => api.post('/auth/google', { token }),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetData) => api.post('/auth/reset-password', resetData),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
}

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (profileData) => api.put('/users/me', profileData),
  getUser: (userId) => api.get(`/users/${userId}`),
  followUser: (userId) => api.post(`/users/${userId}/follow`),
  unfollowUser: (userId) => api.delete(`/users/${userId}/follow`),
  getFollowing: (userId) => api.get(`/users/${userId}/following`),
  getFollowers: (userId) => api.get(`/users/${userId}/followers`),
  getPurchases: (params) => api.get('/users/me/purchases', { params }),
  updatePublicKey: (publicKey) => api.put('/users/me/public-key', { publicKey }),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserStats: (userId) => api.get(`/users/${userId}/stats`),
  deleteAccount: (password) => api.delete('/users/me', { data: { password } }),
}

// Payment API
export const paymentAPI = {
  createOrder: (orderData) => api.post('/payments/create-order', orderData),
  verifyPayment: (paymentData) => api.post('/payments/verify', paymentData),
  getPurchases: (params) => api.get('/payments/my-purchases', { params }),
  getPurchase: (purchaseId) => api.get(`/payments/${purchaseId}`),
  
  // Admin only
  processRefund: (purchaseId, refundData) => api.post(`/payments/${purchaseId}/refund`, refundData),
  getSalesStatistics: (params) => api.get('/payments/admin/statistics', { params }),
  getAllPurchases: (params) => api.get('/payments/admin/purchases', { params }),
}

// Chat API
export const chatAPI = {
  getChatRooms: (params) => api.get('/chat/rooms', { params }),
  createChatRoom: (roomData) => api.post('/chat/rooms', roomData),
  getChatRoom: (roomId) => api.get(`/chat/rooms/${roomId}`),
  updateChatRoom: (roomId, roomData) => api.put(`/chat/rooms/${roomId}`, roomData),
  addParticipant: (roomId, userId) => api.post(`/chat/rooms/${roomId}/participants`, { userId }),
  removeParticipant: (roomId, userId) => api.delete(`/chat/rooms/${roomId}/participants/${userId}`),
  getMessages: (roomId, params) => api.get(`/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (roomId, messageData) => api.post(`/chat/rooms/${roomId}/messages`, messageData),
  addReaction: (messageId, emoji) => api.post(`/chat/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId) => api.delete(`/chat/messages/${messageId}/reactions`),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
  markAsRead: (roomId) => api.patch(`/chat/rooms/${roomId}/read`),
  getUnreadCount: () => api.get('/chat/unread-count'),
}

// Thread API (new thread-based messaging system)
export const threadsAPI = {
  createThread: (memberIds) => api.post('/threads', { memberIds }),
  getThreads: (params) => api.get('/threads', { params }),
  getMessages: (threadId, params) => api.get(`/threads/${threadId}/messages`, { params }),
  sendMessage: (threadId, messageData) => api.post(`/threads/${threadId}/messages`, messageData),
  sendThreadMessage: (threadId, messageData) => api.post(`/threads/${threadId}/messages`, messageData),
  editMessage: (threadId, messageId, messageData) => api.put(`/threads/${threadId}/messages/${messageId}`, messageData),
  deleteMessage: (threadId, messageId) => api.delete(`/threads/${threadId}/messages/${messageId}`),
  deleteThread: (threadId) => api.delete(`/threads/${threadId}`),
  // Secure message deletion methods
  clearThreadMessages: (threadId) => api.delete(`/threads/${threadId}/messages`), // Clear all messages in a thread
}

// Users List API (for finding users to chat with)
export const usersListAPI = {
  getUsers: (params) => api.get('/users-list', { params }),
  getNewUsers: (params) => api.get('/users-list', { params: { ...params, onlyNew: true } }),
}

// Follow API
export const followAPI = {
  sendFollowRequest: (userId) => api.post(`/follow/request/${userId}`),
  acceptFollowRequest: (userId) => api.post(`/follow/accept/${userId}`),
  declineFollowRequest: (userId) => api.post(`/follow/decline/${userId}`),
  getFollowRequests: () => api.get('/follow/requests'),
  getFollowers: () => api.get('/follow/followers'),
  getFollowing: () => api.get('/follow/following'),
  checkFollowStatus: (userId) => api.get(`/follow/check/${userId}`),
  unfollow: (userId) => api.delete(`/follow/unfollow/${userId}`),
  searchUsers: (query, limit) => api.get('/follow/search', { params: { q: query, limit } }),
}

// Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getAdminNotifications: (params) => api.get('/notifications/admin', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getAdminUnreadCount: () => api.get('/notifications/admin/unread-count'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  markAdminAsRead: (notificationId) => api.patch(`/notifications/admin/${notificationId}/read`),
  markAllAdminAsRead: () => api.patch('/notifications/admin/mark-all-read'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  clearAll: () => api.delete('/notifications/clear-all'),
  createTest: (data) => api.post('/notifications/test', data), // Create test notification
}

// Prebook API
export const prebookAPI = {
  getUserPrebooks: (params) => api.get('/prebook', { params }),
  getPrebook: (id) => api.get(`/prebook/${id}`),
  createPrebook: (data) => api.post('/prebook', data),
  updatePrebook: (id, data) => api.put(`/prebook/${id}`, data),
  deletePrebook: (id) => api.delete(`/prebook/${id}`),
  uploadAttachment: (prebookId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/prebook/${prebookId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  // Admin endpoints
  getAllPrebooks: (params) => api.get('/prebook/admin/all', { params }),
  updatePrebookStatus: (id, data) => api.put(`/prebook/admin/${id}/status`, data),
  getPrebookStats: () => api.get('/prebook/admin/stats'),
}

// Posts API
export const postsAPI = {
  createPost: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFeed: (params) => api.get('/posts/feed', { params }),
  getMyPosts: (params) => api.get('/posts/my-posts', { params }),
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  viewPost: (postId) => api.post(`/posts/${postId}/view`),
  savePost: (postId) => api.post(`/posts/${postId}/save`),
  sharePost: (postId) => api.post(`/posts/${postId}/share`),
  reportPost: (postId, data) => api.post(`/posts/${postId}/report`, data),
  // Admin endpoints
  getAdminPosts: (params) => api.get('/admin/posts', { params }),
  getAdminPost: (postId) => api.get(`/admin/posts/${postId}`),
  moderatePost: (postId, data) => api.post(`/admin/posts/${postId}/moderate`, data),
  featurePost: (postId, data) => api.post(`/admin/posts/${postId}/feature`, data),
  adjustPostScore: (postId, data) => api.post(`/admin/posts/${postId}/adjust-score`, data),
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getProducts: (params) => api.get('/admin/products', { params }),
  getSalesAnalytics: (params) => api.get('/admin/analytics/sales', { params }),
  getChatModeration: (params) => api.get('/admin/chat/moderation', { params }),
  flagMessage: (messageId, flagData) => api.post(`/admin/chat/messages/${messageId}/flag`, flagData),
  sendNotification: (notificationData) => api.post('/admin/notifications/send', notificationData),
  getSettings: () => api.get('/admin/settings'),
  // Prebook management
  getPrebooks: (params) => prebookAPI.getAllPrebooks(params),
  updatePrebookStatus: (id, data) => prebookAPI.updatePrebookStatus(id, data),
}

// File upload API
export const uploadAPI = {
  uploadImage: (formData) => {
    const uploadApi = axios.create({
      baseURL: import.meta.env.VITE_CLOUDINARY_URL || 'https://api.cloudinary.com/v1_1',
      timeout: 30000,
    })
    return uploadApi.post('/upload', formData)
  },
  uploadToCloudinary: (file, options = {}) => {
    // Check if Cloudinary is properly configured
    if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME environment variable.')
    }
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'itwos-ai')
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key])
    })
    
    return uploadAPI.uploadImage(formData)
  },
  uploadAvatar: (formData) => {
    return api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }
}

// Socket service
export const socketService = {
  connect: () => {
    const { io } = require('socket.io-client')
    return io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:7000', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })
  }
}

// Encryption service
export const encryptionService = {
  generateKeyPair: () => {
    const forge = require('node-forge')
    const keyPair = forge.pki.rsa.generateKeyPair(2048)
    return {
      publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
    }
  },
  
  generateSharedSecret: (privateKeyPem, publicKeyPem) => {
    const forge = require('node-forge')
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
    const sharedSecret = privateKey.derive(publicKey)
    return forge.util.bytesToHex(sharedSecret)
  },
  
  encryptMessage: (message, key) => {
    const CryptoJS = require('crypto-js')
    const iv = CryptoJS.lib.WordArray.random(12)
    const encrypted = CryptoJS.AES.encrypt(message, key, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    })
    return {
      ciphertext: encrypted.toString(),
      iv: iv.toString()
    }
  },
  
  decryptMessage: (ciphertext, key, iv) => {
    const CryptoJS = require('crypto-js')
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    })
    return decrypted.toString(CryptoJS.enc.Utf8)
  }
}

// Product API
export const productAPI = {
  // Public endpoints
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (productId) => api.get(`/products/${productId}`),
  getProductBySlug: (slug) => api.get(`/products/${slug}`),
  getTrendingProducts: (params) => api.get('/products/trending', { params }),
  getCategories: () => api.get('/products/categories/list'),
  getTags: () => api.get('/products/tags/list'),
  trackVisit: (productId, data) => api.post(`/products/${productId}/visit`, data),
  incrementVisit: (slug) => api.post(`/products/${slug}/visit`),
  getAnalytics: (productId) => api.get(`/products/${productId}/analytics/30d`),
  createPrebook: (productId, data) => api.post(`/products/${productId}/prebook`, data),
  
  // Admin endpoints
  createProduct: (productData) => api.post('/admin/products', productData),
  updateProduct: (productId, productData) => api.put(`/admin/products/${productId}`, productData),
  deleteProduct: (productId) => {
    console.log('🗑️ API Service - Deleting product:', productId)
    console.log('🗑️ API Service - Full URL:', `${api.defaults.baseURL}/admin/products/${productId}`)
    return api.delete(`/admin/products/${productId}`)
  },
  getAdminProducts: (params) => api.get('/admin/products', { params }),
  getAdminProduct: (productId) => api.get(`/admin/products/${productId}`),
  getAdminProductsStats: () => api.get('/admin/products/stats'),
  generateDescription: (data) => api.post('/admin/products/generate-description', data),
  
  // Notification endpoints
  getNotifications: (params) => api.get('/products/notifications', { params }),
  markNotificationAsRead: (notificationId) => api.patch(`/products/notifications/${notificationId}/read`),
  markAllNotificationsAsRead: () => api.patch('/products/notifications/read-all'),
}

// Trending Analytics API
export const trendingAnalyticsAPI = {
  getAnalytics: (params) => api.get('/admin/trending/analytics', { params }),
}

// Trending Settings API
export const trendingSettingsAPI = {
  getSettings: () => api.get('/admin/trending/settings'),
  updateSettings: (settingsData) => api.put('/admin/trending/settings', settingsData),
  resetSettings: () => api.post('/admin/trending/settings/reset'),
}

// Export api as both default and named export
export { api, publicApi }
export default api
