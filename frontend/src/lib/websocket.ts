import { io, Socket } from 'socket.io-client';
import { notification } from 'antd';
import { BellOutlined, AlertOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import React from 'react';

export interface WebSocketNotification {
  id: string;
  type: 'alert' | 'case_update' | 'assignment' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  read?: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<(notification: WebSocketNotification) => void>> = new Map();

  connect(userId: string, token: string) {
    if (this.socket?.connected) {
      // WebSocket already connected
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    
    this.socket = io(wsUrl, {
      path: '/notifications',
      query: { userId, token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // WebSocket connected
      this.reconnectAttempts = 0;
      notification.success({
        message: 'Connected',
        description: 'Real-time notifications are now active',
        icon: React.createElement(CheckCircleOutlined),
        placement: 'bottomRight',
        duration: 3,
      });
    });

    this.socket.on('disconnect', (reason) => {
      // WebSocket disconnected
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.reconnect();
      }
    });

    this.socket.on('notification', (data: WebSocketNotification) => {
      this.handleNotification(data);
    });

    this.socket.on('alert', (data: any) => {
      this.handleAlert(data);
    });

    this.socket.on('case_update', (data: any) => {
      this.handleCaseUpdate(data);
    });

    this.socket.on('error', (error: any) => {
      // WebSocket error
      notification.error({
        message: 'Connection Error',
        description: 'Failed to establish real-time connection',
        icon: React.createElement(WarningOutlined),
        placement: 'bottomRight',
      });
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      // WebSocket reconnected
      notification.info({
        message: 'Reconnected',
        description: 'Connection restored',
        placement: 'bottomRight',
        duration: 2,
      });
    });

    this.socket.on('reconnect_error', (error: any) => {
      // WebSocket reconnection error
    });

    this.socket.on('reconnect_failed', () => {
      // WebSocket failed to reconnect
      notification.error({
        message: 'Connection Failed',
        description: 'Unable to establish real-time connection. Please refresh the page.',
        placement: 'bottomRight',
        duration: 0,
      });
    });
  }

  private handleNotification(data: WebSocketNotification) {
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/logo.png',
        tag: data.id,
      });
    }

    // Show in-app notification
    const iconMap = {
      critical: React.createElement(AlertOutlined, { style: { color: '#ff4d4f' } }),
      high: React.createElement(WarningOutlined, { style: { color: '#ffa940' } }),
      medium: React.createElement(BellOutlined, { style: { color: '#fadb14' } }),
      low: React.createElement(BellOutlined, { style: { color: '#52c41a' } }),
      info: React.createElement(BellOutlined),
    };

    notification.open({
      message: data.title,
      description: data.message,
      icon: iconMap[data.severity] || iconMap.info,
      placement: 'topRight',
      duration: data.severity === 'critical' ? 0 : 6,
      onClick: () => {
        // Handle notification click
        if (data.type === 'alert' && data.data?.alertId) {
          window.location.href = `/alerts/history?id=${data.data.alertId}`;
        } else if (data.type === 'case_update' && data.data?.caseId) {
          window.location.href = `/cases/${data.data.caseId}`;
        }
      },
    });

    // Notify all registered listeners
    this.notifyListeners(data.type, data);
  }

  private handleAlert(data: any) {
    const notification: WebSocketNotification = {
      id: data.id || Date.now().toString(),
      type: 'alert',
      severity: data.severity || 'medium',
      title: data.title || 'New Alert',
      message: data.message || 'A new alert has been triggered',
      timestamp: new Date(data.timestamp || Date.now()),
      data: data,
    };
    this.handleNotification(notification);
  }

  private handleCaseUpdate(data: any) {
    const notification: WebSocketNotification = {
      id: data.id || Date.now().toString(),
      type: 'case_update',
      severity: 'info',
      title: data.title || 'Case Updated',
      message: data.message || `Case ${data.caseNumber} has been updated`,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data,
    };
    this.handleNotification(notification);
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Maximum reconnection attempts reached
      return;
    }

    this.reconnectAttempts++;
    // Attempting to reconnect
    
    setTimeout(() => {
      this.socket?.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  subscribe(type: string, callback: (notification: WebSocketNotification) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private notifyListeners(type: string, notification: WebSocketNotification) {
    this.listeners.get(type)?.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        // Error in notification listener
      }
    });
  }

  sendMessage(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // WebSocket not connected. Message not sent
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Request browser notification permission
  static async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Notification permission granted
        }
      } catch (error) {
        // Error requesting notification permission
      }
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// React hook for using WebSocket
export function useWebSocket() {
  return webSocketService;
}