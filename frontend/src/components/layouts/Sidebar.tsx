'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Typography,
  Space,
  Button,
  Tooltip,
  Divider,
  Badge,
  theme,
  Drawer,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  AlertOutlined,
  SettingOutlined,
  UserOutlined,
  FileSearchOutlined,
  TeamOutlined,
  BarChartOutlined,
  PlusOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StarOutlined,
  BellOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { grafanaApi } from '@/lib/api-client';

const { Sider } = Layout;
const { Text } = Typography;

interface MenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  path?: string;
  badge?: number;
  children?: MenuItem[];
  access?: string[];
  disabled?: boolean;
  onClick?: () => void;
  type?: 'divider';
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  showUserInfo?: boolean;
  showToggle?: boolean;
  menuItems?: MenuItem[];
  mode?: 'vertical' | 'horizontal';
  theme?: 'light' | 'dark';
  width?: number;
  collapsedWidth?: number;
  mobile?: boolean;
  onMobileDrawerClose?: () => void;
}

// Default menu configuration
const defaultMenuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    path: '/dashboard',
  },
  {
    key: 'cases',
    label: 'Cases',
    icon: <FileSearchOutlined />,
    path: '/cases',
    badge: 12,
    children: [
      {
        key: 'cases-new',
        label: 'Create Case',
        icon: <PlusOutlined />,
        path: '/cases/new',
      },
    ],
  },
  {
    key: 'alerts',
    label: 'Alert Management',
    icon: <AlertOutlined />,
    path: '/alerts',
    badge: 5,
    children: [
      {
        key: 'alerts-rules',
        label: 'Alert Rules',
        icon: <SettingOutlined />,
        path: '/alerts/rules',
      },
      {
        key: 'alerts-builder',
        label: 'Rule Builder',
        icon: <PlusOutlined />,
        path: '/alerts/builder',
      },
      {
        key: 'alerts-history',
        label: 'Alert History',
        icon: <ClockCircleOutlined />,
        path: '/alerts/history',
      },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: <BarChartOutlined />,
    path: '/analytics',
    children: [
      {
        key: 'analytics-overview',
        label: 'Overview',
        icon: <DashboardOutlined />,
        path: '/analytics/overview',
      },
      {
        key: 'analytics-trends',
        label: 'Trends',
        icon: <BarChartOutlined />,
        path: '/analytics/trends',
      },
      {
        key: 'analytics-reports',
        label: 'Reports',
        icon: <FileSearchOutlined />,
        path: '/analytics/reports',
      },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    icon: <SettingOutlined />,
    path: '/admin',
    access: ['admin'],
    children: [
      {
        key: 'admin-users',
        label: 'User Management',
        icon: <UserOutlined />,
        path: '/admin/users',
      },
      {
        key: 'admin-teams',
        label: 'Team Management',
        icon: <TeamOutlined />,
        path: '/admin/teams',
      },
      {
        key: 'admin-rule-assignments',
        label: 'Rule Assignments',
        icon: <BellOutlined />,
        path: '/admin/rule-assignments',
        badge: 0,
      },
      {
        key: 'admin-grafana',
        label: 'Grafana Settings',
        icon: <BarChartOutlined />,
        path: '/admin/grafana',
      },
      {
        key: 'admin-system',
        label: 'System Settings',
        icon: <SettingOutlined />,
        path: '/admin/system',
      },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onCollapse,
  showUserInfo = true,
  showToggle = true,
  menuItems = defaultMenuItems,
  mode = 'vertical',
  width = 256,
  collapsedWidth = 80,
  mobile = false,
  onMobileDrawerClose,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { permissions, hasRole } = useRoleAccess();
  const { 
    isDarkMode, 
    primaryColor, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    sidebarCollapsedMobile,
    setSidebarCollapsedMobile,
  } = useThemeStore();
  const { token } = theme.useToken();

  const canViewGrafanaDashboards = permissions.canViewGrafanaIntegration;
  const { data: grafanaDashboards } = useQuery({
    queryKey: ['grafana', 'dashboards'],
    queryFn: () => grafanaApi.getDashboards(),
    enabled: canViewGrafanaDashboards,
    staleTime: 5 * 60 * 1000,
  });
  
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const grafanaBaseUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || '';
  const dashboardChildren = useMemo(() => {
    if (!canViewGrafanaDashboards) {
      return undefined;
    }
    const dashboards = grafanaDashboards?.data || [];
    const folderMap = new Map<string, any[]>();
    dashboards.forEach((dashboard: any) => {
      const folderName = dashboard.folderTitle || 'Other Dashboards';
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)?.push(dashboard);
    });

    const folderItems = Array.from(folderMap.entries()).map(([folderName, items]) => ({
      key: `grafana-folder-${folderName.replace(/\s+/g, '-').toLowerCase()}`,
      label: folderName,
      icon: <BarChartOutlined />,
      children: items.map((dashboard: any) => ({
        key: `grafana-${dashboard.uid || dashboard.id}`,
        label: dashboard.title,
        icon: <BarChartOutlined />,
        path: dashboard.url || '',
        onClick: () => {
          const url = dashboard.url
            ? dashboard.url.startsWith('http')
              ? dashboard.url
              : `${grafanaBaseUrl}${dashboard.url}`
            : '';
          if (url) {
            window.open(url, '_blank');
          }
        },
      })),
    }));

    return [
      {
        key: 'dashboard-main',
        label: 'Main Dashboard',
        icon: <DashboardOutlined />,
        path: '/dashboard',
      },
      ...folderItems,
    ];
  }, [canViewGrafanaDashboards, grafanaDashboards, grafanaBaseUrl]);

  const resolvedMenuItems = useMemo(() => {
    return menuItems.map((item) => {
      if (item.key === 'dashboard' && dashboardChildren) {
        return { ...item, children: dashboardChildren };
      }
      return item;
    });
  }, [menuItems, dashboardChildren]);

  // Update selected keys based on current path
  useEffect(() => {
    const findSelectedKey = (items: MenuItem[], path: string): string | null => {
      for (const item of items) {
        if (item.path === path) {
          return item.key;
        }
        if (item.children) {
          const childKey = findSelectedKey(item.children, path);
          if (childKey) {
            return childKey;
          }
        }
      }
      return null;
    };

    const selectedKey = findSelectedKey(resolvedMenuItems, pathname);
    if (selectedKey) {
      setSelectedKeys([selectedKey]);
      
      // Auto open parent menu
      const findParentKey = (items: MenuItem[], childKey: string): string | null => {
        for (const item of items) {
          if (item.children?.some(child => child.key === childKey)) {
            return item.key;
          }
        }
        return null;
      };
      
      const parentKey = findParentKey(resolvedMenuItems, selectedKey);
      if (parentKey && !collapsed) {
        setOpenKeys(prev => [...new Set([...prev, parentKey])]);
      }
    }
  }, [pathname, resolvedMenuItems, collapsed]);

  // Filter menu items based on user access and permissions
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // Check role-based access
      if (item.access && user?.role && !item.access.includes(user.role.toLowerCase())) {
        return false;
      }
      
      // Check specific permissions based on menu key
      if (item.key === 'admin' && !permissions.canViewSystemSettings && !permissions.canViewUsers && !permissions.canViewTeams) {
        return false;
      }
      if (item.key === 'admin-users' && !permissions.canViewUsers) {
        return false;
      }
      if (item.key === 'admin-teams' && !permissions.canViewTeams) {
        return false;
      }
      if (item.key === 'admin-rule-assignments' && !permissions.canViewRuleAssignments) {
        return false;
      }
      if (item.key === 'admin-grafana' && !permissions.canViewGrafanaIntegration) {
        return false;
      }
      if (item.key === 'admin-system' && !permissions.canViewSystemSettings) {
        return false;
      }
      if (item.key === 'alerts-builder' && !permissions.canManageAlerts) {
        return false;
      }
      
      // Recursively filter children
      if (item.children) {
        item.children = filterMenuItems(item.children);
        // Remove parent if all children are filtered out
        if (item.children.length === 0) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Convert menu items to Ant Design menu format
  const convertToAntMenuItems = (items: MenuItem[]): MenuProps['items'] => {
    return items.map(item => {
      if (item.type === 'divider') {
        return { type: 'divider' as const };
      }

      return {
        key: item.key,
        icon: item.icon,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge 
                count={item.badge} 
                size="small" 
                style={{ 
                  backgroundColor: token.colorError,
                  fontSize: 10,
                  minWidth: 16,
                  height: 16,
                  lineHeight: '16px',
                }} 
              />
            )}
          </div>
        ),
        children: item.children ? convertToAntMenuItems(item.children) : undefined,
        disabled: item.disabled,
        onClick: item.children ? undefined : () => {
          if (item.onClick) {
            item.onClick();
          } else if (item.path) {
            router.push(item.path);
          }
          if (mobile && onMobileDrawerClose) {
            onMobileDrawerClose();
          }
        },
      };
    });
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    const findMenuItem = (items: MenuItem[], targetKey: string): MenuItem | null => {
      for (const item of items) {
        if (item.key === targetKey) {
          return item;
        }
        if (item.children) {
          const found = findMenuItem(item.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

  const menuItem = findMenuItem(resolvedMenuItems, key);
    if (menuItem && !menuItem.children) {
      if (menuItem.onClick) {
        menuItem.onClick();
      } else if (menuItem.path) {
        router.push(menuItem.path);
      }
      if (mobile && onMobileDrawerClose) {
        onMobileDrawerClose();
      }
    }
  };

  const handleOpenChange = (keys: string[]) => {
    if (!collapsed) {
      setOpenKeys(keys);
    }
  };

  const siderStyle: React.CSSProperties = {
    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  };

  // User info section
  const userInfoSection = showUserInfo && (
    <div
      style={{
        padding: collapsed ? 12 : 16,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        textAlign: collapsed ? 'center' : 'left',
      }}
    >
      {collapsed ? (
        <Tooltip title={`${user?.username || 'User'} - ${user?.role || 'Analyst'}`} placement="right">
          <Avatar
            size={32}
            style={{
              backgroundColor: primaryColor,
              cursor: 'pointer',
            }}
            onClick={() => router.push('/profile')}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
        </Tooltip>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 6,
            transition: 'background-color 0.2s',
          }}
          onClick={() => router.push('/profile')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = token.colorFillQuaternary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Avatar
            size={40}
            style={{ backgroundColor: primaryColor, flexShrink: 0 }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              style={{
                fontSize: 14,
                color: token.colorText,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.username || 'User'}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: token.colorTextSecondary,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.role || 'Analyst'}
            </Text>
          </div>
        </div>
      )}
    </div>
  );

  // Toggle button
  const toggleButton = showToggle && onCollapse && (
    <div
      style={{
        padding: 8,
        textAlign: 'center',
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => {
          const newCollapsed = !collapsed;
          onCollapse(newCollapsed);
          if (mobile) {
            setSidebarCollapsedMobile(newCollapsed);
          } else {
            setSidebarCollapsed(newCollapsed);
          }
        }}
        style={{
          width: collapsed ? 32 : '100%',
          height: 32,
        }}
      />
    </div>
  );

  // Logout button (always at bottom)
  const logoutButton = (
    <div
      style={{
        padding: collapsed ? 8 : 16,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {collapsed ? (
        <Tooltip title="Sign Out" placement="right">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              router.push('/login');
            }}
            style={{
              width: '100%',
              color: token.colorError,
            }}
          />
        </Tooltip>
      ) : (
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => {
            logout();
            router.push('/login');
          }}
          style={{
            width: '100%',
            color: token.colorError,
            justifyContent: 'flex-start',
          }}
        >
          Sign Out
        </Button>
      )}
    </div>
  );

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* User info section */}
      {userInfoSection}
      
      {/* Menu */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Menu
          mode={mode}
          theme={isDarkMode ? 'dark' : 'light'}
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={handleOpenChange}
          onClick={handleMenuClick}
          items={convertToAntMenuItems(filterMenuItems(resolvedMenuItems))}
          inlineCollapsed={collapsed}
          style={{
            borderRight: 'none',
            backgroundColor: 'transparent',
          }}
        />
      </div>

      {/* Toggle button */}
      {toggleButton}
      
      {/* Logout button */}
      {logoutButton}
    </div>
  );

  // Mobile drawer version
  if (mobile) {
    return (
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <Text strong style={{ fontSize: 18 }}>CaseTools</Text>
          </div>
        }
        placement="left"
        open={!sidebarCollapsedMobile}
        onClose={() => {
          setSidebarCollapsedMobile(true);
          onMobileDrawerClose?.();
        }}
        width={280}
        styles={{
          body: { padding: 0 },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop sider version
  return (
    <Sider
      width={width}
      collapsedWidth={collapsedWidth}
      collapsed={collapsed}
      onCollapse={onCollapse}
      style={siderStyle}
      breakpoint="lg"
      collapsible={false}
    >
      {sidebarContent}
    </Sider>
  );
};

// Mini sidebar for compact layouts
export const MiniSidebar: React.FC<{
  menuItems?: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
}> = ({
  menuItems = defaultMenuItems.slice(0, 4),
  onItemClick,
}) => {
  const { token } = theme.useToken();
  const { isDarkMode, primaryColor } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      style={{
        width: 60,
        backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
      }}
    >
      {menuItems.map(item => {
        const path = item.path || '';
        const isActive = path ? pathname.startsWith(path) : false;
        return (
          <Tooltip key={item.key} title={item.label} placement="right">
            <Button
              type="text"
              icon={item.icon}
              onClick={() => {
                if (path) {
                  router.push(path);
                  onItemClick?.(item);
                }
              }}
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive ? token.colorPrimaryBg : 'transparent',
                color: isActive ? primaryColor : token.colorText,
                border: isActive ? `1px solid ${primaryColor}` : '1px solid transparent',
                position: 'relative',
              }}
            >
              {item.badge && item.badge > 0 && (
                <Badge
                  count={item.badge}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                  }}
                />
              )}
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default Sidebar;
