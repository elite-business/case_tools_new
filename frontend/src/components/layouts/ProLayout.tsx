'use client';

import React, { useState, useEffect } from 'react';
import { 
  ProLayout as AntProLayout,
  ProSettings,
  PageContainer,
} from '@ant-design/pro-components';
import { 
  Layout,
  ConfigProvider,
  App,
  theme as antdTheme,
} from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore, useThemeInitializer } from '@/store/theme-store';
import { lightTheme, darkTheme } from '@/config/theme.config';
import Header from './Header';
import Sidebar from './Sidebar';
import { NotificationBadge, useWebSocketContext } from '@/components/providers/WebSocketProvider';

const { Content, Footer } = Layout;

interface ProLayoutProps {
  children: React.ReactNode;
}

export const ProLayout: React.FC<ProLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { 
    isDarkMode, 
    layoutType, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    sidebarCollapsedMobile,
    setSidebarCollapsedMobile,
    fixedHeader,
    fixedSidebar,
    showFooter,
    showBreadcrumb,
  } = useThemeStore();
  
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize theme
  useThemeInitializer();

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle sidebar collapse for mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, setSidebarCollapsed]);

  // Get current theme configuration
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ConfigProvider
      theme={{
        ...currentTheme,
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <App>
        <Layout style={{ minHeight: '100vh' }}>
          {/* Sidebar - Desktop */}
          {!isMobile && (layoutType === 'side' || layoutType === 'mix') && (
            <Sidebar
              collapsed={sidebarCollapsed}
              onCollapse={setSidebarCollapsed}
              width={256}
              collapsedWidth={80}
            />
          )}

          {/* Sidebar - Mobile Drawer */}
          {isMobile && (
            <Sidebar
              collapsed={sidebarCollapsedMobile}
              onCollapse={setSidebarCollapsedMobile}
              mobile={true}
              onMobileDrawerClose={() => setSidebarCollapsedMobile(true)}
            />
          )}

          <Layout
            style={{
              marginLeft: 
                !isMobile && (layoutType === 'side' || layoutType === 'mix') 
                  ? (sidebarCollapsed ? 80 : 256)
                  : 0,
              transition: 'margin-left 0.2s',
            }}
          >
            {/* Header */}
            <Header
              collapsed={isMobile ? sidebarCollapsedMobile : sidebarCollapsed}
              onCollapse={isMobile ? setSidebarCollapsedMobile : setSidebarCollapsed}
              showBreadcrumb={showBreadcrumb}
              showSearch={true}
              showUserActions={true}
            />

            {/* Main Content */}
            <Content
              style={{
                margin: 0,
                padding: 0,
                minHeight: 'calc(100vh - 64px)',
                background: isDarkMode ? '#000000' : '#f0f2f5',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  padding: 24,
                  minHeight: '100%',
                }}
              >
                {children}
              </div>
            </Content>

            {/* Footer */}
            {showFooter && (
              <Footer
                style={{
                  textAlign: 'center',
                  background: isDarkMode ? '#1f1f1f' : '#ffffff',
                  borderTop: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
                  padding: '24px 50px',
                  marginLeft: 
                    !isMobile && (layoutType === 'side' || layoutType === 'mix') 
                      ? -(sidebarCollapsed ? 80 : 256)
                      : 0,
                  transition: 'margin-left 0.2s',
                }}
              >
                <div style={{ color: isDarkMode ? '#ffffff73' : '#00000073' }}>
                  CaseTools © 2026 Elite Business Solutions
                </div>
                <div style={{ 
                  fontSize: 12, 
                  marginTop: 8,
                  color: isDarkMode ? '#ffffff40' : '#00000040',
                }}>
                  Operations & Case Management Platform
                </div>
              </Footer>
            )}
          </Layout>
        </Layout>
      </App>
    </ConfigProvider>
  );
};

// Responsive wrapper for different layout types
export const ResponsiveProLayout: React.FC<ProLayoutProps> = ({ children }) => {
  const { layoutType } = useThemeStore();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-adjust layout based on screen size
  const getResponsiveLayout = () => {
    if (windowWidth < 768) return 'side'; // Mobile always uses sidebar
    if (windowWidth < 1024) return layoutType === 'mix' ? 'side' : layoutType;
    return layoutType;
  };

  return <ProLayout>{children}</ProLayout>;
};

// Minimal layout for authentication pages
export const MinimalLayout: React.FC<ProLayoutProps> = ({ children }) => {
  const { isDarkMode } = useThemeStore();
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ConfigProvider
      theme={{
        ...currentTheme,
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <App>
        <Layout style={{ 
          minHeight: '100vh',
          background: isDarkMode ? '#000000' : '#f0f2f5',
        }}>
          {children}
        </Layout>
      </App>
    </ConfigProvider>
  );
};
