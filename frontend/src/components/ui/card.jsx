import React from 'react'
import './Card.css'

/**
 * iOS-Inspired Card Component
 * Supports header, body, footer, and hover elevation
 */
const Card = ({
  children,
  title,
  extra,
  footer,
  hoverable = true,
  compact = false,
  className = '',
  style = {},
  onClick,
  ...props
}) => {
  const classes = [
    'card',
    hoverable && 'card-hoverable',
    compact && 'card-compact',
    onClick && 'card-clickable',
    className
  ].filter(Boolean).join(' ')

  return (
  <div
      className={classes}
      style={style}
      onClick={onClick}
      {...props}
    >
      {title && (
        <div className="card-header">
          <div className="card-title">{title}</div>
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  )
}

export default Card
