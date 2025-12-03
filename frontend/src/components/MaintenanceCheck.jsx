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
        console.log('✅ Admin route detected, bypassing maintenance check')
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

      // Use public API endpoint
      const response = await publicApi.get('/settings/maintenance-status')
      
      if (response.data.success) {
        const isMaintenanceMode = response.data.data?.maintenanceMode || false
        
        console.log('🔍 Maintenance check result:', {
          isMaintenanceMode,
          isAdminUser,
          willShowMaintenance: isMaintenanceMode && !isAdminUser,
          currentState: maintenanceMode
        })
        
        // Admin users can bypass maintenance mode
        if (isMaintenanceMode && !isAdminUser) {
          console.log('✅ Setting maintenance mode ON')
          maintenanceModeRef.current = true
          setMaintenanceMode(true)
        } else {
          // If maintenance mode is disabled, clear the maintenance state immediately
          console.log('✅ Setting maintenance mode OFF - maintenance disabled or user is admin')
          maintenanceModeRef.current = false
          setMaintenanceMode(false)
        }
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error)
      // On error, allow access (fail open)
      setMaintenanceMode(false)
    } finally {
      setChecking(false)
    }
  }, [location.pathname])

  useEffect(() => {
    checkMaintenanceStatus()
    // Check every 5 seconds for faster response when admin disables maintenance
    const interval = setInterval(checkMaintenanceStatus, 5000)
    
    // Listen for maintenance mode changes from admin settings
    const handleMaintenanceChange = (event) => {
      console.log('🔄 Maintenance mode changed event received:', event.detail)
      // Check immediately when admin changes maintenance mode
      checkMaintenanceStatus()
    }
    window.addEventListener('maintenanceModeChanged', handleMaintenanceChange)
    
    return () => {
      clearInterval(interval)
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

