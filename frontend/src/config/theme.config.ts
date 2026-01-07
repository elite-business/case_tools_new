'use client';

import { ThemeConfig } from 'antd';

// Light theme configuration
export const lightTheme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Background colors
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgSpotlight: '#fafafa',
    
    // Text colors
    colorText: '#000000d9',
    colorTextSecondary: '#00000073',
    colorTextTertiary: '#00000040',
    colorTextQuaternary: '#00000026',
    
    // Border colors
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // Component specific
    colorFill: '#f5f5f5',
    colorFillSecondary: '#fafafa',
    colorFillTertiary: '#f5f5f5',
    colorFillQuaternary: '#f0f0f0',
    
    // Shadows
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    
    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    fontWeightStrong: 600,
    
    // Layout
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    
    // Control
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    controlHeightXS: 16,
    
    // Wireframe mode (cleaner look)
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
      triggerColor: '#000000d9',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7ff',
      itemSelectedColor: '#1890ff',
      itemHoverBg: '#f5f5f5',
      itemHoverColor: '#000000d9',
      itemActiveBg: '#e6f7ff',
      subMenuItemBg: 'transparent',
      horizontalItemSelectedBg: 'transparent',
      horizontalItemSelectedColor: '#1890ff',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 15,
      fontWeight: 400,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 11,
    },
    Card: {
      borderRadius: 8,
      paddingLG: 24,
      boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
    },
    Table: {
      borderRadius: 6,
      headerBg: '#fafafa',
      headerSortActiveBg: '#f0f0f0',
      headerSortHoverBg: '#f5f5f5',
      rowHoverBg: '#fafafa',
    },
    Dropdown: {
      borderRadius: 8,
      paddingBlock: 4,
    },
    Modal: {
      borderRadius: 8,
      paddingContentHorizontal: 24,
    },
    Drawer: {
      paddingLG: 24,
    },
    Notification: {
      borderRadius: 8,
      paddingContentHorizontal: 24,
    },
    Message: {
      borderRadius: 6,
    },
  },
};

// Dark theme configuration
export const darkTheme: ThemeConfig = {
  token: {
    // Brand colors (same as light)
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Background colors
    colorBgBase: '#141414',
    colorBgContainer: '#1f1f1f',
    colorBgElevated: '#262626',
    colorBgLayout: '#000000',
    colorBgSpotlight: '#262626',
    
    // Text colors
    colorText: '#ffffffd9',
    colorTextSecondary: '#ffffff73',
    colorTextTertiary: '#ffffff40',
    colorTextQuaternary: '#ffffff26',
    
    // Border colors
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    
    // Component specific
    colorFill: '#262626',
    colorFillSecondary: '#1f1f1f',
    colorFillTertiary: '#262626',
    colorFillQuaternary: '#303030',
    
    // Shadows (darker)
    boxShadow: '0 1px 2px rgba(255, 255, 255, 0.03), 0 1px 6px -1px rgba(255, 255, 255, 0.02), 0 2px 4px rgba(255, 255, 255, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(255, 255, 255, 0.08), 0 3px 6px -4px rgba(255, 255, 255, 0.12), 0 9px 28px 8px rgba(255, 255, 255, 0.05)',
    
    // Typography (same as light)
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    fontWeightStrong: 600,
    
    // Layout (same as light)
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // Motion (same as light)
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    
    // Control (same as light)
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    controlHeightXS: 16,
    
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#1f1f1f',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#1f1f1f',
      triggerBg: '#1f1f1f',
      triggerColor: '#ffffffd9',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#111a2c',
      itemSelectedColor: '#1890ff',
      itemHoverBg: '#262626',
      itemHoverColor: '#ffffffd9',
      itemActiveBg: '#111a2c',
      subMenuItemBg: 'transparent',
      horizontalItemSelectedBg: 'transparent',
      horizontalItemSelectedColor: '#1890ff',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 15,
      fontWeight: 400,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 11,
      colorBgContainer: '#262626',
      colorBorder: '#434343',
    },
    Card: {
      borderRadius: 8,
      paddingLG: 24,
      colorBgContainer: '#1f1f1f',
      boxShadowTertiary: '0 1px 2px rgba(255, 255, 255, 0.03), 0 1px 6px -1px rgba(255, 255, 255, 0.02)',
    },
    Table: {
      borderRadius: 6,
      headerBg: '#262626',
      headerSortActiveBg: '#303030',
      headerSortHoverBg: '#2a2a2a',
      rowHoverBg: '#262626',
      colorBgContainer: '#1f1f1f',
    },
    Dropdown: {
      borderRadius: 8,
      paddingBlock: 4,
      colorBgElevated: '#262626',
    },
    Modal: {
      borderRadius: 8,
      paddingContentHorizontal: 24,
      colorBgElevated: '#262626',
    },
    Drawer: {
      paddingLG: 24,
      colorBgElevated: '#1f1f1f',
    },
    Notification: {
      borderRadius: 8,
      paddingContentHorizontal: 24,
      colorBgElevated: '#262626',
    },
    Message: {
      borderRadius: 6,
      colorBgElevated: '#262626',
    },
  },
};

