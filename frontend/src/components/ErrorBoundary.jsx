import React from 'react';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error details for debugging
    const errorDetails = {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };
    
    console.error('ErrorBoundary Error Details:', errorDetails);
    
    // In production, you might want to send this to an error tracking service
    // Example: sendToErrorTrackingService(errorDetails);
  }

  handleReload = () => {
    // Reset error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReset = () => {
    // Try to reset error state without reloading
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            {/* Error Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: '2px solid #fecaca'
            }}>
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#dc2626" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>

            {/* Error Title */}
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1e293b',
              margin: '0 0 12px 0',
              lineHeight: '1.2'
            }}>
              Oops! Something went wrong
            </h1>

            {/* Error Description */}
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              margin: '0 0 16px 0',
              lineHeight: '1.5'
            }}>
              We're sorry, but something unexpected happened. Our team has been notified and we're working to fix it.
            </p>
            
            {/* Show actual error message in development or if available */}
            {(import.meta.env.MODE === 'development' || this.state.error) && (
              <div style={{
                fontSize: '14px',
                color: '#dc2626',
                margin: '0 0 32px 0',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                textAlign: 'left',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                <strong>Error:</strong> {this.state.error?.message || this.state.error?.toString() || 'Unknown error'}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f8fafc';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                Go Home
              </button>
              
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#10b981';
                }}
              >
                Try Again
              </button>
            </div>

            {/* Error ID for support */}
            <div style={{
              marginTop: '32px',
              padding: '16px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'left'
            }}>
              <strong>Error:</strong> {this.state.error?.message || this.state.error?.toString() || 'Unknown error'}
              <br />
              <strong>Time:</strong> {new Date().toLocaleString()}
              <br />
              <strong>URL:</strong> {window.location.href}
              {this.state.error?.stack && (
                <>
                  <br />
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Stack Trace</summary>
                    <pre style={{
                      marginTop: '4px',
                      padding: '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '10px',
                      maxHeight: '200px'
                    }}>
                      {this.state.error.stack}
                    </pre>
                  </details>
                </>
              )}
            </div>

            {/* Development Error Details */}
            {import.meta.env.MODE === 'development' && this.state.errorInfo && (
              <details style={{
                marginTop: '20px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                  Technical Details (Development)
                </summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
