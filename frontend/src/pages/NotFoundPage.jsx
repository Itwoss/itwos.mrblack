import React from 'react'
import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div style={{ padding: '2rem', background: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Link to="/">
            <Button type="primary">Back Home</Button>
          </Link>
        }
      />
    </div>
  )
}

export default NotFoundPage