import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import { AuthProvider } from './contexts/AuthContextOptimized'
import { CallProvider } from './contexts/CallContext'
import './styles/design-tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/typography.css'
import './styles/table.css'
import './styles/responsive.css'
import './styles/mobile-responsive.css'
import Layout from './components/Layout'
import DashboardLayout from './components/DashboardLayout'
import UserLayout from './components/UserLayout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'
import Dashboard from './pages/User/Dashboard'
import Wishlist from './pages/User/Wishlist'
import UserNotifications from './pages/User/Notifications'
import Messages from './pages/User/Messages'
import Reviews from './pages/User/Reviews'
import Settings from './pages/User/Settings'
import Profile from './pages/User/Profile'
import UserProfile from './pages/User/UserProfile'
import Following from './pages/User/Following'
import HelpCenter from './pages/User/HelpCenter'
import AudioDownloader from './pages/User/AudioDownloader'
import UserPurchases from './pages/User/UserPurchases'
import UserFavorites from './pages/User/UserFavorites'
import UserChat from './pages/User/UserChat'
import GlobalChat from './pages/User/GlobalChat'
import VideoCall from './pages/User/VideoCall'
import AudioCall from './pages/User/AudioCall'
import UserDiscovery from './pages/User/UserDiscovery'
import UserNetwork from './pages/User/UserNetwork'
import NewUsers from './pages/User/NewUsers'
import MyPrebooks from './pages/User/MyPrebooks'
import VerifiedBadge from './pages/User/VerifiedBadge'
import Feed from './pages/User/Feed'
import PostCreation from './pages/User/PostCreation'
import BannerStore from './pages/User/BannerStore'
import BannerInventory from './pages/User/BannerInventory'
import Store from './pages/User/Store'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import AdminLoginPage from './pages/Admin/AdminLoginPage'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminAPITest from './pages/Admin/AdminAPITest'
import UserManagement from './pages/Admin/UserManagement'
import OrdersSales from './pages/Admin/OrdersSales'
import Analytics from './pages/Admin/Analytics'
import AnalyticsDashboard from './pages/Admin/AnalyticsDashboard'
import ContentManagement from './pages/Admin/ContentManagement'
import AdminNotifications from './pages/Admin/Notifications'
import AdminSettings from './pages/Admin/Settings'
import GlobalChatModeration from './pages/Admin/GlobalChatModeration'
import NotFoundPage from './pages/NotFoundPage'
import ErrorBoundary from './components/ErrorBoundary'
import MaintenanceCheck from './components/MaintenanceCheck'
import AddProduct from './pages/Admin/AddProduct'
import Products from './pages/Admin/Products'
import PrebookManagement from './pages/Admin/PrebookManagement'
import BannerManagement from './pages/Admin/BannerManagement'
import PaymentTracking from './pages/Admin/PaymentTracking'
import UserActivities from './pages/Admin/UserActivities'
import PostManagement from './pages/Admin/PostManagement'
import TrendingAnalytics from './pages/Admin/TrendingAnalytics'
import TrendingSettings from './pages/Admin/TrendingSettings'
import Management from './pages/Admin/Management'
import ProductsPage from './pages/Products/ProductsPage'
import ProductDetail from './pages/Products/ProductDetail'
import PrebookPreview from './pages/Products/PrebookPreview'
import PaymentSuccess from './pages/PaymentSuccess'

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
          },
        }}
      >
        <AntApp>
          <AuthProvider>
              <Router future={{ 
                v7_relativeSplatPath: true,
                v7_startTransition: true 
              }}>
                <CallProvider>
                <MaintenanceCheck>
                <div className="App">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/about" element={<Layout><AboutPage /></Layout>} />
                  <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
                  
                  {/* Root Route - Redirect to login if not authenticated, feed if authenticated */}
                  <Route path="/" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Feed /></UserLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* User Routes - Protected */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Dashboard /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/products" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><ProductsPage /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/:userId" element={
                    <ProtectedRoute requiredRole="user">
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/user/:userId" element={
                    <ProtectedRoute requiredRole="user">
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Profile /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/following" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Following /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/purchases" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserPurchases /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/prebooks" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><MyPrebooks /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/favorites" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserFavorites /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserChat /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/global-chat" element={
                    <ProtectedRoute requiredRole="user">
                      <GlobalChat />
                    </ProtectedRoute>
                  } />
                  <Route path="/video-call/:userId" element={
                    <ProtectedRoute requiredRole="user">
                      <VideoCall />
                    </ProtectedRoute>
                  } />
                  <Route path="/audio-call/:userId" element={
                    <ProtectedRoute requiredRole="user">
                      <AudioCall />
                    </ProtectedRoute>
                  } />
                  <Route path="/feed" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Feed /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/audio-downloader" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><AudioDownloader /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/post/create" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><PostCreation /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/store" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Store /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/banner-store" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><BannerStore /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/banner-inventory" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><BannerInventory /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/discover" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserDiscovery /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/new-users" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><NewUsers /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/network" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserNetwork /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/notifications" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><UserNotifications /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/wishlist" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Wishlist /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/messages" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Messages /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/reviews" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Reviews /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><Settings /></UserLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/help" element={
                    <ProtectedRoute requiredRole="user">
                      <UserLayout><HelpCenter /></UserLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Product Routes */}
                  <Route path="/products" element={<Layout><ProductsPage /></Layout>} />
                  <Route path="/product/:slug" element={<Layout><ProductDetail /></Layout>} />
                  <Route path="/prebook/preview" element={<Layout><PrebookPreview /></Layout>} />
                  
                  {/* Payment Success Route */}
                  <Route path="/payment/success" element={<Layout><PaymentSuccess /></Layout>} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AdminDashboard /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AdminDashboard /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/api-test" element={<AdminAPITest />} />
                  {/* Management Routes with Nested Layout */}
                  <Route path="/admin/management/*" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><Management /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Legacy routes - redirect to management */}
                  <Route path="/admin/users" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><UserManagement /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/orders" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><OrdersSales /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/analytics" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><Analytics /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/analytics/usage" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AnalyticsDashboard /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/content" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><ContentManagement /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/notifications" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AdminNotifications /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AdminSettings /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/products" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><Products /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/prebooks" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><PrebookManagement /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/payments" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><PaymentTracking /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/user-activities" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><UserActivities /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/global-chat" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><GlobalChatModeration /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/products/new" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><AddProduct /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/trending" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><TrendingAnalytics /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/trending/settings" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout><TrendingSettings /></AdminLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 Route */}
                  <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
                </Routes>
              </div>
                </MaintenanceCheck>
                </CallProvider>
            </Router>
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App
