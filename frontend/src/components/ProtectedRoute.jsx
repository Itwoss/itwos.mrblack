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
  if (!authInitialized || isLoading) {
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
