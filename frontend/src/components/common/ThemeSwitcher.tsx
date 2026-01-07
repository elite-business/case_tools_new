'use client';

import React from 'react';
import { Button, Tooltip, Dropdown, theme } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useTheme } from 'next-themes';

interface ThemeSwitcherProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'icon' | 'button' | 'dropdown';
  showLabel?: boolean;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  size = 'middle',
  type = 'icon',
  showLabel = false,
}) => {
  const { theme: currentTheme, setTheme, resolvedTheme } = useTheme();
  const { token } = theme.useToken();
  
  const isDarkMode = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');

  const themeOptions = [
    {
      key: 'light',
      label: 'Light',
      icon: <SunOutlined />,
    },
    {
      key: 'dark', 
      label: 'Dark',
      icon: <MoonOutlined />,
    },
    {
      key: 'system',
      label: 'System',
      icon: <DesktopOutlined />,
    },
  ];

  const getCurrentIcon = () => {
    switch (currentTheme) {
      case 'light':
        return <SunOutlined style={{ color: token.colorWarning }} />;
      case 'dark':
        return <MoonOutlined style={{ color: token.colorPrimary }} />;
      case 'system':
        return <DesktopOutlined style={{ color: token.colorText }} />;
      default:
        return <SunOutlined />;
    }
  };

  const getLabel = () => {
    const option = themeOptions.find(opt => opt.key === currentTheme);
    return option ? option.label : 'Theme';
  };

  // Simple toggle button (icon only)
  if (type === 'icon') {
    return (
      <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
        <Button
          type="text"
          size={size}
          icon={getCurrentIcon()}
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
      </Tooltip>
    );
  }

  // Button with label
  if (type === 'button') {
    return (
      <Button
        type="text"
        size={size}
        icon={getCurrentIcon()}
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: showLabel ? 8 : 0,
        }}
      >
        {showLabel && getLabel()}
      </Button>
    );
  }

  // Dropdown with all options
  if (type === 'dropdown') {
    const dropdownItems = themeOptions.map(option => ({
      key: option.key,
      label: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 120,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {option.icon}
            <span>{option.label}</span>
          </div>
          {currentTheme === option.key && (
            <CheckOutlined style={{ color: token.colorPrimary }} />
          )}
        </div>
      ),
      onClick: () => setTheme(option.key),
    }));

    return (
      <Dropdown
        menu={{
          items: dropdownItems,
        }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button
          type="text"
          size={size}
          icon={getCurrentIcon()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: showLabel ? 8 : 0,
          }}
        >
          {showLabel && getLabel()}
        </Button>
      </Dropdown>
    );
  }

  return null;
};

// Animated theme switcher with smooth transitions
export const AnimatedThemeSwitcher: React.FC<{
  size?: 'small' | 'middle' | 'large';
}> = ({ size = 'middle' }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { token } = theme.useToken();
  
  const isDarkMode = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');

  return (
    <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
      <Button
        type="text"
        size={size}
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'large' ? 40 : size === 'small' ? 24 : 32,
          height: size === 'large' ? 40 : size === 'small' ? 24 : 32,
          borderRadius: '50%',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = token.colorFillTertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.5s cubic-bezier(0.645, 0.045, 0.355, 1)',
          }}
        >
          {/* Sun icon */}
          <SunOutlined
            style={{
              position: 'absolute',
              fontSize: size === 'large' ? 18 : size === 'small' ? 12 : 14,
              color: token.colorWarning,
              opacity: isDarkMode ? 0 : 1,
              transform: `scale(${isDarkMode ? 0.5 : 1})`,
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
            }}
          />
          
          {/* Moon icon */}
          <MoonOutlined
            style={{
              position: 'absolute',
              fontSize: size === 'large' ? 18 : size === 'small' ? 12 : 14,
              color: token.colorPrimary,
              opacity: isDarkMode ? 1 : 0,
              transform: `scale(${isDarkMode ? 1 : 0.5})`,
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
            }}
          />
        </div>
      </Button>
    </Tooltip>
  );
};

// Theme selector with cards
export const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const { token } = theme.useToken();

  const themes = [
    {
      key: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      icon: <SunOutlined />,
      preview: {
        background: '#ffffff',
        border: '#d9d9d9',
        text: '#000000d9',
      },
    },
    {
      key: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes',
      icon: <MoonOutlined />,
      preview: {
        background: '#1f1f1f',
        border: '#434343',
        text: '#ffffffd9',
      },
    },
    {
      key: 'system',
      name: 'System',
      description: 'Follows system preference',
      icon: <DesktopOutlined />,
      preview: {
        background: 'linear-gradient(135deg, #ffffff 50%, #1f1f1f 50%)',
        border: '#595959',
        text: '#595959',
      },
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {themes.map((theme) => (
        <div
          key={theme.key}
          onClick={() => setTheme(theme.key)}
          style={{
            flex: '1 1 120px',
            minWidth: 120,
            padding: 12,
            border: `2px solid ${currentTheme === theme.key ? token.colorPrimary : token.colorBorder}`,
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: token.colorBgContainer,
          }}
        >
          {/* Theme preview */}
          <div
            style={{
              width: '100%',
              height: 60,
              borderRadius: 6,
              marginBottom: 8,
              background: theme.preview.background,
              border: `1px solid ${theme.preview.border}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: theme.preview.text,
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                right: 6,
                height: 2,
                backgroundColor: theme.preview.text,
                opacity: 0.3,
                borderRadius: 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 6,
                right: 20,
                height: 2,
                backgroundColor: theme.preview.text,
                opacity: 0.3,
                borderRadius: 1,
              }}
            />
          </div>

          {/* Theme info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: 16, 
              marginBottom: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 6,
            }}>
              {theme.icon}
              <span style={{ fontWeight: currentTheme === theme.key ? 600 : 400 }}>
                {theme.name}
              </span>
            </div>
            <div style={{ 
              fontSize: 12, 
              color: token.colorTextSecondary,
              lineHeight: 1.4,
            }}>
              {theme.description}
            </div>
          </div>

          {/* Selected indicator */}
          {currentTheme === theme.key && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: token.colorPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckOutlined style={{ fontSize: 10, color: '#ffffff' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ThemeSwitcher;