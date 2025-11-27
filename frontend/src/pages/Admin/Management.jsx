import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  TeamOutlined,
  PictureOutlined,
  FileTextOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import AdminDesignSystem from '../../styles/admin-design-system';
import UserManagement from './UserManagement';
import BannerManagement from './BannerManagement';
import PostManagement from './PostManagement';
import ContentManagement from './ContentManagement';
import PrebookManagement from './PrebookManagement';

const { Sider, Content } = Layout;
const { Title } = Typography;

const Management = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Get current management page from URL
  const getCurrentKey = () => {
    const path = location.pathname;
    if (path.includes('/admin/management/users') || path === '/admin/management') return 'users';
    if (path.includes('/admin/management/banners')) return 'banners';
    if (path.includes('/admin/management/posts')) return 'posts';
    if (path.includes('/admin/management/content')) return 'content';
    if (path.includes('/admin/management/prebooks')) return 'prebooks';
    return 'users'; // Default
  };

  // Navigate to users by default if on base management path
  useEffect(() => {
    if (location.pathname === '/admin/management' || location.pathname === '/admin/management/') {
      navigate('/admin/management/users', { replace: true });
    }
  }, [location.pathname, navigate]);

  const menuItems = [
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: 'banners',
      icon: <PictureOutlined />,
      label: 'Banner Management',
    },
    {
      key: 'posts',
      icon: <FileTextOutlined />,
      label: 'Post Management',
    },
    {
      key: 'content',
      icon: <FileTextOutlined />,
      label: 'Content Management',
    },
    {
      key: 'prebooks',
      icon: <DollarOutlined />,
      label: 'Prebook Management',
    },
  ];

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'users':
        navigate('/admin/management/users');
        break;
      case 'banners':
        navigate('/admin/management/banners');
        break;
      case 'posts':
        navigate('/admin/management/posts');
        break;
      case 'content':
        navigate('/admin/management/content');
        break;
      case 'prebooks':
        navigate('/admin/management/prebooks');
        break;
      default:
        navigate('/admin/management/users');
    }
  };

  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: AdminDesignSystem.colors.background 
    }}>
      {/* Mini Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
        style={{
          background: AdminDesignSystem.colors.sidebar.background,
          borderRight: `1px solid ${AdminDesignSystem.colors.card.border}`,
        }}
        theme="light"
      >
        <div style={{
          padding: AdminDesignSystem.spacing.lg,
          borderBottom: `1px solid ${AdminDesignSystem.colors.card.border}`,
          textAlign: collapsed ? 'center' : 'left'
        }}>
          <Title 
            level={4} 
            style={{ 
              margin: 0,
              color: AdminDesignSystem.colors.text.primary,
              fontSize: collapsed ? '14px' : '16px'
            }}
          >
            {collapsed ? 'M' : 'Management'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getCurrentKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            background: 'transparent',
            marginTop: AdminDesignSystem.spacing.md
          }}
        />
      </Sider>

      {/* Content Area */}
      <Content style={{
        padding: AdminDesignSystem.spacing.xl,
        background: AdminDesignSystem.colors.background,
        overflow: 'auto',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <Routes>
          <Route path="users" element={<UserManagement />} />
          <Route path="banners" element={<BannerManagement />} />
          <Route path="posts" element={<PostManagement />} />
          <Route path="content" element={<ContentManagement />} />
          <Route path="prebooks" element={<PrebookManagement />} />
          <Route index element={<UserManagement />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default Management;
