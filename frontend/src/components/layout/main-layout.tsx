'use client';

import { Layout, theme } from 'antd';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useTheme } from '@/contexts/theme-context';
import { useTheme as useNextTheme } from 'next-themes';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed, isRTL } = useTheme();
  const { theme: currentTheme } = useNextTheme();
  const { token } = theme.useToken();

  const contentStyle: React.CSSProperties = {
    marginTop: 64,
    marginLeft: !isRTL ? (sidebarCollapsed ? 80 : 200) : 0,
    marginRight: isRTL ? (sidebarCollapsed ? 80 : 200) : 0,
    padding: 24,
    minHeight: 'calc(100vh - 64px)',
    background: currentTheme === 'dark' ? '#000000' : '#f5f5f5',
    transition: 'all 0.2s',
  };

  return (
    <Layout style={{ minHeight: '100vh', background: currentTheme === 'dark' ? '#000000' : '#f5f5f5' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={contentStyle}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}