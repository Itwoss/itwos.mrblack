import React from 'react'
import './Button.css'

/**
 * iOS-Inspired Button Component
 * Supports primary, secondary, ghost, and danger variants
 * Ensures 44px minimum touch target
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClass = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = `btn-${size}`
  const classes = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="btn-loading">Loading...</span>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children && <span className="btn-text">{children}</span>}
        </>
      )}
    </button>
  )
}

export default Button
