'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Input,
  Typography,
  Button,
  Tooltip,
  Alert,
  Drawer,
  List,
  Tag,
  Empty,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  AlertOutlined,
  FileProtectOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  TranslationOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/store/auth-store';
import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { useTheme as useCustomTheme } from '@/contexts/theme-context';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check for mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setMobileCollapsed(true);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // Auth and theme
  const { user, logout } = useAuthStore();
  const { currentLanguage, setCurrentLanguage } = useCustomTheme();
  
  // WebSocket notifications
  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    markAsRead, 
    clearNotifications 
  } = useWebSocketContext();

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Check user role - support both role string and roles array
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';
  const isAdmin = userRole === 'ADMIN' || userRole === 'ROLE_ADMIN';
  const isManager = userRole === 'MANAGER' || userRole === 'ROLE_MANAGER';
  const isAnalyst = userRole === 'ANALYST' || userRole === 'ROLE_ANALYST';

  // Build menu items based on user role
  const buildMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: () => router.push('/dashboard'),
      },
      {
        key: 'cases-menu',
        icon: <FileProtectOutlined />,
        label: 'Cases',
        children: [
          // My Cases - visible to all users
          {
            key: '/cases/my-cases',
            label: 'My Cases',
            onClick: () => router.push('/cases/my-cases'),
          },
          // All Cases - only for admins and managers
          ...(isAdmin || isManager ? [{
            key: '/cases',
            label: 'All Cases',
            onClick: () => router.push('/cases'),
          }] : []),
          {
            key: '/cases/active',
            label: 'Active Cases',
            onClick: () => router.push('/cases/active'),
          },
          {
            key: '/cases/resolved',
            label: 'Resolved Cases',
            onClick: () => router.push('/cases/resolved'),
          },
          // Create New Case - only for admins, managers, and analysts
          ...(isAdmin || isManager || isAnalyst ? [{
            key: '/cases/new',
            label: 'Create New Case',
            onClick: () => router.push('/cases/new'),
          }] : []),
        ],
      },
      {
        key: 'alerts-menu',
        icon: <AlertOutlined />,
        label: 'Alerts',
        children: [
          {
            key: '/alerts/history',
            label: 'Alert History',
            onClick: () => router.push('/alerts/history'),
          },
          // Alert Rules - visible to all but with different permissions
          {
            key: '/alerts/rules',
            label: 'Alert Rules',
            onClick: () => router.push('/alerts/rules'),
          },
          // Rule Builder - ONLY for admins
          ...(isAdmin ? [{
            key: '/alerts/builder',
            label: 'Rule Builder',
            onClick: () => router.push('/alerts/builder'),
          }] : []),
        ],
      },
      {
        key: 'analytics-menu',
        icon: <BarChartOutlined />,
        label: 'Analytics',
        children: [
          {
            key: '/analytics/overview',
            label: 'Overview',
            onClick: () => router.push('/analytics/overview'),
          },
          ...(isAdmin || isManager ? [
            {
              key: '/analytics/trends',
              label: 'Trends',
              onClick: () => router.push('/analytics/trends'),
            },
            {
              key: '/analytics/reports',
              label: 'Reports',
              onClick: () => router.push('/analytics/reports'),
            },
          ] : []),
        ],
      },
    ];

    // Administration menu - ONLY for admins
    if (isAdmin) {
      items.push({
        key: 'admin-menu',
        icon: <SettingOutlined />,
        label: 'Administration',
        children: [
          {
            key: '/admin/users',
            label: 'Users',
            onClick: () => router.push('/admin/users'),
          },
          {
            key: '/admin/teams',
            label: 'Teams',
            onClick: () => router.push('/admin/teams'),
          },
          {
            key: '/admin/system',
            label: 'System Settings',
            onClick: () => router.push('/admin/system'),
          },
          {
            key: '/admin/grafana',
            label: 'Grafana Integration',
            onClick: () => router.push('/admin/grafana'),
          },
        ],
      });
    }

    return items;
  };

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Account Settings',
      onClick: () => router.push('/settings'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
      onClick: () => window.open('/help', '_blank'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Language menu
  const languageMenuItems: MenuProps['items'] = [
    {
      key: 'en',
      label: '🇺🇸 English',
      onClick: () => setCurrentLanguage('en'),
    },
    {
      key: 'fr',
      label: '🇫🇷 Français',
      onClick: () => setCurrentLanguage('fr'),
    },
    {
      key: 'ar',
      label: '🇸🇦 العربية',
      onClick: () => setCurrentLanguage('ar'),
    },
  ];

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    // Navigate based on notification type
    switch (notification.type) {
      case 'alert':
        router.push(`/alerts/history?alertId=${notification.entityId}`);
        break;
      case 'case_update':
        router.push(`/cases/${notification.entityId}`);
        break;
      case 'assignment':
        router.push(`/cases/${notification.entityId}`);
        break;
      default:
        router.push('/dashboard');
    }
    setNotificationDrawerOpen(false);
  };

  // Get severity color for notifications
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ff4d4f';
      case 'HIGH': return '#ffa940';
      case 'MEDIUM': return '#fadb14';
      case 'LOW': return '#52c41a';
      default: return '#1890ff';
    }
  };


  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile Sidebar Drawer */}
      {isMobile ? (
        <Drawer
          title={
            <Space align="center">
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#1677ff',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                CT
              </div>
              <span style={{ color: 'white', fontWeight: 'bold' }}>CaseTools</span>
            </Space>
          }
          placement="left"
          onClose={() => setMobileCollapsed(true)}
          open={!mobileCollapsed}
          styles={{ 
            body: { padding: 0, background: '#001529' },
            header: { background: '#001529', borderBottom: '1px solid #303030' }
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            defaultOpenKeys={['/cases', '/alerts']}
            items={buildMenuItems()}
            style={{ borderRight: 0 }}
            onClick={() => setMobileCollapsed(true)}
          />
        </Drawer>
      ) : (
        // Desktop Sidebar
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="dark"
          width={250}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1001,
          }}
        >
        <div 
          className="logo-container"
          style={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #303030',
            marginBottom: '8px'
          }}
        >
          {collapsed ? (
            <div
              style={{
                width: 32,
                height: 32,
                background: '#1677ff',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              CT
            </div>
          ) : (
            <Space align="center">
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#1677ff',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                CT
              </div>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                CaseTools
              </Title>
            </Space>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={['/cases', '/alerts']}
          items={buildMenuItems()}
          style={{ borderRight: 0 }}
        />
        </Sider>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 250), transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: 0,
            background: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space align="center" style={{ marginLeft: 16 }}>
            {React.createElement(
              isMobile 
                ? (mobileCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined)
                : (collapsed ? MenuUnfoldOutlined : MenuFoldOutlined), 
              {
                className: 'trigger',
                onClick: () => {
                  if (isMobile) {
                    setMobileCollapsed(!mobileCollapsed);
                  } else {
                    setCollapsed(!collapsed);
                  }
                },
              }
            )}
            
            {!isMobile && (
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search..."
                style={{ width: 300, marginLeft: 16 }}
                allowClear
              />
            )}
          </Space>

          <Space align="center" size="middle" style={{ marginRight: 24 }}>
            {/* Connection Status */}
            <Tooltip title={isConnected ? 'Connected to server' : 'Disconnected from server'}>
              <Badge 
                status={isConnected ? "processing" : "error"} 
                text={
                  <span style={{ fontSize: 12, color: isConnected ? '#52c41a' : '#ff4d4f' }}>
                    {isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
                  </span>
                }
              />
            </Tooltip>

            {/* Theme Switcher */}
            <ThemeSwitcher type="dropdown" size="middle" showLabel={false} />

            {/* Language Selector */}
            <Dropdown menu={{ items: languageMenuItems }} placement="bottomRight">
              <Button type="text" icon={<TranslationOutlined />}>
                {currentLanguage.toUpperCase()}
              </Button>
            </Dropdown>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <Badge count={unreadCount} size="small">
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<BellOutlined />}
                  onClick={() => setNotificationDrawerOpen(true)}
                />
              </Badge>
            </Tooltip>

            {/* User Menu */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span>{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: '24px',
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Notifications Drawer */}
      <Drawer
        title={
          <Space>
            <BellOutlined />
            Notifications
            {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
          </Space>
        }
        placement="right"
        onClose={() => setNotificationDrawerOpen(false)}
        open={notificationDrawerOpen}
        width={400}
        extra={
          <Space>
            <Button 
              type="text" 
              size="small"
              icon={<ClearOutlined />}
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              Clear All
            </Button>
          </Space>
        }
      >
        {!isConnected && (
          <Alert
            message="Connection Lost"
            description="Real-time notifications are disabled"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {notifications.length > 0 ? (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: notification.read ? 'transparent' : '#f6f8fa',
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge 
                      dot={!notification.read}
                      color={getSeverityColor(notification.severity)}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: getSeverityColor(notification.severity),
                          fontSize: 12 
                        }}
                        size={40}
                        icon={
                          notification.type === 'alert' ? <AlertOutlined /> :
                          notification.type === 'case_update' ? <FileProtectOutlined /> :
                          notification.type === 'assignment' ? <UserOutlined /> :
                          <BellOutlined />
                        }
                      />
                    </Badge>
                  }
                  title={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <div style={{ 
                        fontWeight: notification.read ? 'normal' : 'bold',
                        fontSize: 14 
                      }}>
                        {notification.title}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        lineHeight: '1.4'
                      }}>
                        {notification.message}
                      </div>
                    </Space>
                  }
                  description={
                    <Space>
                      <Tag 
                        color={getSeverityColor(notification.severity)}
                      >
                        {notification.severity}
                      </Tag>
                      <span style={{ fontSize: 11, color: '#999' }}>
                        {dayjs(notification.timestamp).fromNow()}
                      </span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
          />
        )}
      </Drawer>
    </Layout>
  );
}