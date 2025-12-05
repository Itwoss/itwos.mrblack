import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import MaintenancePage from '../pages/MaintenancePage'
import { publicApi } from '../services/api'

const MaintenanceCheck = ({ children }) => {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const maintenanceModeRef = useRef(false)

  const checkMaintenanceStatus = useCallback(async () => {
    try {
      // Check if current route is admin login or admin pages - always allow access
      const isAdminRoute = location.pathname.startsWith('/admin')
      if (isAdminRoute) {
        setMaintenanceMode(false)
        setChecking(false)
        return
      }

      // Check if user is admin
      const userStr = localStorage.getItem('user')
      const adminUserStr = localStorage.getItem('adminUser')
      const user = userStr ? JSON.parse(userStr) : null
      const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
      const isAdminUser = (user && user.role === 'admin') || (adminUser && adminUser.role === 'admin')
      setIsAdmin(isAdminUser)

      // Use public API endpoint with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      })
      
      const apiPromise = publicApi.get('/settings/maintenance-status')
      const response = await Promise.race([apiPromise, timeoutPromise])
      
      if (response.data.success) {
        const isMaintenanceMode = response.data.data?.maintenanceMode || false
        
        // Admin users can bypass maintenance mode
        if (isMaintenanceMode && !isAdminUser) {
          maintenanceModeRef.current = true
          setMaintenanceMode(true)
        } else {
          // If maintenance mode is disabled, clear the maintenance state immediately
          maintenanceModeRef.current = false
          setMaintenanceMode(false)
        }
      }
    } catch (error) {
      // Silently fail - don't spam console with errors
      // Only log if it's not a timeout or network error
      if (error.code !== 'ECONNABORTED' && error.code !== 'ERR_NETWORK' && !error.message?.includes('timeout')) {
        console.warn('Maintenance check error:', error.message)
      }
      // On error, allow access (fail open) - don't block users if backend is down
      setMaintenanceMode(false)
    } finally {
      setChecking(false)
    }
  }, [location.pathname])

  useEffect(() => {
    checkMaintenanceStatus()
    
    // Use exponential backoff to reduce spam if backend is down
    let retryCount = 0
    const maxRetryCount = 3
    
    const scheduleNextCheck = () => {
      // Start with 5 seconds, increase to 30 seconds if backend is down
      const delay = retryCount < maxRetryCount ? 5000 : 30000
      
      setTimeout(() => {
        checkMaintenanceStatus().then(() => {
          // Reset retry count on success
          retryCount = 0
          scheduleNextCheck()
        }).catch(() => {
          // Increment retry count on error
          retryCount = Math.min(retryCount + 1, maxRetryCount)
          scheduleNextCheck()
        })
      }, delay)
    }
    
    scheduleNextCheck()
    
    // Listen for maintenance mode changes from admin settings
    const handleMaintenanceChange = (event) => {
      // Check immediately when admin changes maintenance mode
      checkMaintenanceStatus()
    }
    window.addEventListener('maintenanceModeChanged', handleMaintenanceChange)
    
    return () => {
      window.removeEventListener('maintenanceModeChanged', handleMaintenanceChange)
    }
  }, [checkMaintenanceStatus])

  // Always allow admin routes and admin users - bypass maintenance completely
  const isAdminRoute = location.pathname.startsWith('/admin')
  const userStr = localStorage.getItem('user')
  const adminUserStr = localStorage.getItem('adminUser')
  const user = userStr ? JSON.parse(userStr) : null
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
  const isAdminUser = (user && user.role === 'admin') || (adminUser && adminUser.role === 'admin')

  if (isAdminRoute || isAdminUser) {
    // Admin routes and admin users always bypass maintenance
    return children
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  if (maintenanceMode) {
    return <MaintenancePage />
  }

  return children
}

export default MaintenanceCheck

