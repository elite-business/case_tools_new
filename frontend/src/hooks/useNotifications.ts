'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { message, notification } from 'antd';
import { wsService, WebSocketNotification } from '@/lib/websocket-stomp';
import { notificationsApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { NotificationSeverity, NotificationType } from '@/lib/types';

export interface NotificationFilters {
  status?: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
  type?: string | string[];
  severity?: string | string[];
  limit?: number;
  offset?: number;
  page?: number;
  size?: number;
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

const buildNotificationParams = (filters: NotificationFilters = {}) => {
  const size = filters.size ?? filters.limit ?? 20;
  const page = filters.page ?? (filters.offset != null ? Math.floor(filters.offset / size) : 0);
  const typeParam = Array.isArray(filters.type) ? filters.type[0] : filters.type;

  return {
    page,
    size,
    search: filters.search || undefined,
    type: typeParam || undefined,
    status: filters.status || undefined,
    unreadOnly: filters.status === 'PENDING' ? true : undefined,
  };
};

// Custom hooks
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.getNotifications(buildNotificationParams(filters)),
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
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const { data: preferences } = useNotificationPreferences();
  const [isConnected, setIsConnected] = useState(false);

  // Request desktop notification permission on mount
  useEffect(() => {
    if (preferences?.data?.enableDesktop && desktopNotificationManager.isSupported()) {
      desktopNotificationManager.requestPermission();
    }
  }, [preferences]);

  const playNotificationSound = useCallback(() => {
    if (preferences?.data?.enableSound === false) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.05;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
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
    // Invalidate queries to refresh UI from persisted notifications
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

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
      setIsConnected(false);
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
      setIsConnected(wsService.isConnected());

      const connectionInterval = setInterval(() => {
        setIsConnected(wsService.isConnected());
      }, 5000);

      return () => {
        clearInterval(connectionInterval);
        unsubscribe();
        // Don't disconnect here as other components might be using it
      };
    }
  }, [isAuthenticated, user, handleWebSocketNotification]);

  return {
    isConnected,
    desktopNotificationManager,
    requestDesktopPermission: () => desktopNotificationManager.requestPermission(),
  };
}

export const useDesktopNotifications = (enabled: boolean = true) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    if ('Notification' in window) {
      setPermission(Notification.permission);

      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, [enabled]);

  const showDesktopNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && enabled) {
      const desktopNotification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      setTimeout(() => desktopNotification.close(), 5000);
      return desktopNotification;
    }
    return null;
  };

  return { permission, showDesktopNotification };
};

// Export the desktop notification manager for direct use
export { desktopNotificationManager };

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
      ALERT_FIRED: 'Alert Triggered',
      ALERT_RESOLVED: 'Alert Resolved',
      CASE_CREATED: 'Case Created',
      CASE_ASSIGNED: 'Case Assigned',
      CASE_UPDATED: 'Case Updated',
      CASE_RESOLVED: 'Case Resolved',
      CASE_REOPENED: 'Case Reopened',
      CASE_CLOSED: 'Case Closed',
      TEAM_CASE_CREATED: 'Team Case',
      TEAM_UPDATE: 'Team Update',
      SYSTEM_MAINTENANCE: 'System Maintenance',
      RULE_FAILED: 'Rule Failed',
      CUSTOM: 'Notification',
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
};
