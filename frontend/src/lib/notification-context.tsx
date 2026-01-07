'use client';

import React, { createContext, useContext } from 'react';
import { App } from 'antd';
import type { NotificationArgsProps } from 'antd';

type NotificationPlacement = NotificationArgsProps['placement'];

interface NotificationContextType {
  success: (config: NotificationArgsProps) => void;
  error: (config: NotificationArgsProps) => void;
  info: (config: NotificationArgsProps) => void;
  warning: (config: NotificationArgsProps) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Fallback to console methods if context is not available
    return {
      success: (config: NotificationArgsProps) => {},
      error: (config: NotificationArgsProps) => {},
      info: (config: NotificationArgsProps) => {},
      warning: (config: NotificationArgsProps) => {},
    };
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { notification } = App.useApp();

  const contextValue: NotificationContextType = {
    success: (config) => notification.success(config),
    error: (config) => notification.error(config),
    info: (config) => notification.info(config),
    warning: (config) => notification.warning(config),
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}