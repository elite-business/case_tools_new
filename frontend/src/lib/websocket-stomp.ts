import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
  private client: Client | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<(notification: WebSocketNotification) => void>> = new Map();
  private connected: boolean = false;
  private notificationHandler: ((type: string, config: any) => void) | null = null;

  connect(userId: string, token: string) {
    if (this.connected && this.client?.connected) {
      return;
    }

    this.userId = userId;
    this.token = token;

    // Use SockJS for fallback support
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${wsUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        userId: userId
      },
      debug: () => {}, // Disable debug logs
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = this.onConnect.bind(this);
    this.client.onStompError = this.onError.bind(this);
    this.client.onWebSocketError = this.onError.bind(this);
    this.client.onDisconnect = this.onDisconnect.bind(this);

    this.client.activate();
  }

  private onConnect() {
    this.connected = true;

    // Subscribe to user-specific notifications
    if (this.client && this.userId) {
      // User-specific queue
      this.client.subscribe(`/user/${this.userId}/queue/notifications`, (message: IMessage) => {
        this.handleMessage(message);
      });

      // Broadcast topic
      this.client.subscribe('/topic/notifications', (message: IMessage) => {
        this.handleMessage(message);
      });

      // Admin channel (if user is admin)
      this.client.subscribe('/topic/admin', (message: IMessage) => {
        this.handleMessage(message);
      });
    }

    this.showNotificationInternal('success', {
      message: 'Connected',
      description: 'Real-time notifications enabled',
      icon: React.createElement(CheckCircleOutlined, { style: { color: '#52c41a' } }),
      placement: 'bottomRight',
      duration: 3,
    });
  }

  private onError(error: any) {
    this.connected = false;
    
    this.showNotificationInternal('error', {
      message: 'Connection Error',
      description: 'Failed to connect to notification service',
      icon: React.createElement(WarningOutlined, { style: { color: '#ff4d4f' } }),
      placement: 'bottomRight',
      duration: 5,
    });
  }

  private onDisconnect() {
    this.connected = false;
    
    this.showNotificationInternal('warning', {
      message: 'Disconnected',
      description: 'Real-time notifications disabled. Reconnecting...',
      placement: 'bottomRight',
      duration: 3,
    });
  }

  private handleMessage(message: IMessage) {
    try {
      const data = JSON.parse(message.body);

      // Parse the WebSocket message
      let notificationData: WebSocketNotification;
      
      if (data.payload) {
        // Message from backend WebSocketService
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        notificationData = {
          id: payload.id || Date.now().toString(),
          type: payload.type || 'alert',
          severity: payload.severity || 'info',
          title: payload.title || 'Notification',
          message: payload.message || '',
          timestamp: new Date(data.timestamp || Date.now()),
          data: payload.data,
          read: false
        };
      } else {
        // Direct notification format
        notificationData = {
          id: data.id || Date.now().toString(),
          type: data.type || 'alert',
          severity: data.severity || 'info',
          title: data.title || 'Notification',
          message: data.message || '',
          timestamp: new Date(data.timestamp || Date.now()),
          data: data.data,
          read: false
        };
      }

      // Show notification
      this.showNotification(notificationData);
      
      // Notify listeners
      this.notifyListeners(notificationData.type, notificationData);
      this.notifyListeners('all', notificationData);
      
    } catch (error) {
      // Failed to parse WebSocket message
    }
  }

  private showNotification(notif: WebSocketNotification) {
    const icons = {
      critical: React.createElement(AlertOutlined, { style: { color: '#ff4d4f' } }),
      high: React.createElement(WarningOutlined, { style: { color: '#fa8c16' } }),
      medium: React.createElement(BellOutlined, { style: { color: '#1890ff' } }),
      low: React.createElement(BellOutlined, { style: { color: '#52c41a' } }),
      info: React.createElement(BellOutlined)
    };

    const notificationConfig = {
      message: notif.title,
      description: notif.message,
      icon: icons[notif.severity] || icons.info,
      placement: 'topRight' as const,
      duration: notif.severity === 'critical' ? 0 : 6,
      onClick: () => {
        // Handle notification click
        if (notif.data?.caseId) {
          window.location.href = `/cases/${notif.data.caseId}`;
        }
      }
    };

    switch (notif.severity) {
      case 'critical':
        this.showNotificationInternal('error', notificationConfig);
        break;
      case 'high':
        this.showNotificationInternal('warning', notificationConfig);
        break;
      default:
        this.showNotificationInternal('info', notificationConfig);
    }
  }

  subscribe(eventType: string, callback: (notification: WebSocketNotification) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private notifyListeners(eventType: string, notificationData: WebSocketNotification) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(notificationData);
        } catch (error) {
          // Error in notification listener
        }
      });
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.client?.connected;
  }

  // Set notification handler
  setNotificationHandler(handler: (type: string, config: any) => void) {
    this.notificationHandler = handler;
  }

  // Internal method to show notifications
  private showNotificationInternal(type: string, config: any) {
    if (this.notificationHandler) {
      this.notificationHandler(type, config);
    }
  }

  // Send message to server (if needed)
  send(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
    } else {
      // Cannot send message: WebSocket not connected
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;