import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Create public API instance (no auth headers)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Check for both token formats for compatibility
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('adminToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
        if (refreshToken) {
          console.log('🔄 Attempting token refresh...')
          
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken
          })
          
          if (response.data && response.data.accessToken) {
            const { accessToken } = response.data
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('token', accessToken) // Also store as 'token' for compatibility
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            
            console.log('✅ Token refreshed successfully')
            return api(originalRequest)
          } else {
            throw new Error('Invalid refresh response')
          }
        } else {
          throw new Error('No refresh token available')
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        
        // Clear all auth data
        localStorage.removeItem('accessToken')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        
        // Redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
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
      toast.error('Resource not found.')
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.')
    } else if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.')
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('Network error details:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        method: error.config?.method
      })
      toast.error('Network error. Please check your connection and try again.')
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

// Follow API
export const followAPI = {
  sendFollowRequest: (userId) => api.post(`/follow/request/${userId}`),
  acceptFollowRequest: (userId) => api.post(`/follow/accept/${userId}`),
  declineFollowRequest: (userId) => api.post(`/follow/decline/${userId}`),
  getFollowRequests: () => api.get('/follow/requests'),
  getFollowers: () => api.get('/follow/followers'),
  getFollowing: () => api.get('/follow/following'),
  unfollow: (userId) => api.delete(`/follow/unfollow/${userId}`),
  searchUsers: (query, limit) => api.get('/follow/search', { params: { q: query, limit } }),
}

// Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  clearAll: () => api.delete('/notifications/clear-all'),
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
  generateDescription: (data) => api.post('/admin/products/generate-description', data),
  
  // Notification endpoints
  getNotifications: (params) => api.get('/products/notifications', { params }),
  markNotificationAsRead: (notificationId) => api.patch(`/products/notifications/${notificationId}/read`),
  markAllNotificationsAsRead: () => api.patch('/products/notifications/read-all'),
}

// Duplicate prebookAPI removed - functionality merged above


// Export api as both default and named export
export { api }
export default api
