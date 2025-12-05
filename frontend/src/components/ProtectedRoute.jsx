import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContextOptimized"
import { Spin } from 'antd'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const location = useLocation()
  
  // Safely get auth context
  let authContext = null
  try {
    authContext = useAuth()
  } catch (error) {
    console.error('ProtectedRoute: useAuth error:', error)
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div>Authentication error. Please refresh the page.</div>
      </div>
    )
  }
  
  const { isAuthenticated, user, isLoading, authInitialized } = authContext

  // Show loading while authentication is being initialized
  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authInitialized || isLoading) {
        setLoadingTimeout(true)
        console.warn('ProtectedRoute: Loading timeout - auth taking too long')
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timer)
  }, [authInitialized, isLoading])
  
  if ((!authInitialized || isLoading) && !loadingTimeout) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    )
  }
  
  // If timeout occurred, force initialization
  if (loadingTimeout && !authInitialized) {
    console.warn('ProtectedRoute: Forcing auth initialization due to timeout')
    // Force redirect to login if auth hasn't initialized after timeout
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If not authenticated after initialization, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If role is specified and user doesn't have the required role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect based on user role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute
