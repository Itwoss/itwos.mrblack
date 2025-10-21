import React from 'react'

const DashboardLayout = ({ children, userRole = 'user' }) => {
  return (
    <div style={{ padding: '24px' }}>
      {children}
    </div>
  )
}

export default DashboardLayout