'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { message, notification } from 'antd';
import { wsService, WebSocketNotification } from '@/lib/websocket-stomp';
import { useAuthStore } from '@/store/auth-store';

export interface NotificationFilters {
  status?: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
  type?: string;
  severity?: string;
  limit?: number;
  offset?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Desktop Notification Manager
class DesktopNotificationManager {
  private permission: NotificationPermission = 'default';
  private isEnabled: boolean = false;
  
  constructor() {
    this.checkPermission();
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      this.isEnabled = this.permission === 'granted';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Desktop notifications not supported');
      return false;
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    this.isEnabled = this.permission === 'granted';
    return this.isEnabled;
  }

  show(title: string, options: NotificationOptions = {}, onClick?: () => void): Notification | null {
    if (!this.isEnabled) {
      return null;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    if (onClick) {
      notification.onclick = onClick;
    }

    // Auto close after 5 seconds for non-critical notifications
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Singleton instance
const desktopNotificationManager = new DesktopNotificationManager();

// Notification store for state management
interface NotificationStore {
  notifications: WebSocketNotification[];
  unreadCount: number;
  isConnected: boolean;
  lastUpdate: Date | null;
}

const notificationStore: NotificationStore = {
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  lastUpdate: null,
};

// Mock API functions (replace with actual API calls)
const notificationsApi = {
  getNotifications: async (filters: NotificationFilters = {}) => {
    // Mock implementation - replace with actual API call
    const { limit = 50, offset = 0 } = filters;
    return {
      data: {
        content: notificationStore.notifications.slice(offset, offset + limit),
        totalElements: notificationStore.notifications.length,
        totalPages: Math.ceil(notificationStore.notifications.length / limit),
        number: Math.floor(offset / limit),
        size: limit,
        first: offset === 0,
        last: offset + limit >= notificationStore.notifications.length,
      },
      success: true,
    };
  },

  getUnreadCount: async () => {
    return {
      data: notificationStore.unreadCount,
      success: true,
    };
  },

  markAsRead: async (id: number) => {
    const notification = notificationStore.notifications.find(n => Number(n.id) === id);
    if (notification && !notification.read) {
      notification.read = true;
      notificationStore.unreadCount = Math.max(0, notificationStore.unreadCount - 1);
    }
    return { success: true };
  },

  markAllAsRead: async () => {
    notificationStore.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
      }
    });
    notificationStore.unreadCount = 0;
    return { success: true };
  },

  deleteNotification: async (id: number) => {
    const index = notificationStore.notifications.findIndex(n => Number(n.id) === id);
    if (index !== -1) {
      const notification = notificationStore.notifications[index];
      if (!notification.read) {
        notificationStore.unreadCount = Math.max(0, notificationStore.unreadCount - 1);
      }
      notificationStore.notifications.splice(index, 1);
    }
    return { success: true };
  },

  updatePreferences: async (preferences: any) => {
    // Mock implementation
    return { success: true, data: preferences };
  },

  getPreferences: async () => {
    // Mock implementation
    return {
      success: true,
      data: {
        enableEmail: true,
        enableInApp: true,
        enableDesktop: true,
        alertSeverityThreshold: 'MEDIUM',
        notificationTypes: ['ALERT_TRIGGERED', 'CASE_ASSIGNED', 'CASE_UPDATED'],
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  },
};

// Custom hooks
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.getNotifications(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      message.success('Notification marked as read');
    },
    onError: (error) => {
      message.error('Failed to mark notification as read');
      console.error('Mark as read error:', error);
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      message.success('All notifications marked as read');
    },
    onError: (error) => {
      message.error('Failed to mark all notifications as read');
      console.error('Mark all as read error:', error);
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      message.success('Notification deleted');
    },
    onError: (error) => {
      message.error('Failed to delete notification');
      console.error('Delete notification error:', error);
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (preferences: any) => notificationsApi.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      message.success('Notification preferences updated');
    },
    onError: (error) => {
      message.error('Failed to update notification preferences');
      console.error('Update preferences error:', error);
    },
  });
}

