'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Layout, Menu, Button, Avatar, Typography, theme, Drawer, Badge } from 'antd';
import {
  DashboardOutlined,
  AlertOutlined,
  FileProtectOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  CloseOutlined,
  UserOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SolutionOutlined,
  LineChartOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/contexts/theme-context';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  children?: MenuItem[];
  badge?: number;
  type?: 'divider';
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { sidebarCollapsed, setSidebarCollapsed, isRTL } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Define menu items matching actual routes
  const menuItems: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">{t('nav.dashboard') || 'Dashboard'}</Link>,
    },
    {
      key: 'cases-group',
      icon: <FileProtectOutlined />,
      label: t('nav.cases') || 'Cases',
      children: [
        {
          key: '/cases',
          icon: <AppstoreOutlined />,
          label: <Link href="/cases">All Cases</Link>,
        },
        {
          key: '/cases/active',
          icon: <AlertOutlined />,
          label: <Link href="/cases/active">Active Cases</Link>,
          badge: 5,
        },
        {
          key: '/cases/my-cases',
          icon: <UserOutlined />,
          label: <Link href="/cases/my-cases">My Cases</Link>,
        },
        {
          key: '/cases/resolved',
          icon: <CheckCircleOutlined />,
          label: <Link href="/cases/resolved">Resolved Cases</Link>,
        },
        {
          key: '/cases/new',
          icon: <PlusOutlined />,
          label: <Link href="/cases/new">Create New Case</Link>,
        },
      ],
    },
    {
      key: 'alerts-group',
      icon: <AlertOutlined />,
      label: t('nav.alerts') || 'Alerts',
      children: [
        {
          key: '/alerts/rules',
          icon: <FileProtectOutlined />,
          label: <Link href="/alerts/rules">Alert Rules</Link>,
        },
        {
          key: '/alerts/history',
          icon: <HistoryOutlined />,
          label: <Link href="/alerts/history">Alert History</Link>,
        },
        {
          key: '/alerts/builder',
          icon: <ExperimentOutlined />,
          label: <Link href="/alerts/builder">Rule Builder</Link>,
        },
      ],
    },
    {
      key: 'analytics-group',
      icon: <BarChartOutlined />,
      label: t('nav.analytics') || 'Analytics',
      children: [
        {
          key: '/analytics/overview',
          icon: <DashboardOutlined />,
          label: <Link href="/analytics/overview">Overview</Link>,
        },
        {
          key: '/analytics/trends',
          icon: <LineChartOutlined />,
          label: <Link href="/analytics/trends">Trends</Link>,
        },
        {
          key: '/analytics/reports',
          icon: <FileTextOutlined />,
          label: <Link href="/analytics/reports">Reports</Link>,
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'admin-group',
      icon: <SettingOutlined />,
      label: t('nav.administration') || 'Administration',
      children: [
        {
          key: '/admin/users',
          icon: <UserOutlined />,
          label: <Link href="/admin/users">Users</Link>,
        },
        {
          key: '/admin/teams',
          icon: <TeamOutlined />,
          label: <Link href="/admin/teams">Teams</Link>,
        },
        {
          key: '/admin/system',
          icon: <SettingOutlined />,
          label: <Link href="/admin/system">System Settings</Link>,
        },
        {
          key: '/admin/grafana',
          icon: <FundOutlined />,
          label: <Link href="/admin/grafana">Grafana Integration</Link>,
        },
      ],
    },
  ];

  // Add badge count rendering
  const addBadgeToMenuItem = (item: MenuItem): any => {
    const menuItem: any = {
      key: item.key,
      icon: item.icon,
      label: item.badge ? (
        <Badge count={item.badge} size="small" offset={[10, 0]}>
          {item.label}
        </Badge>
      ) : item.label,
      type: item.type,
    };
    
    if (item.children) {
      menuItem.children = item.children.map(addBadgeToMenuItem);
    }
    
    return menuItem;
  };

  const processedMenuItems = menuItems.map(addBadgeToMenuItem);

  // Update selected keys based on current pathname
  useEffect(() => {
    const matchingItem = findMatchingMenuItem(pathname, menuItems);
    if (matchingItem) {
      setSelectedKeys([matchingItem.key]);
      // Open parent if it's a child item
      const parent = findParentMenuItem(matchingItem.key, menuItems);
      if (parent && !sidebarCollapsed) {
        setOpenKeys([parent.key]);
      }
    } else {
      // Check if pathname starts with any menu key
      const pathSegments = pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const possibleKey = '/' + pathSegments[0];
        const possibleGroupKey = pathSegments[0] + '-group';
        
        // Try to find matching group
        const group = menuItems.find(item => 
          item.key === possibleGroupKey || item.key === possibleKey
        );
        
        if (group) {
          setOpenKeys([group.key]);
          // Check children for exact match
          if (group.children) {
            const child = group.children.find(c => pathname.startsWith(c.key));
            if (child) {
              setSelectedKeys([child.key]);
            }
          }
        }
      }
    }
  }, [pathname, sidebarCollapsed]);

  const findMatchingMenuItem = (path: string, items: MenuItem[]): MenuItem | null => {
    for (const item of items) {
      if (item.key === path) {
        return item;
      }
      if (item.children) {
        const found = findMatchingMenuItem(path, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  const findParentMenuItem = (childKey: string, items: MenuItem[], parent: MenuItem | null = null): MenuItem | null => {
    for (const item of items) {
      if (item.children) {
        const found = item.children.find(child => child.key === childKey);
        if (found) return item;
        const foundInChildren = findParentMenuItem(childKey, item.children, item);
        if (foundInChildren) return foundInChildren;
      }
    }
    return parent;
  };

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys);
  };

  const siderStyle: React.CSSProperties = {
    position: 'fixed',
    [isRTL ? 'right' : 'left']: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    boxShadow: isRTL 
      ? '-2px 0 8px 0 rgba(29,35,41,.05)' 
      : '2px 0 8px 0 rgba(29,35,41,.05)',
  };

  const logoStyle: React.CSSProperties = {
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
    padding: sidebarCollapsed ? 0 : '0 24px',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: 'all 0.2s',
  };

  const userSectionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: '16px',
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  };

  const renderSiderContent = () => (
    <>
      {/* Logo */}
      <div style={logoStyle}>
        {sidebarCollapsed ? (
          <div 
            style={{ 
              width: 32, 
              height: 32, 
              background: token.colorPrimary, 
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            CT
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div 
              style={{ 
                width: 32, 
                height: 32, 
                background: token.colorPrimary, 
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              CT
            </div>
            <Text strong style={{ fontSize: 18, margin: 0 }}>CaseTools</Text>
          </div>
        )}
      </div>

      {/* Menu */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 100 }}>
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          items={processedMenuItems}
          inlineCollapsed={sidebarCollapsed}
          style={{ 
            border: 'none',
            background: 'transparent',
          }}
        />
      </div>

      {/* User Section */}
      <div style={userSectionStyle}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            padding: '8px 12px',
            borderRadius: token.borderRadius,
            cursor: 'pointer',
            transition: 'background 0.3s',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token.colorBgTextHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Avatar style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }} icon={<UserOutlined />} />
          {!sidebarCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text strong style={{ display: 'block', fontSize: 14 }}>John Doe</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>john@example.com</Text>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button - Desktop only */}
      <Button
        type="text"
        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          position: 'absolute',
          top: 20,
          [isRTL ? 'left' : 'right']: -40,
          width: 32,
          height: 32,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          display: 'none',
        }}
        className="lg:flex lg:items-center lg:justify-center"
      />
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        type="text"
        icon={mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed',
          top: 16,
          [isRTL ? 'right' : 'left']: 16,
          zIndex: 1001,
          background: token.colorBgContainer,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        className="lg:hidden"
      />

      {/* Desktop Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        width={200}
        collapsedWidth={80}
        style={{
          ...siderStyle,
          display: 'none',
        }}
        className="lg:block"
      >
        {renderSiderContent()}
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement={isRTL ? 'right' : 'left'}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={200}
        closable={false}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' },
        }}
        className="lg:hidden"
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {renderSiderContent()}
        </div>
      </Drawer>
    </>
  );
}