import React from 'react'
import { Button, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle = ({ size = 'default', style = {} }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <Tooltip title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
      <Button
        type="text"
        icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
        onClick={toggleTheme}
        size={size}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme === 'light' ? '#1e293b' : '#f1f5f9',
          ...style
        }}
        className="theme-toggle-button"
      />
    </Tooltip>
  )
}

export default ThemeToggle

