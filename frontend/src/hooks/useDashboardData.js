import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

// Custom hook for dashboard data with caching and error handling
export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    activeSubscriptions: 0,
    loyaltyPoints: 0
  })
  const [products, setProducts] = useState([])
  const [prebooks, setPrebooks] = useState([])
  const [loading, setLoading] = useState({
    stats: false,
    products: false,
    prebooks: false
  })
  const [errors, setErrors] = useState({
    stats: null,
    products: null,
    prebooks: null
  })
  
  // Cache with timestamps
  const cache = useRef({
    stats: { data: null, timestamp: 0 },
    products: { data: null, timestamp: 0 },
    prebooks: { data: null, timestamp: 0 }
  })
  
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  const isCacheValid = (cacheKey) => {
    const now = Date.now()
    return cache.current[cacheKey] && 
           (now - cache.current[cacheKey].timestamp) < CACHE_DURATION
  }

  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('stats')) {
      setStats(cache.current.stats.data)
      return
    }

    setLoading(prev => ({ ...prev, stats: true }))
    setErrors(prev => ({ ...prev, stats: null }))
    
    try {
      const response = await api.get('/users/me/stats')
      if (response.data.success) {
        const data = response.data.data
        setStats(data)
        cache.current.stats = { data, timestamp: Date.now() }
      } else {
        throw new Error('Failed to fetch user statistics')
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setErrors(prev => ({ ...prev, stats: 'Failed to load statistics' }))
      // Use cached data if available
      if (cache.current.stats.data) {
        setStats(cache.current.stats.data)
      }
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }, [])

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('products')) {
      setProducts(cache.current.products.data)
      return
    }

    setLoading(prev => ({ ...prev, products: true }))
    setErrors(prev => ({ ...prev, products: null }))
    
    try {
      const response = await api.get('/products')
      if (response.data.success) {
        const data = response.data.data.products || []
        setProducts(data)
        cache.current.products = { data, timestamp: Date.now() }
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setErrors(prev => ({ ...prev, products: 'Failed to load products' }))
      // Use cached data if available
      if (cache.current.products.data) {
        setProducts(cache.current.products.data)
      }
    } finally {
      setLoading(prev => ({ ...prev, products: false }))
    }
  }, [])

  const fetchPrebooks = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('prebooks')) {
      setPrebooks(cache.current.prebooks.data)
      return
    }

    setLoading(prev => ({ ...prev, prebooks: true }))
    setErrors(prev => ({ ...prev, prebooks: null }))
    
    try {
      const response = await api.get('/prebook?limit=5')
      if (response.data.success) {
        const data = response.data.data?.prebooks || []
        setPrebooks(data)
        cache.current.prebooks = { data, timestamp: Date.now() }
      } else {
        throw new Error('Failed to fetch prebooks')
      }
    } catch (error) {
      console.error('Error fetching prebooks:', error)
      setErrors(prev => ({ ...prev, prebooks: 'Failed to load prebook data' }))
      // Use cached data if available
      if (cache.current.prebooks.data) {
        setPrebooks(cache.current.prebooks.data)
      }
    } finally {
      setLoading(prev => ({ ...prev, prebooks: false }))
    }
  }, [])

  const refreshAll = useCallback(() => {
    fetchStats(true)
    fetchProducts(true)
    fetchPrebooks(true)
  }, [fetchStats, fetchProducts, fetchPrebooks])

  const clearCache = useCallback(() => {
    cache.current = {
      stats: { data: null, timestamp: 0 },
      products: { data: null, timestamp: 0 },
      prebooks: { data: null, timestamp: 0 }
    }
  }, [])

  return {
    stats,
    products,
    prebooks,
    loading,
    errors,
    fetchStats,
    fetchProducts,
    fetchPrebooks,
    refreshAll,
    clearCache
  }
}

export default useDashboardData