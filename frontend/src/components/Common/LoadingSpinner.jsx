import React from 'react'
import { Spin } from 'antd'

const LoadingSpinner = ({ size = 'large', tip = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spin size={size} tip={tip} />
    </div>
  )
}

export default LoadingSpinner
