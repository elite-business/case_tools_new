'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme as useNextTheme } from 'next-themes';
import { useTheme } from '@/contexts/theme-context';
import {
  Input,
  Dropdown,
  Avatar,
  Switch,
  Space,
  Button,
  Divider,
  Typography,
  theme,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import NotificationDropdown from '@/components/common/NotificationDropdown';

const { Text } = Typography;

export function Header() {
  const { t, i18n } = useTranslation();
  const { theme: appTheme, setTheme } = useNextTheme();
  const { token } = theme.useToken();
  const { sidebarCollapsed, currentLanguage, setCurrentLanguage, isRTL } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
  }, [currentLanguage, i18n]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];
  const languageMenuItems: MenuProps['items'] = languages.map(lang => ({
    key: lang.code,
    label: (
      <Space>
        <span style={{ fontSize: 16 }}>{lang.flag}</span>
        <span>{lang.name}</span>
      </Space>
    ),
    onClick: () => setCurrentLanguage(lang.code),
  }));

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'userInfo',
      label: (
        <div style={{ padding: '8px 0' }}>
          <Text strong>John Doe</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>john@example.com</Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('header.profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('nav.settings'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('header.logout'),
      danger: true,
    },
  ];

  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    [isRTL ? 'right' : 'left']: sidebarCollapsed ? 80 : 200,
    [isRTL ? 'left' : 'right']: 0,
    height: 64,
    padding: '0 24px',
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s',
    zIndex: 999,
  };

  return (
    <header style={headerStyle}>
      {/* Search Section */}
      <div style={{ flex: 1, maxWidth: 500 }}>
        <Input
          placeholder={t('header.search')}
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          style={{ 
            borderRadius: token.borderRadius,
            background: token.colorBgTextHover,
          }}
          variant="filled"
        />
      </div>

      {/* Actions Section */}
      <Space size="middle" style={{ marginLeft: 24 }}>
        {/* Theme Toggle */}
        {mounted && (
          <Space
            style={{
              background: token.colorBgTextHover,
              padding: '4px 12px',
              borderRadius: token.borderRadius,
            }}
          >
            <SunOutlined style={{ color: token.colorTextTertiary }} />
            <Switch
              checked={appTheme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              size="small"
            />
            <MoonOutlined style={{ color: token.colorTextTertiary }} />
          </Space>
        )}

        {/* Language Selector */}
        <Dropdown menu={{ items: languageMenuItems, selectedKeys: [currentLanguage] }} placement="bottomRight">
          <Button type="text" icon={<GlobalOutlined />}>
            {currentLang.flag} {currentLang.code.toUpperCase()}
          </Button>
        </Dropdown>

        {/* RTL/LTR Toggle */}
        <Button
          type="text"
          icon={<TranslationOutlined />}
          onClick={() => setCurrentLanguage(isRTL ? 'en' : 'ar')}
          title={isRTL ? 'Switch to LTR' : 'Switch to RTL'}
        >
          {isRTL ? 'LTR' : 'RTL'}
        </Button>

        {/* Notifications */}
        <NotificationDropdown />

        <Divider type="vertical" style={{ height: 32 }} />

        {/* User Menu */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button 
            type="text" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              paddingRight: 4,
            }}
          >
            <Avatar 
              style={{ backgroundColor: token.colorPrimary }} 
              icon={<UserOutlined />} 
              size="small"
            />
            <Text>John Doe</Text>
          </Button>
        </Dropdown>
      </Space>
    </header>
  );
}
