import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Input, 
  Select, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Pagination, 
  Spin, 
  App,
  Layout,
  Badge,
  Empty,
  Drawer
} from 'antd'
import { 
  SearchOutlined, 
  FilterOutlined, 
  HeartOutlined, 
  ShoppingCartOutlined, 
  StarOutlined, 
  EyeOutlined, 
  MenuOutlined,
  CloseOutlined,
  FireOutlined,
  CrownOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { productAPI } from '../../services/api'
import '../../styles/mobile-products.css'
import '../../styles/mobile-products-fix.css'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { Search } = Input
const { Sider, Content } = Layout

const ProductsPage = () => {
  const { message } = App.useApp()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    tag: '',
    priceRange: '',
    sortBy: 'latest'
  })
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  })
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchTags()
  }, [filters, pagination.current])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Prepare params for API call
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
        ...(filters.priceRange && { 
          minPrice: filters.priceRange.split('-')[0],
          maxPrice: filters.priceRange.split('-')[1]
        }),
        sortBy: filters.sortBy
      }

      console.log('🔍 Fetching products with params:', params)
      const response = await productAPI.getProducts(params)
      console.log('📦 Products response:', response.data)
      
      if (response.data.success) {
        setProducts(response.data.data?.products || response.data.products || [])
        setPagination(prev => ({ 
          ...prev, 
          total: response.data.data?.pagination?.total || response.data.pagination?.total || 0
        }))
        console.log('✅ Products loaded successfully:', (response.data.data?.products || response.data.products || []).length)
      } else {
        console.log('❌ API error:', response.data.message)
        setProducts([])
        setPagination(prev => ({ 
          ...prev, 
          total: 0 
        }))
        message.error(response.data.message || 'Failed to load products. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      setProducts([])
      setPagination(prev => ({ 
        ...prev, 
        total: 0 
      }))
      message.error(error.response?.data?.message || 'Failed to load products. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories()
      const data = response.data
      if (data.success && data.data?.categories?.length > 0) {
        setCategories(data.data.categories)
      } else {
        // Comprehensive fallback categories
        setCategories([
          'All Categories',
          'Web Development', 
          'Mobile Apps', 
          'E-commerce', 
          'Corporate Websites',
          'Portfolio Sites',
          'Blog Platforms',
          'SaaS Applications',
          'Landing Pages',
          'Admin Dashboards',
          'API Development',
          'UI/UX Design'
        ])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Comprehensive fallback categories
      setCategories([
        'All Categories',
        'Web Development', 
        'Mobile Apps', 
        'E-commerce', 
        'Corporate Websites',
        'Portfolio Sites',
        'Blog Platforms',
        'SaaS Applications',
        'Landing Pages',
        'Admin Dashboards',
        'API Development',
        'UI/UX Design'
      ])
    }
  }

  const fetchTags = async () => {
    try {
      const response = await productAPI.getTags()
      const data = response.data
      if (data.success && data.data?.tags?.length > 0) {
        setTags(data.data.tags)
      } else {
        // Comprehensive fallback tags
        setTags([
          'All', 
          'Trending', 
          'Gold', 
          'Silver', 
          'Platinum', 
          'New', 
          'Popular', 
          'Premium',
          'Featured',
          'Best Seller',
          'Hot',
          'Recommended'
        ])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      // Comprehensive fallback tags
      setTags([
        'All', 
        'Trending', 
        'Gold', 
        'Silver', 
        'Platinum', 
        'New', 
        'Popular', 
        'Premium',
        'Featured',
        'Best Seller',
        'Hot',
        'Recommended'
      ])
    }
  }

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    // If "All Categories" is selected, clear the category filter
    const filterValue = category === 'All Categories' ? '' : category
    handleFilterChange('category', filterValue)
    setMobileDrawerVisible(false)
  }

  const handleTagSelect = (tag) => {
    setSelectedTag(tag)
    // If "All" is selected, clear the tag filter
    const filterValue = tag === 'All' ? '' : tag
    handleFilterChange('tag', filterValue)
  }

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  const getTagColor = (tag) => {
    const colors = {
      'All': 'default',
      'Trending': 'red',
      'Popular': 'blue',
      'New': 'green',
      'Premium': 'gold',
      'Gold': 'gold',
      'Silver': 'default',
      'Platinum': 'purple',
      'Featured': 'cyan',
      'Best Seller': 'magenta',
      'Hot': 'red',
      'Recommended': 'green'
    }
    return colors[tag] || 'default'
  }

  const getTagIcon = (tag) => {
    const icons = {
      'All': null,
      'Trending': <FireOutlined />,
      'Gold': <CrownOutlined />,
      'Silver': <ThunderboltOutlined />,
      'Platinum': <CrownOutlined />,
      'New': <StarOutlined />,
      'Popular': <EyeOutlined />,
      'Premium': <CrownOutlined />,
      'Featured': <StarOutlined />,
      'Best Seller': <CrownOutlined />,
      'Hot': <FireOutlined />,
      'Recommended': <StarOutlined />
    }
    return icons[tag] || null
  }

  const CategorySidebar = () => (
    <div className="categories-sidebar">
      <div className="categories-header">
        <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
          Categories
        </Title>
      </div>
      <div className="categories-list">
        {categories.map(category => (
          <div 
            key={category}
            className={`category-item ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => handleCategorySelect(category)}
          >
            <span>{category}</span>
          </div>
        ))}
      </div>
        </div>
  )

  const TagsFilter = () => (
    <div className="tags-filter">
      <div className="tags-container">
        {tags.map(tag => (
          <Tag
            key={tag}
            color={selectedTag === tag ? getTagColor(tag) : 'default'}
            icon={getTagIcon(tag)}
            className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => handleTagSelect(tag)}
            style={{ 
              cursor: 'pointer',
              marginBottom: '8px',
              marginRight: '8px',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: selectedTag === tag ? 'bold' : 'normal',
              transition: 'all 0.3s ease',
              border: selectedTag === tag ? '2px solid #52c41a' : '1px solid #d9d9d9'
            }}
          >
            {tag}
          </Tag>
        ))}
      </div>
    </div>
  )

  const ProductCard = ({ product }) => (
    <Col xs={24} sm={12} lg={8} xl={6} key={product._id}>
      <Card
        hoverable
        className="product-card"
        style={{
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elev-1)',
          overflow: 'hidden',
          transition: 'all var(--transition-base)'
        }}
        cover={
          <div 
            className="product-image-container"
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', /* 16:9 aspect ratio */
              overflow: 'hidden',
              backgroundColor: 'var(--bg-tertiary)'
            }}
          >
                <img
                  alt={product.title}
                  src={product.thumbnailUrl ? `http://localhost:7000${product.thumbnailUrl}` : '/placeholder-image.svg'}
                  onError={(e) => {
                    e.target.src = '/placeholder-image.svg'
                  }}
              className="product-image"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
                />
            <div 
              className="product-tags"
              style={{
                position: 'absolute',
                top: 'var(--space-sm)',
                left: 'var(--space-sm)',
                display: 'flex',
                gap: 'var(--space-xs)',
                flexWrap: 'wrap'
              }}
            >
              {product.tags?.slice(0, 2).map(tag => (
                <Tag 
                  key={tag} 
                  color={getTagColor(tag)}
                  className="product-tag"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--type-small)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    margin: 0
                  }}
                >
                      {tag}
                </Tag>
                  ))}
                </div>
            <div 
              className="product-views"
              style={{
                position: 'absolute',
                bottom: 'var(--space-sm)',
                right: 'var(--space-sm)',
                backgroundColor: 'var(--bg-overlay)',
                color: 'var(--text-inverse)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--type-small)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
            >
              <EyeOutlined /> {product.views || 0}
                </div>
              </div>
        }
        actions={[
                  <Button 
            key="favorite"
                    icon={<HeartOutlined />} 
            className="product-action favorite"
            style={{
              minHeight: 'var(--touch-target-min)',
              width: '100%',
              border: 'none',
              borderRadius: 0
            }}
                  >
                    Save
          </Button>,
          <Link key="prebook" to={`/product/${product.slug || product._id}`}>
                  <Button 
                    icon={<ShoppingCartOutlined />} 
              className="product-action primary"
              type="primary"
              style={{
                minHeight: 'var(--touch-target-min)',
                width: '100%',
                borderRadius: 0
              }}
                    >
                      Prebook
                    </Button>
                  </Link>
        ]}
        styles={{
          body: {
            padding: 'var(--space-md)'
          }
        }}
      >
        <Card.Meta
          title={
            <div 
              className="product-title"
              style={{
                marginBottom: 'var(--space-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-xs)'
              }}
            >
              <Text 
                strong 
                style={{ 
                  fontSize: 'var(--type-body)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--text-primary)',
                  flex: 1
                }}
              >
                {product.title}
              </Text>
              {product.category && (
                <Tag 
                  color="blue" 
                  style={{ 
                    fontSize: 'var(--type-small)',
                    borderRadius: 'var(--radius-full)',
                    margin: 0
                  }}
                >
                  {product.category}
                </Tag>
              )}
            </div>
          }
          description={
            <div>
              <Paragraph 
                style={{ 
                  color: 'var(--text-secondary)', 
                  margin: '0 0 var(--space-sm) 0', 
                  fontSize: 'var(--type-small)',
                  lineHeight: 'var(--line-relaxed)'
                }}
                ellipsis={{ rows: 2 }}
              >
                {product.description?.short || product.description || 'No description available'}
              </Paragraph>
              <div 
                className="product-rating"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  marginBottom: 'var(--space-sm)'
                }}
              >
                <StarOutlined style={{ color: 'var(--warning)' }} />
                <Text style={{ fontSize: 'var(--type-small)' }}>
                  {product.rating?.average?.toFixed(1) || '4.5'}
                </Text>
                <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--type-caption)' }}>
                  ({product.rating?.count || 0})
                </Text>
              </div>
              <div 
                className="product-price"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text strong style={{ color: 'var(--success)', fontSize: 'var(--type-h3)' }}>
                  Prebook: ${product.prebookAmount?.toLocaleString() || '0'}
                </Text>
                </div>
              <div className="product-meta">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {product.preBookings || 0} pre-bookings
                </Text>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  )

  return (
    <div className="products-page">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <Title level={2} style={{ margin: 0, color: '#fff' }}>
            Our Products
          </Title>
          <Button 
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerVisible(true)}
            className="mobile-menu-button"
          />
        </div>
      </div>

      <Layout className="products-layout">
        {/* Desktop Sidebar */}
        <Sider 
          width={280} 
          className="desktop-sidebar"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <CategorySidebar />
        </Sider>

        {/* Main Content */}
        <Content className="products-content">
          {/* Search Bar */}
          <div 
            className="search-section"
            style={{
              marginBottom: 'var(--space-lg)',
              padding: '0 var(--container-padding-mobile)'
            }}
          >
            <Search
              placeholder="Search products..."
              allowClear
              onSearch={handleSearch}
              size="large"
              style={{ 
                maxWidth: '400px',
                width: '100%'
              }}
            />
        </div>

          {/* Tags Filter */}
          <div 
            className="tags-section"
            style={{
              marginBottom: 'var(--space-lg)',
              padding: '0 var(--container-padding-mobile)'
            }}
          >
            <TagsFilter />
            </div>

          {/* Products Grid */}
          <div 
            className="products-section"
            style={{
              padding: '0 var(--container-padding-mobile)'
            }}
          >
            <Spin spinning={loading}>
              {products.length === 0 ? (
                <Empty 
                  description="No products found"
                  style={{ 
                    padding: 'var(--space-xxl)',
                    color: 'var(--text-secondary)'
                  }}
                >
            <Button 
              onClick={() => {
                setFilters({
                  search: '',
                  category: '',
                        tag: '',
                  priceRange: '',
                  sortBy: 'latest'
                })
                      setSelectedCategory('')
                      setSelectedTag('')
              }}
                    style={{ minHeight: 'var(--touch-target-min)' }}
            >
              Clear Filters
            </Button>
                </Empty>
              ) : (
                <Row gutter={[24, 24]}>
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </Row>
              )}
            </Spin>

        {/* Pagination */}
        {pagination.total > 0 && (
              <div className="pagination-section">
                <Pagination
                  current={pagination.current}
                  total={pagination.total}
                  pageSize={pagination.pageSize}
                  onChange={handlePageChange}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => 
                    `${range[0]}-${range[1]} of ${total} products`
                  }
                />
              </div>
            )}
          </div>
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title="Categories"
        placement="left"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        width={280}
        className="mobile-drawer"
      >
        <CategorySidebar />
      </Drawer>

      <style jsx="true">{`
        .products-page {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .mobile-header {
          display: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .mobile-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mobile-menu-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
        }

        .products-layout {
          background: #f5f5f5;
          min-height: calc(100vh - 80px);
        }

        .desktop-sidebar {
          background: #fff;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
        }

        .products-content {
          padding: 2rem;
          background: #f5f5f5;
        }

        .categories-sidebar {
          padding: 1.5rem;
        }

        .categories-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .category-item {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          color: #666;
        }

        .category-item:hover {
          background: #f0f9ff;
          color: #1890ff;
        }

        .category-item.active {
          background: #52c41a;
          color: #fff;
          font-weight: 600;
        }

        .search-section {
          margin-bottom: 2rem;
          text-align: center;
        }

        .tags-section {
          margin-bottom: 2rem;
          background: #fff;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: flex-start;
          align-items: center;
        }

        .tag-item {
          transition: all 0.3s ease;
        }

        .tag-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .products-section {
          background: #fff;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .product-card {
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .product-image-container {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.05);
        }

        .product-tags {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-tag {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .product-views {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        .product-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .product-rating {
          display: flex;
          align-items: center;
          margin: 8px 0;
        }

        .product-price {
          margin: 8px 0;
        }

        .product-meta {
          margin-top: 8px;
        }

        .product-action {
          border-radius: 6px;
          font-weight: 500;
        }

        .product-action.favorite {
          color: #ff4d4f;
          border-color: #ff4d4f;
        }

        .product-action.primary {
          background: #52c41a;
          border-color: #52c41a;
          color: #fff;
        }

        .pagination-section {
          margin-top: 2rem;
          text-align: center;
        }

        .mobile-drawer .ant-drawer-body {
          padding: 0;
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: block;
          }

          .desktop-sidebar {
            display: none;
          }

          .products-content {
            padding: 1rem;
          }

          .tags-section {
            padding: 1rem;
          }

          .products-section {
            padding: 1rem;
          }

          .tags-container {
            justify-content: center;
            padding: 0.5rem;
          }

          .tag-item {
            margin: 2px;
            font-size: 12px;
            padding: 4px 12px;
          }
        }

        @media (max-width: 576px) {
          .product-card {
            margin-bottom: 1rem;
          }

          .product-image-container {
            height: 150px;
          }
        }
      `}</style>
    </div>
  )
}

export default ProductsPage