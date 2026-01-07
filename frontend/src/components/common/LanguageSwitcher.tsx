'use client';

import React from 'react';
import { Button, Dropdown, Space, Avatar, Tooltip } from 'antd';
import { GlobalOutlined, CheckOutlined, TranslationOutlined } from '@ant-design/icons';
import { useThemeStore, Language } from '@/store/theme-store';

interface LanguageSwitcherProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'icon' | 'text' | 'both' | 'flag';
  showLabel?: boolean;
}

// Language configurations with flag emojis and RTL support
const languageConfig = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    code: 'en',
    direction: 'ltr',
    flagSvg: (
      <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
        <rect width="20" height="15" fill="#012169"/>
        <path d="M0 0L20 15M20 0L0 15" stroke="white" strokeWidth="2"/>
        <path d="M0 0L20 15M20 0L0 15" stroke="#C8102E" strokeWidth="1"/>
        <rect x="8" y="0" width="4" height="15" fill="white"/>
        <rect x="0" y="5.5" width="20" height="4" fill="white"/>
        <rect x="9" y="0" width="2" height="15" fill="#C8102E"/>
        <rect x="0" y="6.5" width="20" height="2" fill="#C8102E"/>
      </svg>
    ),
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    code: 'fr',
    direction: 'ltr',
    flagSvg: (
      <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
        <rect width="20" height="15" fill="#002395"/>
        <rect x="6.67" y="0" width="6.67" height="15" fill="white"/>
        <rect x="13.33" y="0" width="6.67" height="15" fill="#ED2939"/>
      </svg>
    ),
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    code: 'ar',
    direction: 'rtl',
    flagSvg: (
      <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
        <rect width="20" height="15" fill="#006C35"/>
        <text x="10" y="9" textAnchor="middle" fill="white" fontSize="8">🗡️</text>
      </svg>
    ),
  },
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = 'middle',
  type = 'both',
  showLabel = false,
}) => {
  const { language, setLanguage } = useThemeStore();

  const currentLanguage = languageConfig[language];
  const languages = Object.values(languageConfig);

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as Language);
    
    // Apply direction change with smooth animation
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      const newLang = languageConfig[langCode as Language];
      
      html.style.transition = 'all 0.3s ease';
      html.dir = newLang.direction;
      html.lang = newLang.code;
      
      // Reset transition after animation
      setTimeout(() => {
        html.style.transition = '';
      }, 300);
    }
  };

  const dropdownItems = languages.map((lang) => ({
    key: lang.code,
    label: (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        minWidth: 160,
        padding: '4px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{lang.flag}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{lang.name}</div>
            <div style={{ 
              fontSize: 12, 
              opacity: 0.65,
              fontFamily: lang.direction === 'rtl' ? 'Noto Sans Arabic, sans-serif' : 'inherit',
            }}>
              {lang.nativeName}
            </div>
          </div>
        </div>
        {language === lang.code && (
          <CheckOutlined style={{ color: '#1890ff' }} />
        )}
      </div>
    ),
    onClick: () => handleLanguageChange(lang.code),
  }));

  // Icon only
  if (type === 'icon') {
    return (
      <Dropdown
        menu={{ items: dropdownItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Tooltip title="Change Language">
          <Button
            type="text"
            size={size}
            icon={<GlobalOutlined />}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
      </Dropdown>
    );
  }

  // Flag only
  if (type === 'flag') {
    return (
      <Dropdown
        menu={{ items: dropdownItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Tooltip title={`Current: ${currentLanguage.name}`}>
          <Button
            type="text"
            size={size}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
            }}
          >
            <span style={{ fontSize: 16 }}>{currentLanguage.flag}</span>
            {showLabel && (
              <span style={{ fontSize: 12 }}>{currentLanguage.code.toUpperCase()}</span>
            )}
          </Button>
        </Tooltip>
      </Dropdown>
    );
  }

  // Text only
  if (type === 'text') {
    return (
      <Dropdown
        menu={{ items: dropdownItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button
          type="text"
          size={size}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <TranslationOutlined />
          <span>{currentLanguage.nativeName}</span>
        </Button>
      </Dropdown>
    );
  }

  // Both flag and text (default)
  return (
    <Dropdown
      menu={{ items: dropdownItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        type="text"
        size={size}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
        }}
      >
        <span style={{ fontSize: 16 }}>{currentLanguage.flag}</span>
        {showLabel && (
          <span style={{ 
            fontSize: 14,
            fontFamily: currentLanguage.direction === 'rtl' 
              ? 'Noto Sans Arabic, sans-serif' 
              : 'inherit',
          }}>
            {currentLanguage.nativeName}
          </span>
        )}
      </Button>
    </Dropdown>
  );
};

// Language selector with cards (for settings page)
export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useThemeStore();

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {Object.values(languageConfig).map((lang) => (
        <div
          key={lang.code}
          onClick={() => setLanguage(lang.code as Language)}
          style={{
            flex: '1 1 140px',
            minWidth: 140,
            padding: 16,
            border: `2px solid ${language === lang.code ? '#1890ff' : '#d9d9d9'}`,
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: language === lang.code ? '#f0f9ff' : '#ffffff',
            textAlign: 'center',
          }}
        >
          {/* Flag */}
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {lang.flag}
          </div>

          {/* Language info */}
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {lang.name}
          </div>
          <div style={{ 
            fontSize: 14, 
            color: '#666',
            fontFamily: lang.direction === 'rtl' 
              ? 'Noto Sans Arabic, sans-serif' 
              : 'inherit',
          }}>
            {lang.nativeName}
          </div>

          {/* Direction indicator */}
          <div style={{ 
            marginTop: 8, 
            fontSize: 12, 
            color: '#999',
          }}>
            {lang.direction === 'rtl' ? '← RTL' : 'LTR →'}
          </div>

          {/* Selected indicator */}
          {language === lang.code && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#1890ff',
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

// Simple language toggle for quick switching
export const LanguageToggle: React.FC<{
  languages: Language[];
}> = ({ languages }) => {
  const { language, setLanguage } = useThemeStore();

  const currentIndex = languages.indexOf(language);
  const nextLanguage = languages[(currentIndex + 1) % languages.length];
  const nextLangConfig = languageConfig[nextLanguage];

  return (
    <Tooltip title={`Switch to ${nextLangConfig.name}`}>
      <Button
        type="text"
        onClick={() => setLanguage(nextLanguage)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'all 0.3s',
        }}
      >
        <span style={{ fontSize: 16 }}>{languageConfig[language].flag}</span>
        <GlobalOutlined />
        <span style={{ fontSize: 16 }}>{nextLangConfig.flag}</span>
      </Button>
    </Tooltip>
  );
};

export default LanguageSwitcher;