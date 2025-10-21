import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Result, Button } from 'antd'

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useSelector(state => state.auth)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Result
          status="403"
          title="403"
          subTitle="Sorry, you are not authorized to access this page."
          extra={
            <Button type="primary" href="/dashboard">
              Go to Dashboard
            </Button>
          }
        />
      </div>
    )
  }

  return children
}

export default AdminRoute
