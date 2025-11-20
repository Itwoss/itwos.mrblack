import React from 'react'
import './Input.css'

/**
 * iOS-Inspired Input Component
 * Ensures 44px minimum height for touch targets
 */
const Input = ({
  label,
  error,
  helperText,
  required = false,
  className = '',
  style = {},
  ...props
}) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="form-required"> *</span>}
        </label>
      )}
    <input
        id={inputId}
        className={`form-input ${hasError ? 'form-input-error' : ''}`}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <div id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </div>
      )}
      {helperText && !error && (
        <div id={`${inputId}-helper`} className="form-helper">
          {helperText}
        </div>
      )}
    </div>
  )
}

export default Input
