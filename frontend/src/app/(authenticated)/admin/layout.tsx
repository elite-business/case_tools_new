'use client';

import { ReactNode, useEffect } from 'react';
import { Card, Menu, theme, Breadcrumb, Alert, Row, Col, Typography } from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  DashboardOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

const { Title } = Typography;

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  useEffect(() => {
    // Check if user has admin role
    if (!user?.roles?.includes('ADMIN')) {
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  if (!user?.roles?.includes('ADMIN')) {
    return (
      <Alert
        message="Access Denied"
        description="You don't have permission to access admin features."
        type="error"
        showIcon
      />
    );
  }

  const menuItems = [
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: 'User Management',
    },
    {
      key: '/admin/teams',
      icon: <TeamOutlined />,
      label: 'Team Management',
    },
    {
      key: '/admin/grafana',
      icon: <DashboardOutlined />,
      label: 'Grafana Integration',
    }
    // ,
    // {
    //   key: '/admin/system',
    //   icon: <SettingOutlined />,
    //   label: 'System Settings',
    // },
  ];

  const breadcrumbItems = [
    {
      title: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      title: 'Administration',
    },
  ];

  // Add specific breadcrumb based on current path
  if (pathname.includes('/users')) {
    breadcrumbItems.push({ title: 'User Management' });
  } else if (pathname.includes('/teams')) {
    breadcrumbItems.push({ title: 'Team Management' });
  } else if (pathname.includes('/grafana')) {
    breadcrumbItems.push({ title: 'Grafana Integration' });
  }

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Admin Header */}
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>
                Administration Panel
              </Title>
            </div>
            <Breadcrumb items={breadcrumbItems} style={{ marginTop: 8 }} />
          </Col>
        </Row>
      </div>

      <Row gutter={24}>
        {/* Admin Navigation */}
        <Col xs={24} lg={6}>
          <Card 
            title="Admin Navigation" 
            style={{ marginBottom: 24 }}
            bodyStyle={{ padding: 0 }}
          >
            <Menu
              mode="vertical"
              selectedKeys={[pathname]}
              items={menuItems.map(item => ({
                ...item,
                onClick: () => router.push(item.key),
              }))}
              style={{ border: 0 }}
            />
          </Card>
        </Col>

        {/* Admin Content */}
        <Col xs={24} lg={18}>
          <Card
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 500,
            }}
            bodyStyle={{ padding: 24 }}
          >
            {children}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
