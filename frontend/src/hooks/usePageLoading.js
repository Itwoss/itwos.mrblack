import { useState, useEffect } from 'react'

/**
 * Hook to prevent infinite loading states
 * Automatically sets loading to false after a timeout
 */
export const usePageLoading = (initialLoading = true, timeout = 3000) => {
  const [isLoading, setIsLoading] = useState(initialLoading)
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('Page loading timeout - forcing render')
        setIsLoading(false)
      }, timeout)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, timeout])
  
  return [isLoading, setIsLoading]
}

