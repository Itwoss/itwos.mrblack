import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { App } from 'antd'
import { createMockJWT, createMockRefreshJWT, createMockUser, storeAuthData, clearAuthData } from '../utils/authHelper'
import googleAuthService from '../services/googleAuth'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  // Use try-catch to handle App.useApp() safely
  let message = null
  try {
    const app = App.useApp()
    message = app.message
  } catch (error) {
    console.warn('AuthProvider: App.useApp() not available, using fallback')
    // Fallback message function
    message = {
      success: (content) => console.log('Success:', content),
      error: (content) => console.error('Error:', content),
      warning: (content) => console.warn('Warning:', content),
      info: (content) => console.info('Info:', content)
    }
  }
  
  // Single state object to prevent multiple re-renders
  const [authState, setAuthState] = useState({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    authInitialized: false
  })
  
  const { user, isLoading, isAuthenticated, authInitialized } = authState
  
  // Prevent multiple initializations
  const [hasInitialized, setHasInitialized] = useState(false)

  // Bulletproof authentication initialization - only run once
  useEffect(() => {
    if (hasInitialized) return
    
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing authentication...')
      setHasInitialized(true)
      
      try {
        // Check for regular user
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token') || localStorage.getItem('accessToken')
        
        // Check for admin user
        const storedAdminUser = localStorage.getItem('adminUser')
        const storedAdminToken = localStorage.getItem('adminToken')
        
        console.log('AuthContext: Auth data check:', {
          hasUser: !!storedUser,
          hasToken: !!storedToken,
          hasAdminUser: !!storedAdminUser,
          hasAdminToken: !!storedAdminToken
        })
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser)
          console.log('AuthContext: Found regular user:', userData.email)
          
          // Check if this is actually an admin user (email contains admin or role is admin)
          if (userData.email === 'admin@itwos.ai' || userData.role === 'admin') {
            console.log('AuthContext: Converting to admin user:', userData.email)
            
            // Force create a new admin token
            const newAdminToken = createMockJWT(userData._id, 'admin', userData.email, userData.name)
            console.log('AuthContext: Created new admin token:', newAdminToken.substring(0, 50) + '...')
            
            // Store as admin user with new token
            localStorage.setItem('adminUser', JSON.stringify({ ...userData, role: 'admin' }))
            localStorage.setItem('adminToken', newAdminToken)
            localStorage.setItem('token', newAdminToken)
            localStorage.setItem('accessToken', newAdminToken)
            
            // Token is already created above, no need for additional validation
            
            setAuthState({
              user: { ...userData, role: 'admin' },
              isAuthenticated: true,
              authInitialized: true,
              isLoading: false
            })
            
            console.log('AuthContext: Admin user authentication initialized')
            return
          }
          
          // Check and refresh token if needed
          try {
            // For mock tokens, check if they're expired
            if (storedToken.includes('mock-')) {
              const payload = JSON.parse(atob(storedToken.split('-')[1]))
              const now = Math.floor(Date.now() / 1000)
              if (payload.exp && payload.exp < now) {
                console.log('Mock token expired, creating new one')
                const newToken = createMockJWT(userData._id, userData.role, userData.email, userData.name)
                localStorage.setItem('token', newToken)
                localStorage.setItem('accessToken', newToken)
              }
            }
          } catch (error) {
            console.error('Error validating token:', error)
            clearAuthData()
            setAuthState({
              user: null,
              isAuthenticated: false,
              authInitialized: true,
              isLoading: false
            })
            return
          }
          
          setAuthState({
            user: userData,
            isAuthenticated: true,
            authInitialized: true,
            isLoading: false
          })
          
          console.log('AuthContext: Regular user authentication initialized')
          return
        }
        
        if (storedAdminUser && storedAdminToken) {
          const adminData = JSON.parse(storedAdminUser)
          console.log('AuthContext: Found admin user:', adminData.email)
          
          // Store admin token as regular token for API calls
          localStorage.setItem('token', storedAdminToken)
          localStorage.setItem('accessToken', storedAdminToken)
          
          // Check and refresh token if needed
          try {
            // For mock tokens, check if they're expired
            if (storedAdminToken.includes('mock-')) {
              const payload = JSON.parse(atob(storedAdminToken.split('-')[1]))
              const now = Math.floor(Date.now() / 1000)
              if (payload.exp && payload.exp < now) {
                console.log('Admin mock token expired, creating new one')
                const newToken = createMockJWT(adminData._id, adminData.role, adminData.email, adminData.name)
                localStorage.setItem('token', newToken)
                localStorage.setItem('accessToken', newToken)
                localStorage.setItem('adminToken', newToken)
              }
            }
          } catch (error) {
            console.error('Error validating admin token:', error)
            clearAuthData()
            localStorage.removeItem('adminUser')
            localStorage.removeItem('adminToken')
            setAuthState({
              user: null,
              isAuthenticated: false,
              authInitialized: true,
              isLoading: false
            })
            return
          }
          
          setAuthState({
            user: adminData,
            isAuthenticated: true,
            authInitialized: true,
            isLoading: false
          })
          
          console.log('AuthContext: Admin user authentication initialized')
          return
        }
        
        // Mock authentication removed - use real authentication only
        
        // No valid authentication found
        console.log('AuthContext: No valid authentication found')
        
        setAuthState({
          user: null,
          isAuthenticated: false,
          authInitialized: true,
          isLoading: false
        })
        
      } catch (error) {
        console.error('AuthContext: Authentication initialization error:', error)
        
        // Clear potentially corrupted data
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('adminUser')
        localStorage.removeItem('adminToken')
        
        setAuthState({
          user: null,
          isAuthenticated: false,
          authInitialized: true,
          isLoading: false
        })
      }
    }

    initializeAuth()
  }, [hasInitialized])

  // Helper function to check backend availability
  const checkBackendHealth = useCallback(async (timeout = 3000) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return healthCheck.ok
    } catch (error) {
      return false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      // Check if backend is available
      const backendAvailable = await checkBackendHealth(3000)
      if (!backendAvailable) {
        console.warn('Backend server not available, using mock login')
        // Mock login for development with proper JWT tokens
        const mockUser = createMockUser(credentials.email)
        const mockAccessToken = createMockJWT(mockUser._id, mockUser.role, mockUser.email, mockUser.name)
        const mockRefreshToken = createMockRefreshJWT(mockUser._id, mockUser.role)
        
        storeAuthData(mockUser, mockAccessToken, mockRefreshToken)
        
        setAuthState({
          user: mockUser,
          isAuthenticated: true,
          authInitialized: true,
          isLoading: false
        })
        
        console.log('AuthContext: Mock login successful:', mockUser.email)
        message.success('Login successful! (Mock mode)')
        return { 
          success: true, 
          user: mockUser,
          redirectTo: '/dashboard'
        }
      }
      
      // Call real login API
      const response = await fetch('http://localhost:7000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      })

      // If response is not ok (500, 404, etc.), fall back to mock
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Store user data and tokens properly
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('token', data.tokens.accessToken)
        localStorage.setItem('accessToken', data.tokens.accessToken)
        localStorage.setItem('refreshToken', data.tokens.refreshToken)
        
        // Update state
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          authInitialized: true,
          isLoading: false
        })
        
        console.log('AuthContext: Real login successful:', data.user.email)
        message.success('Login successful!')
        return { 
          success: true, 
          user: data.user,
          redirectTo: data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
        }
      } else {
        // If API returns success: false, fall back to mock login
        console.warn('Backend login failed, falling back to mock login:', data.message)
        throw new Error(data.message || 'Login failed')
      }
      
    } catch (error) {
      console.error('Login error:', error)
      message.error('Login failed. Please check your credentials and try again.')
      return { success: false, error: 'Login failed' }
    }
  }, [checkBackendHealth])

  const register = useCallback(async (userData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      // Check if backend is available
      const backendAvailable = await checkBackendHealth(5000)
      if (!backendAvailable) {
        console.warn('Backend server not available, using mock registration')
        message.success('Registration successful! Please log in. (Mock mode)')
        return { success: true }
      }
      
      const response = await fetch('http://localhost:7000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (data.success) {
        message.success('Registration successful! Please log in.')
        return { success: true }
      } else {
        message.error(data.message || 'Registration failed')
        return { success: false, error: data.message }
      }
      
    } catch (error) {
      console.error('Registration error:', error)
      message.error('Network error. Please try again.')
      return { success: false, error: error.message }
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Token refresh function
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await fetch('http://localhost:7000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          localStorage.setItem('token', data.tokens.accessToken)
          localStorage.setItem('accessToken', data.tokens.accessToken)
          localStorage.setItem('refreshToken', data.tokens.refreshToken)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }, [])

  // Check if token is expired and refresh if needed
  const checkAndRefreshToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
      if (!token) return false

      // For mock tokens, check if they're expired
      if (token.includes('mock-')) {
        try {
          const payload = JSON.parse(atob(token.split('-')[1]))
          const now = Math.floor(Date.now() / 1000)
          if (payload.exp && payload.exp < now) {
            console.log('Mock token expired, creating new one')
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const newToken = createMockJWT(user._id, user.role, user.email, user.name)
            localStorage.setItem('token', newToken)
            localStorage.setItem('accessToken', newToken)
            return true
          }
          return true
        } catch (error) {
          console.error('Error parsing mock token:', error)
          return false
        }
      }

      // For real tokens, try to refresh
      return await refreshToken()
    } catch (error) {
      console.error('Token check failed:', error)
      return false
    }
  }, [refreshToken])

  // Force refresh admin token
  const forceRefreshAdminToken = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        if (userData.email === 'admin@itwos.ai' || userData.role === 'admin') {
          console.log('🔄 Force refreshing admin token for:', userData.email)
          
          // Create new admin token
          const newAdminToken = createMockJWT(userData._id, 'admin', userData.email, userData.name)
          
          // Update all token storage
          localStorage.setItem('adminUser', JSON.stringify({ ...userData, role: 'admin' }))
          localStorage.setItem('adminToken', newAdminToken)
          localStorage.setItem('token', newAdminToken)
          localStorage.setItem('accessToken', newAdminToken)
          
          console.log('✅ Admin token force refreshed')
          return { success: true, token: newAdminToken }
        }
      }
      return { success: false, error: 'No admin user found' }
    } catch (error) {
      console.error('❌ Force refresh admin token failed:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Global function for browser console debugging
  if (typeof window !== 'undefined') {
    window.forceRefreshAdminToken = forceRefreshAdminToken
    window.clearAuthAndRefresh = () => {
      console.log('🧹 Clearing auth data and refreshing...')
      clearAuthData()
      localStorage.removeItem('adminUser')
      localStorage.removeItem('adminToken')
      window.location.reload()
    }
  }

  const logout = useCallback(async () => {
    try {
      // Clear authentication data
      clearAuthData()
      localStorage.removeItem('adminUser')
      localStorage.removeItem('adminToken')
      
      // Clear state
      setAuthState({
        user: null,
        isAuthenticated: false,
        authInitialized: true,
        isLoading: false
      })
      
      message.success('Logged out successfully!')
      return { success: true }
      
    } catch (error) {
      console.error('Logout error:', error)
      message.error('Logout failed')
      return { success: false, error: error.message }
    }
  }, [])

  const adminLogin = useCallback(async (credentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      // Real authentication only - no mock fallback
      
      // Call admin login API
      const response = await fetch('http://localhost:7000/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      })

      // If response is not ok (404, 500, etc.), fall back to mock
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Store admin data
        localStorage.setItem('adminToken', data.data.accessToken)
        localStorage.setItem('adminUser', JSON.stringify(data.data.user))
        
        setAuthState({
          user: data.data.user,
          isAuthenticated: true,
          authInitialized: true,
          isLoading: false
        })
        
        message.success('Admin login successful!')
        return { success: true, user: data.data.user }
      } else {
        // If API returns success: false, also fall back to mock
        throw new Error(data.message || 'Admin login failed')
      }
      
    } catch (error) {
      console.error('Admin login error:', error)
      message.error('Login failed. Please check your credentials and try again.')
      return { success: false, error: error.message }
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const adminLogout = useCallback(async () => {
    try {
      // Call admin logout API if backend is available
      const backendAvailable = await checkBackendHealth(5000)
      if (backendAvailable) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'
          await fetch(`${API_URL}/admin/auth/logout`, {
            method: 'POST',
            credentials: 'include'
          })
        } catch (error) {
          // Silently fail - we'll clear local data anyway
        }
      }
      
      // Clear admin data regardless of API response
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        authInitialized: true,
        isLoading: false
      })
      
      message.success('Admin logout successful!')
      return { success: true }
      
    } catch (error) {
      console.error('Admin logout error:', error)
      // Clear data anyway
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      setAuthState({
        user: null,
        isAuthenticated: false,
        authInitialized: true,
        isLoading: false
      })
      message.success('Logged out successfully!')
      return { success: true }
    }
  }, [])

  // Google OAuth login
  const googleLogin = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      console.log('🔐 Starting Google OAuth login...')
      
      // Initialize Google Auth if not already done
      await googleAuthService.initializeGoogleAuth()
      
      // Get Google OAuth response
      const googleResponse = await googleAuthService.signInWithGoogle()
      
      if (!googleResponse || !googleResponse.access_token) {
        throw new Error('Failed to get Google access token')
      }
      
      console.log('🔐 Google OAuth response received:', googleResponse)
      
      // Use user info from Google API response
      const userInfo = googleResponse.userInfo
      
      console.log('🔐 Google user info:', userInfo)
      
      // Check if backend is available
      const backendAvailable = await checkBackendHealth(3000)
      if (!backendAvailable) {
        console.warn('Backend server not available, using mock Google login')
        
        // Mock Google login for development
        const mockUser = {
          _id: 'google-user-' + Date.now(),
          name: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.picture,
          role: 'user',
          googleId: userInfo.sub,
          isEmailVerified: userInfo.email_verified,
          createdAt: new Date().toISOString()
        }
        
        const mockAccessToken = createMockJWT(mockUser._id, mockUser.role, mockUser.email, mockUser.name)
        const mockRefreshToken = createMockRefreshJWT(mockUser._id, mockUser.role)
        
        storeAuthData(mockUser, mockAccessToken, mockRefreshToken)
        
        setAuthState({
          user: mockUser,
          isAuthenticated: true,
          authInitialized: true,
          isLoading: false
        })
        
        console.log('AuthContext: Mock Google login successful:', mockUser.email)
        message.success('Google login successful! (Mock mode)')
        return { 
          success: true, 
          user: mockUser,
          redirectTo: '/dashboard'
        }
      }
      
      // Call real Google login API
      const response = await fetch('http://localhost:7000/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          access_token: googleResponse.access_token,
          userInfo: userInfo
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Store user data and tokens properly
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('token', data.tokens.accessToken)
        localStorage.setItem('accessToken', data.tokens.accessToken)
        localStorage.setItem('refreshToken', data.tokens.refreshToken)
        
        // Update state
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          authInitialized: true,
          isLoading: false
        })
        
        console.log('AuthContext: Real Google login successful:', data.user.email)
        message.success('Google login successful!')
        return { 
          success: true, 
          user: data.user,
          redirectTo: data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
        }
      } else {
        throw new Error(data.message || 'Google login failed')
      }
      
    } catch (error) {
      console.error('Google login error:', error)
      message.error('Google login failed. Please try again.')
      return { success: false, error: 'Google login failed' }
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [message])

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      console.log('AuthContext: Updating profile:', profileData)
      
      if (!user) {
        throw new Error('No user logged in')
      }
      
      // Update user data
      const updatedUser = { ...user, ...profileData }
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }))
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      console.log('AuthContext: Profile updated successfully')
      message.success('Profile updated successfully!')
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('AuthContext: Profile update error:', error)
      message.error('Profile update failed. Please try again.')
      return { success: false, error: error.message }
    }
  }, [user, message])

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    try {
      console.log('AuthContext: Refreshing authentication')
      
      // Check for stored tokens
      const storedToken = localStorage.getItem('token') || localStorage.getItem('accessToken')
      const storedUser = localStorage.getItem('user')
      
      if (!storedToken || !storedUser) {
        console.log('AuthContext: No stored auth data found')
        return { success: false, error: 'No stored authentication data' }
      }
      
      // Parse user data
      const userData = JSON.parse(storedUser)
      
      // Update auth state
      setAuthState({
        user: userData,
        isLoading: false,
        isAuthenticated: true,
        authInitialized: true
      })
      
      console.log('AuthContext: Authentication refreshed successfully')
      return { success: true, user: userData }
    } catch (error) {
      console.error('AuthContext: Refresh auth error:', error)
      return { success: false, error: error.message }
    }
  }, [])


  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading: isLoading && !user,
    isAuthenticated,
    authInitialized,
    login,
    register,
    logout,
    googleLogin,
    refreshToken,
    checkAndRefreshToken,
    forceRefreshAdminToken,
    adminLogin,
    adminLogout,
    updateProfile,
    refreshAuth,
    setUser: (user) => setAuthState(prev => ({ ...prev, user })),
    updateUser: (updatedUser) => {
      console.log('🔄 AuthContext: updateUser called with:', updatedUser)
      setAuthState(prev => {
        const newUser = { ...prev.user, ...updatedUser }
        console.log('🔄 AuthContext: New user state:', newUser)
        
        // Update localStorage immediately (0 delay) for persistence
        localStorage.setItem('user', JSON.stringify(newUser))
        console.log('🔄 AuthContext: Updated localStorage immediately')
        
        return { 
          ...prev, 
          user: newUser
        }
      })
    },
    setIsAuthenticated: (isAuth) => setAuthState(prev => ({ ...prev, isAuthenticated: isAuth }))
  }), [user, isLoading, isAuthenticated, authInitialized, login, register, logout, googleLogin, refreshToken, checkAndRefreshToken, adminLogin, adminLogout, updateProfile, refreshAuth])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
