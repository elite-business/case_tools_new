'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme, App } from 'antd';
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import arEG from 'antd/locale/ar_EG';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { StyleProvider } from '@ant-design/cssinjs';

// Set dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(duration);

interface ProvidersProps {
  children: ReactNode;
}

const localeMap = {
  en: enUS,
  fr: frFR,
  ar: arEG,
};

function AntdConfigProvider({ children }: { children: ReactNode }) {
  const { theme: appTheme } = useNextTheme();
  const { currentLanguage, isRTL } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Set dayjs locale
    dayjs.locale(currentLanguage);
  }, [currentLanguage]);

  if (!mounted) {
    return <>{children}</>;
  }

  const isDark = appTheme === 'dark';

  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider
        locale={localeMap[currentLanguage as keyof typeof localeMap] || enUS}
        direction={isRTL ? 'rtl' : 'ltr'}
        theme={{
          algorithm: isDark 
            ? [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm]
            : [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm],
          cssVar: true,
          token: {
            // Brand colors
            colorPrimary: '#1677ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1677ff',
            
            // Layout
            borderRadius: 8,
            fontSize: 14,
            fontFamily: isRTL 
              ? "'IBM Plex Sans Arabic', 'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            
            // Spacing
            paddingLG: 24,
            paddingMD: 16,
            paddingSM: 12,
            paddingXS: 8,
            paddingXXS: 4,
            
            // Line heights
            lineHeight: 1.5714285714285714,
            lineHeightLG: 1.5,
            lineHeightSM: 1.6666666666666667,
            
            // Motion
            motionUnit: 0.1,
            motionBase: 0,
            motionEaseOutCirc: 'cubic-bezier(0.08, 0.82, 0.17, 1)',
            motionEaseInOutCirc: 'cubic-bezier(0.78, 0.14, 0.15, 0.86)',
            motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
            motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
            motionEaseOutBack: 'cubic-bezier(0.12, 0.4, 0.29, 1.46)',
            motionEaseInBack: 'cubic-bezier(0.71, -0.46, 0.88, 0.6)',
            motionEaseInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
            motionEaseOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
          },
          components: {
            Layout: {
              headerBg: isDark ? '#141414' : '#ffffff',
              headerHeight: 64,
              headerPadding: '0 24px',
              bodyBg: isDark ? '#000000' : '#f5f5f5',
              siderBg: isDark ? '#141414' : '#001529',
              triggerBg: isDark ? '#262626' : '#002140',
              triggerColor: '#ffffff',
            },
            Menu: {
              darkItemBg: 'transparent',
              darkSubMenuItemBg: '#000c17',
              darkItemSelectedBg: '#1677ff',
              darkItemSelectedColor: '#ffffff',
              darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
              itemBg: 'transparent',
              itemSelectedBg: '#e6f4ff',
              itemSelectedColor: '#1677ff',
              itemHoverBg: '#f5f5f5',
              subMenuItemBg: 'transparent',
              horizontalItemSelectedBg: 'transparent',
              horizontalItemSelectedColor: '#1677ff',
            },
            Card: {
              borderRadiusLG: 12,
              boxShadow: isDark 
                ? '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)'
                : '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)',
            },
            Button: {
              borderRadius: 6,
              controlHeight: 36,
              fontWeight: 500,
            },
            Input: {
              borderRadius: 6,
              controlHeight: 36,
            },
            Select: {
              borderRadius: 6,
              controlHeight: 36,
            },
            DatePicker: {
              borderRadius: 6,
              controlHeight: 36,
            },
            Table: {
              borderRadius: 8,
              headerBg: isDark ? '#1f1f1f' : '#fafafa',
              headerSplitColor: isDark ? '#303030' : '#f0f0f0',
              rowHoverBg: isDark ? '#262626' : '#fafafa',
            },
            Tabs: {
              cardBg: isDark ? '#141414' : '#ffffff',
              cardHeight: 40,
            },
            Modal: {
              borderRadiusLG: 12,
            },
            Drawer: {
              paddingLG: 24,
            },
            Badge: {
              dotSize: 8,
            },
            Tag: {
              borderRadiusSM: 4,
            },
            Notification: {
              width: 400,
            },
            Message: {
              contentPadding: '10px 16px',
            },
            Dropdown: {
              borderRadiusLG: 8,
              paddingBlock: 8,
            },
            Divider: {
              marginLG: 24,
            },
            Steps: {
              iconSize: 32,
            },
            Form: {
              labelHeight: 32,
              verticalLabelPadding: '0 0 8px',
            },
            Tooltip: {
              borderRadius: 6,
            },
            Popover: {
              borderRadiusLG: 8,
            },
            Breadcrumb: {
              itemColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
              lastItemColor: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
              linkColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
              linkHoverColor: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
              separatorColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            },
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <NextThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeProvider> 
            <AntdConfigProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </AntdConfigProvider>
          </ThemeProvider>
        </NextThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}