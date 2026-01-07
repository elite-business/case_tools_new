'use client';

import React from 'react';
import {
  Layout,
  Space,
  Button,
  Avatar,
  Dropdown,
  Breadcrumb,
  theme,
  Divider,
  Typography,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  ProfileOutlined,
  DashboardOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import SearchBar, { GlobalSearchShortcut } from '@/components/common/SearchBar';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import NotificationDropdown from '@/components/common/NotificationDropdown';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  showBreadcrumb?: boolean;
  showSearch?: boolean;
  showUserActions?: boolean;
  logo?: React.ReactNode;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({
  collapsed = false,
  onCollapse,
  showBreadcrumb = true,
  showSearch = true,
  showUserActions = true,
  logo,
  title = 'CaseTools',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { 
    fixedHeader, 
    layoutType, 
    primaryColor, 
    isDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useThemeStore();
  const { token } = theme.useToken();

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    if (!showBreadcrumb || pathname === '/') return [];

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      {
        title: (
          <Space>
            <HomeOutlined />
            <span>Home</span>
          </Space>
        ),
        href: '/dashboard',
      },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Convert segment to readable title
      const title = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        title: isLast ? title : <a href={currentPath}>{title}</a>,
        href: isLast ? undefined : currentPath,
      });
    });

    return breadcrumbs;
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: 'View Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => router.push('/dashboard'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
      onClick: () => router.push('/help'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: () => {
        logout();
        router.push('/login');
      },
      danger: true,
    },
  ];

  // Quick actions dropdown
  const quickActionsItems = [
    {
      key: 'new-case',
      label: 'Create New Case',
      onClick: () => router.push('/cases/new'),
    },
    {
      key: 'new-alert',
      label: 'Create Alert Rule',
      onClick: () => router.push('/alerts/rules/new'),
    },
    {
      key: 'quick-report',
      label: 'Generate Report',
      onClick: () => router.push('/analytics/reports/new'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'system-status',
      label: 'System Status',
      onClick: () => router.push('/system/status'),
    },
  ];

  const headerStyle: React.CSSProperties = {
    padding: 0,
    height: 64,
    lineHeight: '64px',
    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    position: fixedHeader ? 'sticky' : 'static',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <>
      <AntHeader style={headerStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 24px',
        }}>
          {/* Left section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Collapse trigger (only show for side layout) */}
            {(layoutType === 'side' || layoutType === 'mix') && onCollapse && (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => {
                  const newCollapsed = !collapsed;
                  onCollapse(newCollapsed);
                  setSidebarCollapsed(newCollapsed);
                }}
                style={{
                  fontSize: 16,
                  width: 40,
                  height: 40,
                }}
              />
            )}

            {/* Logo and title (only show when sidebar is collapsed or in top layout) */}
            {(collapsed || layoutType === 'top') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}
                onClick={() => router.push('/dashboard')}
              >
                {logo || (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}
                  >
                    CT
                  </div>
                )}
                <Text
                  strong
                  style={{
                    fontSize: 18,
                    color: token.colorText,
                    display: collapsed ? 'none' : 'block',
                  }}
                >
                  {title}
                </Text>
              </div>
            )}
          </div>

          {/* Center section - Search bar */}
          {showSearch && (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center',
              maxWidth: 600,
              margin: '0 24px',
            }}>
              <SearchBar
                placeholder="Search cases, alerts, users... (Ctrl+K)"
                width="100%"
                showFilters={false}
                size="middle"
              />
            </div>
          )}

          {/* Right section - User actions */}
          {showUserActions && (
            <Space size="middle">
              {/* Quick actions */}
              <Dropdown
                menu={{ items: quickActionsItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Button
                  type="text"
                  icon={<BulbOutlined />}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </Dropdown>

              {/* Theme switcher */}
              <ThemeSwitcher type="icon" />

              {/* Language switcher */}
              <LanguageSwitcher type="flag" />

              {/* Notifications */}
              <NotificationDropdown />

              <Divider type="vertical" style={{ height: 24 }} />

              {/* User profile */}
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillQuaternary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Avatar
                    size="small"
                    style={{
                      backgroundColor: primaryColor,
                      flexShrink: 0,
                    }}
                    icon={!user?.username ? <UserOutlined /> : undefined}
                  >
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    lineHeight: 1.2,
                    minWidth: 0,
                  }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: token.colorText,
                        display: 'block',
                        maxWidth: 120,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.username || 'User'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: token.colorTextSecondary,
                        display: 'block',
                      }}
                    >
                      {user?.role || 'Analyst'}
                    </Text>
                  </div>
                </div>
              </Dropdown>
            </Space>
          )}
        </div>
      </AntHeader>

      {/* Breadcrumb bar (if enabled and not on dashboard) */}
      {showBreadcrumb && pathname !== '/dashboard' && (
        <div
          style={{
            padding: '8px 24px',
            backgroundColor: isDarkMode ? '#141414' : '#fafafa',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: fixedHeader ? 'sticky' : 'static',
            top: fixedHeader ? 64 : 'auto',
            zIndex: 99,
          }}
        >
          <Breadcrumb items={generateBreadcrumbs()} />
        </div>
      )}

      {/* Global search shortcut */}
      <GlobalSearchShortcut />
    </>
  );
};

// Compact header for mobile or minimal layouts
export const CompactHeader: React.FC<{
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}> = ({
  title = 'CaseTools',
  showBack = false,
  actions,
}) => {
  const router = useRouter();
  const { token } = theme.useToken();
  const { isDarkMode, primaryColor } = useThemeStore();

  return (
    <AntHeader
      style={{
        padding: '0 16px',
        height: 56,
        lineHeight: '56px',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          />
        )}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 12,
          }}
        >
          CT
        </div>
        <Text strong style={{ fontSize: 16 }}>
          {title}
        </Text>
      </div>
      
      {actions && <div>{actions}</div>}
    </AntHeader>
  );
};

export default Header;