// Animation configurations
export const animationConfig = {
  // Transition durations
  fast: 100,
  normal: 200,
  slow: 300,
  
  // Easing functions
  easeOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  
  // Common animations
  slideIn: 'slideInRight',
  slideOut: 'slideOutRight',
  fadeIn: 'fadeIn',
  fadeOut: 'fadeOut',
};

// Typography configurations
export const typographyConfig = {
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 48,
  },
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

// Layout configurations
export const layoutConfig = {
  // Breakpoints
  breakpoints: {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600,
  },
  
  // Header heights
  headerHeight: {
    default: 64,
    compact: 48,
  },
  
  // Sidebar widths
  sidebarWidth: {
    expanded: 256,
    collapsed: 80,
    mobile: 280,
  },
  
  // Spacings
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

// Color palette
export const colorPalette = {
  primary: {
    50: '#e6f7ff',
    100: '#bae7ff',
    200: '#91d5ff',
    300: '#69c0ff',
    400: '#40a9ff',
    500: '#1890ff',
    600: '#096dd9',
    700: '#0050b3',
    800: '#003a8c',
    900: '#002766',
  },
  success: {
    50: '#f6ffed',
    100: '#d9f7be',
    200: '#b7eb8f',
    300: '#95de64',
    400: '#73d13d',
    500: '#52c41a',
    600: '#389e0d',
    700: '#237804',
    800: '#135200',
    900: '#092b00',
  },
  warning: {
    50: '#fffbe6',
    100: '#fff1b8',
    200: '#ffe58f',
    300: '#ffd666',
    400: '#ffc53d',
    500: '#faad14',
    600: '#d48806',
    700: '#ad6800',
    800: '#874d00',
    900: '#613400',
  },
  error: {
    50: '#fff2f0',
    100: '#ffccc7',
    200: '#ffa39e',
    300: '#ff7875',
    400: '#ff4d4f',
    500: '#f5222d',
    600: '#cf1322',
    700: '#a8071a',
    800: '#820014',
    900: '#5c0011',
  },
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#f0f0f0',
    300: '#d9d9d9',
    400: '#bfbfbf',
    500: '#8c8c8c',
    600: '#595959',
    700: '#434343',
    800: '#262626',
    900: '#1f1f1f',
    950: '#141414',
  },
};

// RTL support configuration
export const rtlConfig = {
  supportedLanguages: ['ar', 'he', 'fa'],
  defaultDirection: 'ltr',
  mirroredProps: [
    'marginLeft',
    'marginRight',
    'paddingLeft',
    'paddingRight',
    'left',
    'right',
    'borderLeft',
    'borderRight',
    'borderLeftWidth',
    'borderRightWidth',
    'borderLeftColor',
    'borderRightColor',
    'borderLeftStyle',
    'borderRightStyle',
  ],
};

// Export default theme configuration
export const defaultThemeConfig = {
  light: lightTheme,
  dark: darkTheme,
  animation: animationConfig,
  typography: typographyConfig,
  layout: layoutConfig,
  colors: colorPalette,
  rtl: rtlConfig,
};