/**
 * Admin Dashboard Design System
 * Complete color, typography, and spacing system
 */

export const AdminDesignSystem = {
  // Colors
  colors: {
    // Primary Colors
    background: '#FFFFFF',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      white: '#FFFFFF',
      disabled: '#9CA3AF',
    },
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    
    // Sidebar Colors
    sidebar: {
      background: '#F8FAFC',
      activeBackground: '#3B82F6',
      activeText: '#FFFFFF',
      hoverBackground: '#E5E7EB',
      text: '#1F2937',
      border: '#E5E7EB',
    },
    
    // Header Colors
    header: {
      background: '#FFFFFF',
      text: '#1F2937',
      border: '#E5E7EB',
    },
    
    // Card Colors
    card: {
      background: '#FFFFFF',
      border: '#E5E7EB',
      shadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
  },

  // Typography
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      h1: '2rem',      // 32px
      h2: '1.5rem',    // 24px
      h3: '1.25rem',   // 20px
      h4: '1.125rem',  // 18px
      body: '1rem',    // 16px
      small: '0.875rem', // 14px
      tiny: '0.75rem',   // 12px
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: 1.5,
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Layout
  layout: {
    sidebar: {
      width: '280px',
      collapsedWidth: '80px',
    },
    header: {
      height: '64px',
    },
    content: {
      padding: '24px',
    },
  },

  // Border Radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 1px 3px rgba(0,0,0,0.1)',
    lg: '0 4px 6px rgba(0,0,0,0.1)',
    xl: '0 10px 15px rgba(0,0,0,0.1)',
  },

  // Breakpoints
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px',
  },
}

export default AdminDesignSystem

