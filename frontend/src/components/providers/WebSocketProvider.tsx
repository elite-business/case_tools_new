'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import webSocketService, { WebSocketNotification } from '@/lib/websocket-stomp';
import { useRuleAssignmentNotifications } from '@/hooks/useRuleAssignmentNotifications';
import Cookies from 'js-cookie';
import { Badge, App } from 'antd';

interface WebSocketContextType {
  isConnected: boolean;
  notifications: WebSocketNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  clearNotifications: () => {},
});

export const useWebSocketContext = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { notification } = App.useApp();
  
  // Use rule assignment notifications hook
  useRuleAssignmentNotifications();

  useEffect(() => {
    // Set notification handler
    webSocketService.setNotificationHandler((type: string, config: any) => {
      switch (type) {
        case 'success':
          notification.success(config);
          break;
        case 'error':
          notification.error(config);
          break;
        case 'warning':
          notification.warning(config);
          break;
        case 'info':
          notification.info(config);
          break;
      }
    });
  }, [notification]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = Cookies.get('token');
      if (token) {
        // Connect to WebSocket
        webSocketService.connect(user.id.toString(), token);
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }

        // Subscribe to notifications
        const unsubscribeAlert = webSocketService.subscribe('alert', (notification) => {
          handleNewNotification(notification);
        });

        const unsubscribeCaseUpdate = webSocketService.subscribe('case_update', (notification) => {
          handleNewNotification(notification);
        });

        const unsubscribeAssignment = webSocketService.subscribe('assignment', (notification) => {
          handleNewNotification(notification);
        });

        // Check connection status
        const checkConnection = setInterval(() => {
          setIsConnected(webSocketService.isConnected());
        }, 5000);

        setIsConnected(webSocketService.isConnected());

        return () => {
          unsubscribeAlert();
          unsubscribeCaseUpdate();
          unsubscribeAssignment();
          clearInterval(checkConnection);
          webSocketService.disconnect();
        };
      }
    }
  }, [isAuthenticated, user]);

  const handleNewNotification = (notification: WebSocketNotification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 100)); // Keep last 100 notifications
    setUnreadCount((prev) => prev + 1);
    
    // Update badge in document title
    updateDocumentTitle();
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    updateDocumentTitle();
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    updateDocumentTitle();
  };

  const updateDocumentTitle = () => {
    const baseTitle = 'CaseTools - Alert Management System';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        notifications,
        unreadCount,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

// Component to display notification badge
export function NotificationBadge({ children }: { children: React.ReactNode }) {
  const { unreadCount } = useWebSocketContext();
  
  return (
    <Badge count={unreadCount} overflowCount={99}>
      {children}
    </Badge>
  );
}