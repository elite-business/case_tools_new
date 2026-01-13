import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api-client';
import { 
  Notification, 
  NotificationPreferences,
  NotificationType,
  NotificationSeverity 
} from '@/lib/types';
import { message } from 'antd';
import wsService from '@/lib/websocket-stomp';
import { useEffect, useState } from 'react';

export const useNotifications = (params?: any) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.getNotifications(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: (error: any) => {
      message.error(`Failed to mark notification as read: ${error.message}`);
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      message.success('All notifications marked as read');
    },
    onError: (error: any) => {
      message.error(`Failed to mark all notifications as read: ${error.message}`);
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      message.success('Notification deleted');
    },
    onError: (error: any) => {
      message.error(`Failed to delete notification: ${error.message}`);
    },
  });
};

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      message.success('Notification preferences updated');
    },
    onError: (error: any) => {
      message.error(`Failed to update preferences: ${error.message}`);
    },
  });
};

export const useTestNotification = () => {
  return useMutation({
    mutationFn: (data: { type: NotificationType; message: string }) =>
      notificationsApi.testNotification(data),
    onSuccess: () => {
      message.success('Test notification sent');
    },
    onError: (error: any) => {
      message.error(`Failed to send test notification: ${error.message}`);
    },
  });
};

// Hook for real-time notification updates
export const useRealTimeNotifications = (onNewNotification?: (notification: Notification) => void) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to WebSocket notifications
    const unsubscribe = wsService.subscribe('all', (wsNotification) => {
      // Update queries when receiving notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      
      // Call custom handler if provided
      if (onNewNotification) {
        // Convert WebSocket notification to Notification type
        const notification: Notification = {
          id: parseInt(wsNotification.id),
          userId: 0, // Will be set by backend
          type: wsNotification.type as NotificationType,
          title: wsNotification.title,
          message: wsNotification.message,
          severity: wsNotification.severity.toUpperCase() as NotificationSeverity,
          status: 'PENDING',
          data: wsNotification.data,
          createdAt: wsNotification.timestamp.toISOString(),
          updatedAt: wsNotification.timestamp.toISOString(),
        };
        onNewNotification(notification);
      }
    });

    // Track connection status
    setIsConnected(wsService.isConnected());
    const connectionInterval = setInterval(() => {
      setIsConnected(wsService.isConnected());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [queryClient, onNewNotification]);

  return { isConnected };
};

// Hook for desktop notifications
export const useDesktopNotifications = (enabled: boolean = true) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Request permission for desktop notifications
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, [enabled]);

  const showDesktopNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && enabled) {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    }
    return null;
  };

  return { permission, showDesktopNotification };
};

// Export utility functions
export const notificationUtils = {
  getSeverityColor: (severity: NotificationSeverity): string => {
    const colors = {
      CRITICAL: '#ff4d4f',
      HIGH: '#fa8c16',
      MEDIUM: '#1890ff', 
      LOW: '#52c41a',
      INFO: '#722ed1',
    };
    return colors[severity] || '#d9d9d9';
  },
  
  getSeverityIcon: (severity: NotificationSeverity): string => {
    const icons = {
      CRITICAL: '🚨',
      HIGH: '⚠️',
      MEDIUM: 'ℹ️',
      LOW: '✅',
      INFO: '📢',
    };
    return icons[severity] || 'ℹ️';
  },
  
  getTypeLabel: (type: NotificationType): string => {
    const labels = {
      ALERT_TRIGGERED: 'Alert Triggered',
      CASE_ASSIGNED: 'Case Assigned',
      CASE_UPDATED: 'Case Updated', 
      CASE_CLOSED: 'Case Closed',
      ALERT_RESOLVED: 'Alert Resolved',
      SYSTEM_MAINTENANCE: 'System Maintenance',
      RULE_FAILED: 'Rule Failed',
    };
    return labels[type] || type.replace('_', ' ');
  },
  
  formatTimeAgo: (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
  },
  
  getNotificationSound: (severity: NotificationSeverity): string | null => {
    // Return sound file paths based on severity
    const sounds = {
      CRITICAL: '/sounds/critical.mp3',
      HIGH: '/sounds/high.mp3',
      MEDIUM: '/sounds/medium.mp3',
      LOW: '/sounds/low.mp3',
      INFO: '/sounds/info.mp3',
    };
    return sounds[severity] || null;
  },
};