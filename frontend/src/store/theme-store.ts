'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'fr' | 'ar';
export type LayoutType = 'side' | 'top' | 'mix';

interface ThemeState {
  // Theme settings
  themeMode: ThemeMode;
  isDarkMode: boolean;
  
  // Language settings
  language: Language;
  isRTL: boolean;
  
  // Layout settings
  layoutType: LayoutType;
  sidebarCollapsed: boolean;
  sidebarCollapsedMobile: boolean;
  
  // UI preferences
  primaryColor: string;
  borderRadius: number;
  compactMode: boolean;
  showBreadcrumb: boolean;
  showFooter: boolean;
  fixedHeader: boolean;
  fixedSidebar: boolean;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  setLayoutType: (layout: LayoutType) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarCollapsedMobile: (collapsed: boolean) => void;
  setPrimaryColor: (color: string) => void;
  setBorderRadius: (radius: number) => void;
  setCompactMode: (compact: boolean) => void;
  setShowBreadcrumb: (show: boolean) => void;
  setShowFooter: (show: boolean) => void;
  setFixedHeader: (fixed: boolean) => void;
  setFixedSidebar: (fixed: boolean) => void;
  resetToDefaults: () => void;
}

const defaultState = {
  themeMode: 'light' as ThemeMode,
  isDarkMode: false,
  language: 'en' as Language,
  isRTL: false,
  layoutType: 'mix' as LayoutType,
  sidebarCollapsed: false,
  sidebarCollapsedMobile: true,
  primaryColor: '#1890ff',
  borderRadius: 6,
  compactMode: false,
  showBreadcrumb: true,
  showFooter: true,
  fixedHeader: true,
  fixedSidebar: true,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      setThemeMode: (mode: ThemeMode) => {
        let isDarkMode = false;
        
        if (mode === 'dark') {
          isDarkMode = true;
        } else if (mode === 'auto') {
          isDarkMode = typeof window !== 'undefined' 
            ? window.matchMedia('(prefers-color-scheme: dark)').matches 
            : false;
        }
        
        set({ 
          themeMode: mode, 
          isDarkMode 
        });
        
        // Apply theme to document
        if (typeof window !== 'undefined') {
          document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
          document.documentElement.style.setProperty('--primary-color', get().primaryColor);
        }
      },
      
      toggleTheme: () => {
        const current = get().themeMode;
        const next = current === 'light' ? 'dark' : 'light';
        get().setThemeMode(next);
      },
      
      setLanguage: (language: Language) => {
        const isRTL = language === 'ar';
        set({ language, isRTL });
        
        // Apply RTL to document
        if (typeof window !== 'undefined') {
          document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = language;
        }
      },
      
      setLayoutType: (layout: LayoutType) => set({ layoutType: layout }),
      
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
      
      setSidebarCollapsedMobile: (collapsed: boolean) => set({ sidebarCollapsedMobile: collapsed }),
      
      setPrimaryColor: (color: string) => {
        set({ primaryColor: color });
        
        // Apply primary color to CSS custom properties
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty('--primary-color', color);
        }
      },
      
      setBorderRadius: (radius: number) => {
        set({ borderRadius: radius });
        
        // Apply border radius to CSS custom properties
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty('--border-radius', `${radius}px`);
        }
      },
      
      setCompactMode: (compact: boolean) => set({ compactMode: compact }),
      
      setShowBreadcrumb: (show: boolean) => set({ showBreadcrumb: show }),
      
      setShowFooter: (show: boolean) => set({ showFooter: show }),
      
      setFixedHeader: (fixed: boolean) => set({ fixedHeader: fixed }),
      
      setFixedSidebar: (fixed: boolean) => set({ fixedSidebar: fixed }),
      
      resetToDefaults: () => {
        set(defaultState);
        get().setThemeMode(defaultState.themeMode);
        get().setLanguage(defaultState.language);
        get().setPrimaryColor(defaultState.primaryColor);
        get().setBorderRadius(defaultState.borderRadius);
      },
    }),
    {
      name: 'casetools-theme-store',
      partialize: (state) => ({
        themeMode: state.themeMode,
        language: state.language,
        layoutType: state.layoutType,
        sidebarCollapsed: state.sidebarCollapsed,
        primaryColor: state.primaryColor,
        borderRadius: state.borderRadius,
        compactMode: state.compactMode,
        showBreadcrumb: state.showBreadcrumb,
        showFooter: state.showFooter,
        fixedHeader: state.fixedHeader,
        fixedSidebar: state.fixedSidebar,
      }),
    }
  )
);

// Hook to initialize theme on app start
export const useThemeInitializer = () => {
  const { themeMode, language, primaryColor, borderRadius, setThemeMode, setLanguage } = useThemeStore();
  
  // Initialize theme on mount
  React.useEffect(() => {
    setThemeMode(themeMode);
    setLanguage(language);
    
    // Set up system theme change listener for auto mode
    if (typeof window !== 'undefined' && themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (useThemeStore.getState().themeMode === 'auto') {
          setThemeMode('auto');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, language, setThemeMode, setLanguage]);
  
  // Apply CSS custom properties
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--border-radius', `${borderRadius}px`);
    }
  }, [primaryColor, borderRadius]);
};

import React from 'react';