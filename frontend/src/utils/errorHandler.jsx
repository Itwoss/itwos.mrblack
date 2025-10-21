import React from 'react';

/**
 * Global Error Handler for ITWOS AI Frontend
 * Handles unhandled errors, promise rejections, and provides user-friendly error reporting
 */

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('🚨 Unhandled Error:', event.error);
  
  // Log error details for debugging
  const errorInfo = {
    message: event.error?.message || 'Unknown error',
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('Error Details:', errorInfo);
  
  // Show user-friendly error message
  showErrorNotification('An unexpected error occurred. Please refresh the page.');
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  
  // Log rejection details
  const rejectionInfo = {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('Promise Rejection Details:', rejectionInfo);
  
  // Show user-friendly error message
  showErrorNotification('A network or processing error occurred. Please try again.');
  
  // Prevent the default browser behavior
  event.preventDefault();
});

// React Error Boundary for catching React component errors
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error details
    const errorDetails = {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('React Error Details:', errorDetails);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          margin: '20px',
          color: '#dc2626'
        }}>
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Function to show error notifications to users
function showErrorNotification(message) {
  // Check if toast notification system is available
  if (window.toast) {
    window.toast.error(message);
    return;
  }
  
  // Fallback to browser alert if no toast system
  if (window.confirm(`${message}\n\nWould you like to reload the page?`)) {
    window.location.reload();
  }
}

// Function to handle API errors consistently
export function handleApiError(error, context = 'API call') {
  console.error(`🚨 ${context} Error:`, error);
  
  let userMessage = 'An error occurred. Please try again.';
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        userMessage = data?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        userMessage = 'Please log in to continue.';
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        break;
      case 403:
        userMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        userMessage = 'The requested resource was not found.';
        break;
      case 429:
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
        userMessage = 'Server error. Please try again later.';
        break;
      default:
        userMessage = data?.message || `Server error (${status}). Please try again.`;
    }
  } else if (error.request) {
    // Network error
    userMessage = 'Network error. Please check your connection and try again.';
  } else {
    // Other error
    userMessage = error.message || 'An unexpected error occurred.';
  }
  
  showErrorNotification(userMessage);
  return userMessage;
}

// Function to handle form validation errors
export function handleValidationError(errors) {
  console.error('🚨 Validation Error:', errors);
  
  if (Array.isArray(errors)) {
    const errorMessages = errors.map(error => error.message || error).join(', ');
    showErrorNotification(`Please fix the following errors: ${errorMessages}`);
  } else if (typeof errors === 'object') {
    const errorMessages = Object.values(errors).join(', ');
    showErrorNotification(`Please fix the following errors: ${errorMessages}`);
  } else {
    showErrorNotification(errors || 'Please check your input and try again.');
  }
}

// Function to log errors for debugging
export function logError(error, context = 'Application') {
  const errorLog = {
    message: error.message || 'Unknown error',
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: localStorage.getItem('userId') || 'anonymous'
  };
  
  console.error(`🚨 ${context} Error:`, errorLog);
  
  // In production, you might want to send this to an error tracking service
  // Example: sendToErrorTrackingService(errorLog);
}

// Function to create a retry mechanism for failed operations
export function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  };
}

// Initialize error handling
console.log('🛡️ Error handling initialized');

// API call with retry functionality
export const apiCallWithRetry = async (apiFunction, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      lastError = error;
      console.warn(`API call attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

// Dashboard-specific error handler
export const handleDashboardError = (error, context = 'Dashboard') => {
  console.error(`🚨 ${context} Error:`, error);
  
  let userMessage = 'An error occurred. Please try again.';
  
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        userMessage = data?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        userMessage = 'Please log in to continue.';
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        break;
      case 403:
        userMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        userMessage = 'The requested resource was not found.';
        break;
      case 500:
        userMessage = 'Server error. Please try again later.';
        break;
      default:
        userMessage = data?.message || `Server error (${status}). Please try again.`;
    }
  } else if (error.request) {
    userMessage = 'Network error. Please check your connection and try again.';
  } else {
    userMessage = error.message || 'An unexpected error occurred.';
  }
  
  // Show user-friendly error message
  if (window.toast) {
    window.toast.error(userMessage);
  } else {
    alert(userMessage);
  }
  
  return userMessage;
};

// Export default error handler
export default {
  ErrorBoundary,
  handleApiError,
  handleValidationError,
  logError,
  withRetry,
  apiCallWithRetry,
  handleDashboardError
};