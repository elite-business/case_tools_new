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
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  TranslationOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/store/auth-store';
import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { useTheme as useCustomTheme } from '@/contexts/theme-context';
import { canShowAdminFeatures, canShowManagerFeatures } from '@/lib/rbac';
import { useQuery } from '@tanstack/react-query';
import { grafanaApi } from '@/lib/api-client';
import NotificationDropdown from '@/components/common/NotificationDropdown';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
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
  const { isConnected } = useWebSocketContext();

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Check user role - support both role string and roles array
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';
  const showAdminFeatures = canShowAdminFeatures(userRole);
  const showManagerFeatures = canShowManagerFeatures(userRole);

  const grafanaBaseUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || '';
  const { data: grafanaDashboards } = useQuery({
    queryKey: ['grafana', 'dashboards'],
    queryFn: () => grafanaApi.getDashboards(),
    enabled: showManagerFeatures,
    staleTime: 5 * 60 * 1000,
  });

  // Build menu items based on user role
  const buildMenuItems = (): MenuProps['items'] => {
    const folderMap = new Map<string, any[]>();
    (grafanaDashboards?.data || []).forEach((dashboard: any) => {
      const folderName = dashboard.folderTitle || 'Other Dashboards';
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)?.push(dashboard);
    });

    const dashboardItems = Array.from(folderMap.entries()).map(([folderName, items]) => ({
      key: `grafana-folder-${folderName.replace(/\s+/g, '-').toLowerCase()}`,
      label: folderName,
      children: items.map((dashboard: any) => {
        const url = dashboard.url
          ? dashboard.url.startsWith('http')
            ? dashboard.url
            : `${grafanaBaseUrl}${dashboard.url}`
          : '';
        return {
          key: `grafana-${dashboard.uid || dashboard.id}`,
          label: dashboard.title,
          onClick: () => {
            if (url) {
              window.open(url, '_blank');
            }
          },
        };
      }),
    }));

    const items: MenuProps['items'] = [
      {
        key: 'dashboard-menu',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        children: [
          {
            key: '/dashboard',
            label: 'Main Dashboard',
            onClick: () => router.push('/dashboard'),
          },
          ...dashboardItems,
        ],
      },
      {
        key: '/cases',
        icon: <FileProtectOutlined />,
        label: 'Cases',
        onClick: () => router.push('/cases'),
      },
      {
        key: 'alerts-menu',
        icon: <AlertOutlined />,
        label: 'Alerts',
        children: [
          {
            key: '/alerts/history',
            label: 'Alert Audit Trail',
            onClick: () => router.push('/alerts/history'),
          },
          {
            key: '/alerts/rules',
            label: 'Alert Rules',
            onClick: () => router.push('/alerts/rules'),
          },
        ],
      },
      {
        key: 'analytics-menu',
        icon: <BarChartOutlined />,
        label: 'Analytics',
        children: [
          {
            key: '/analytics',
            label: 'Dashboard',
            onClick: () => router.push('/analytics'),
          },
          ...(showManagerFeatures ? [
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
    if (showAdminFeatures) {
      items.push({
        key: 'admin-menu',
        icon: <SettingOutlined />,
        label: 'Administration',
        children: [
          {
            key: '/admin/users',
            label: 'User Management',
            onClick: () => router.push('/admin/users'),
          },
          // Teams - visible to admins and managers
          ...(showManagerFeatures ? [{
            key: '/admin/teams',
            label: 'Team Management',
            onClick: () => router.push('/admin/teams'),
          }] : []),
          {
            key: '/admin/rule-assignments',
            label: 'Rule Assignments',
            onClick: () => router.push('/admin/rule-assignments'),
          },
          { type: 'divider' },
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
            
            {/* {!isMobile && (
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search..."
                style={{ width: 300, marginLeft: 16 }}
                allowClear
              />
            )} */}
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
            <NotificationDropdown />

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

    </Layout>
  );
}
