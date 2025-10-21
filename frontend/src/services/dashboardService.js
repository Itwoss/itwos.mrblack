// Dashboard Service for Live Data Fetching
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'

class DashboardService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.refreshInterval = null
    this.subscribers = new Set()
  }

  // Get authentication token
  getAuthToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
  }

  // Get headers with authentication
  getHeaders() {
    const token = this.getAuthToken()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  // Fetch all dashboard statistics
  async fetchDashboardStats() {
    try {
      const response = await axios.get(`${this.baseURL}/admin/dashboard`, {
        headers: this.getHeaders()
      })
      return response.data.data
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  }

  // Fetch users statistics
  async fetchUsersStats() {
    try {
      const response = await axios.get(`${this.baseURL}/admin/users/stats`, {
        headers: this.getHeaders()
      })
      return response.data.data
    } catch (error) {
      console.error('Error fetching users stats:', error)
      return {
        totalUsers: 0,
        onlineUsers: 0,
        offlineUsers: 0,
        newUsersToday: 0,
        last30DaysUsers: 0,
        totalSpent: 0,
        topSpenders: []
      }
    }
  }

  // Fetch products statistics
  async fetchProductsStats() {
    try {
      const response = await axios.get(`${this.baseURL}/admin/products/stats`, {
        headers: this.getHeaders()
      })
      return response.data.data
    } catch (error) {
      console.error('Error fetching products stats:', error)
      return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        lowStockProducts: 0,
        featuredProducts: 0
      }
    }
  }

  // Fetch orders statistics
  async fetchOrdersStats() {
    try {
      const response = await axios.get(`${this.baseURL}/admin/orders/stats`, {
        headers: this.getHeaders()
      })
      return response.data.data
    } catch (error) {
      console.error('Error fetching orders stats:', error)
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        thisMonthRevenue: 0
      }
    }
  }

  // Fetch prebooks statistics
  async fetchPrebooksStats() {
    try {
      const response = await axios.get(`${this.baseURL}/prebook/admin/stats`, {
        headers: this.getHeaders()
      })
      return response.data.data
    } catch (error) {
      console.error('Error fetching prebooks stats:', error)
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
        totalPaid: 0
      }
    }
  }

  // Fetch recent users
  async fetchRecentUsers(limit = 5) {
    try {
      const response = await axios.get(`${this.baseURL}/admin/users?limit=${limit}`, {
        headers: this.getHeaders()
      })
      return response.data.data?.users || []
    } catch (error) {
      console.error('Error fetching recent users:', error)
      return []
    }
  }

  // Fetch recent orders
  async fetchRecentOrders(limit = 5) {
    try {
      const response = await axios.get(`${this.baseURL}/admin/orders?limit=${limit}`, {
        headers: this.getHeaders()
      })
      return response.data.data?.orders || []
    } catch (error) {
      console.error('Error fetching recent orders:', error)
      return []
    }
  }

  // Fetch recent prebooks
  async fetchRecentPrebooks(limit = 5) {
    try {
      const response = await axios.get(`${this.baseURL}/prebook/admin/all?limit=${limit}`, {
        headers: this.getHeaders()
      })
      return response.data.data?.prebooks || []
    } catch (error) {
      console.error('Error fetching recent prebooks:', error)
      return []
    }
  }

  // Subscribe to dashboard updates
  subscribe(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  // Notify all subscribers
  notify(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in dashboard subscriber:', error)
      }
    })
  }

  // Start auto-refresh
  startAutoRefresh(intervalMs = 30000) {
    this.stopAutoRefresh()
    this.refreshInterval = setInterval(async () => {
      try {
        const stats = await this.fetchDashboardStats()
        this.notify(stats)
      } catch (error) {
        console.error('Error in auto-refresh:', error)
      }
    }, intervalMs)
  }

  // Stop auto-refresh
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  // Manual refresh
  async refresh() {
    try {
      const stats = await this.fetchDashboardStats()
      this.notify(stats)
      return stats
    } catch (error) {
      console.error('Error in manual refresh:', error)
      throw error
    }
  }

  // Get dashboard overview (combined stats)
  async getDashboardOverview() {
    try {
      const stats = await this.fetchDashboardStats()
      return stats
    } catch (error) {
      console.error('Error fetching dashboard overview:', error)
      throw error
    }
  }
}

// Create singleton instance
const dashboardService = new DashboardService()

export default dashboardService
