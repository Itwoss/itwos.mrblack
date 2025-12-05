/**
 * API Configuration with automatic fallback
 * Tries network IP first, falls back to localhost if unavailable
 */

let cachedBaseURL = null
let cachedServerURL = null

/**
 * Check if a URL is reachable
 */
const checkUrlReachable = async (url, timeout = 2000) => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues during check
    })
    
    clearTimeout(timeoutId)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get API base URL with automatic fallback
 */
export const getApiBaseURL = async () => {
  if (cachedBaseURL) {
    return cachedBaseURL
  }
  
  const networkURL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'
  const localhostURL = 'http://localhost:7000/api'
  
  // If already localhost, use it
  if (networkURL.includes('localhost')) {
    cachedBaseURL = networkURL
    return cachedBaseURL
  }
  
  // Try network URL first
  const isNetworkReachable = await checkUrlReachable(networkURL.replace('/api', ''))
  
  if (isNetworkReachable) {
    cachedBaseURL = networkURL
  } else {
    // Fallback to localhost
    console.warn('⚠️ Network API URL not reachable, falling back to localhost')
    cachedBaseURL = localhostURL
  }
  
  return cachedBaseURL
}

/**
 * Get server URL with automatic fallback
 */
export const getServerURL = async () => {
  if (cachedServerURL) {
    return cachedServerURL
  }
  
  const networkURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000'
  const localhostURL = 'http://localhost:7000'
  
  // If already localhost, use it
  if (networkURL.includes('localhost')) {
    cachedServerURL = networkURL
    return cachedServerURL
  }
  
  // Try network URL first
  const isNetworkReachable = await checkUrlReachable(networkURL)
  
  if (isNetworkReachable) {
    cachedServerURL = networkURL
  } else {
    // Fallback to localhost
    console.warn('⚠️ Network server URL not reachable, falling back to localhost')
    cachedServerURL = localhostURL
  }
  
  return cachedServerURL
}

/**
 * Initialize API configuration (call this on app startup)
 */
export const initApiConfig = async () => {
  await getApiBaseURL()
  await getServerURL()
}