// Enhanced real-time notifications hook with desktop support
export function useRealTimeNotifications(onNotification?: (notification: WebSocketNotification) => void) {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const { data: preferences } = useNotificationPreferences();

  // Request desktop notification permission on mount
  useEffect(() => {
    if (preferences?.data?.enableDesktop && desktopNotificationManager.isSupported()) {
      desktopNotificationManager.requestPermission();
    }
  }, [preferences]);

  // Initialize sound
  useEffect(() => {
    soundRef.current = new Audio('/sounds/notification.mp3');
    soundRef.current.volume = 0.5;
    
    return () => {
      if (soundRef.current) {
        soundRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (soundRef.current && preferences?.data?.enableSound !== false) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(console.warn);
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [preferences]);

  const isInQuietHours = useCallback(() => {
    const prefs = preferences?.data;
    if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);
    
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;
    
    if (quietStart < quietEnd) {
      return currentTime >= quietStart && currentTime < quietEnd;
    } else {
      // Spans midnight
      return currentTime >= quietStart || currentTime < quietEnd;
    }
  }, [preferences]);

  const shouldShowNotification = useCallback((notificationData: WebSocketNotification) => {
    const prefs = preferences?.data;
    if (!prefs) return true;

    // Check if notification type is enabled
    if (prefs.notificationTypes && !prefs.notificationTypes.includes(notificationData.type.toUpperCase())) {
      return false;
    }

    // Check severity threshold
    if (prefs.alertSeverityThreshold) {
      const severityOrder = { 'low': 1, 'info': 1, 'medium': 2, 'high': 3, 'critical': 4 };
      const notifSeverity = severityOrder[notificationData.severity.toLowerCase()] || 1;
      const thresholdSeverity = severityOrder[prefs.alertSeverityThreshold.toLowerCase()] || 1;
      
      if (notifSeverity < thresholdSeverity) {
        return false;
      }
    }

    // Check quiet hours for non-critical notifications
    if (notificationData.severity !== 'critical' && isInQuietHours()) {
      return false;
    }

    return true;
  }, [preferences, isInQuietHours]);

  const handleWebSocketNotification = useCallback((notificationData: WebSocketNotification) => {
    // Add to local store
    notificationStore.notifications.unshift(notificationData);
    if (notificationStore.notifications.length > 100) {
      notificationStore.notifications = notificationStore.notifications.slice(0, 100);
    }
    
    if (!notificationData.read) {
      notificationStore.unreadCount += 1;
    }
    notificationStore.lastUpdate = new Date();

    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Check if should show notification
    if (!shouldShowNotification(notificationData)) {
      return;
    }

    // Play sound for important notifications
    if (['critical', 'high'].includes(notificationData.severity)) {
      playNotificationSound();
    }

    // Show in-app notification
    if (preferences?.data?.enableInApp !== false) {
      const config = {
        message: notificationData.title,
        description: notificationData.message,
        duration: notificationData.severity === 'critical' ? 0 : 6,
        placement: 'topRight' as const,
        onClick: () => {
          if (notificationData.data?.caseId) {
            window.location.href = `/cases/${notificationData.data.caseId}`;
          }
        },
      };

      switch (notificationData.severity) {
        case 'critical':
          notification.error(config);
          break;
        case 'high':
          notification.warning(config);
          break;
        case 'medium':
        case 'low':
        case 'info':
        default:
          notification.info(config);
          break;
      }
    }

    // Show desktop notification
    if (preferences?.data?.enableDesktop !== false && document.hidden) {
      desktopNotificationManager.show(
        notificationData.title,
        {
          body: notificationData.message,
          tag: `notification-${notificationData.id}`,
          requireInteraction: notificationData.severity === 'critical',
          silent: notificationData.severity === 'low',
        },
        () => {
          window.focus();
          if (notificationData.data?.caseId) {
            window.location.href = `/cases/${notificationData.data.caseId}`;
          }
        }
      );
    }

    // Call custom handler
    onNotification?.(notificationData);
  }, [queryClient, shouldShowNotification, playNotificationSound, preferences, onNotification]);

  // WebSocket connection management
  useEffect(() => {
    if (!isAuthenticated || !user) {
      notificationStore.isConnected = false;
      return;
    }

    // Connect to WebSocket
    const userToken = user.token || localStorage.getItem('token');
    if (userToken) {
      wsService.connect(
        String(user.id),
        userToken,
        user.roles || [user.role],
        user.teams || []
      );

      // Subscribe to notifications
      const unsubscribe = wsService.subscribe('all', handleWebSocketNotification);
      notificationStore.isConnected = wsService.isConnected();

      return () => {
        unsubscribe();
        // Don't disconnect here as other components might be using it
      };
    }
  }, [isAuthenticated, user, handleWebSocketNotification]);

  return {
    isConnected: notificationStore.isConnected,
    desktopNotificationManager,
    requestDesktopPermission: () => desktopNotificationManager.requestPermission(),
  };
}

// Export the desktop notification manager for direct use
export { desktopNotificationManager };