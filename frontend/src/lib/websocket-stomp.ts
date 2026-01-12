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
  private userRoles: string[] = [];
  private userTeams: string[] = []; // Team IDs the user belongs to
  private listeners: Map<string, Set<(notification: WebSocketNotification) => void>> = new Map();
  private connected: boolean = false;
  private notificationHandler: ((type: string, config: any) => void) | null = null;

  connect(userId: string, token: string, roles?: string[], teams?: string[]) {
    if (this.connected && this.client?.connected) {
      return;
    }
    if (this.client) {
      if (this.client.active || this.client.connected) {
        return;
      }
      try {
        this.client.deactivate();
      } catch (error) {
        // Ignore cleanup failures and reinitialize
      }
    }

    this.userId = userId;
    this.token = token;
    this.userRoles = roles || [];
    this.userTeams = teams || [];

    // Use SockJS for fallback support
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    
    const client = new Client({
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

    client.onConnect = this.onConnect.bind(this);
    client.onStompError = this.onError.bind(this);
    client.onWebSocketError = this.onError.bind(this);
    client.onDisconnect = this.onDisconnect.bind(this);

    this.client = client;
    this.client.activate();
  }

  private onConnect() {
    if (!this.client || !this.client.connected) {
      return;
    }
    this.connected = true;

    // Subscribe to user-specific notifications
    if (this.client && this.userId) {
      // User-specific queue
      this.client.subscribe(`/user/${this.userId}/queue/notifications`, (message: IMessage) => {
        this.handleMessage(message);
      });

      // User-specific topic
      this.client.subscribe(`/topic/notifications/${this.userId}`, (message: IMessage) => {
        this.handleMessage(message);
      });

      // Subscribe to SPECIFIC team channels the user belongs to - NOT wildcard
      // This prevents users from receiving notifications for teams they're not part of
      if (this.userTeams && this.userTeams.length > 0) {
        this.userTeams.forEach(teamId => {
          const teamChannel = `/topic/team.${teamId}`;
          this.client!.subscribe(teamChannel, (message: IMessage) => {
            console.debug(`Received message on team channel ${teamId}:`, message);
            this.handleMessage(message);
          });
          console.log(`Subscribed to team channel: ${teamChannel}`);
        });
      }

      // Admin channel - ONLY subscribe if user has admin role
      const isAdmin = this.userRoles.includes('ADMIN') || this.userRoles.includes('ROLE_ADMIN');
      if (isAdmin) {
        this.client.subscribe('/topic/admin', (message: IMessage) => {
          console.debug('Received admin message:', message);
          this.handleMessage(message);
        });
        
        // Subscribe to unassigned case notifications for admins only
        this.client.subscribe('/topic/admin/unassigned-case', (message: IMessage) => {
          console.debug('Received unassigned case message:', message);
          this.handleMessage(message);
        });
        console.log('Subscribed to admin channels');
      }
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
      console.debug('Received WebSocket message:', data);

      // Parse the WebSocket message
      let notificationData: WebSocketNotification;
      
      if (data.payload) {
        // Message from backend WebSocketService with payload wrapper
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        
        // Extract notification data from the structured payload
        notificationData = {
          id: payload.id || Date.now().toString(),
          type: this.mapEventToType(data.event) || payload.type || 'alert',
          severity: this.mapSeverity(payload.severity) || 'info',
          title: payload.title || this.getDefaultTitle(data.event),
          message: payload.message || this.buildMessage(payload),
          timestamp: new Date(data.timestamp || payload.timestamp || Date.now()),
          data: payload.data || payload,
          read: false
        };
      } else {
        // Direct notification format from ImprovedWebhookService
        notificationData = {
          id: data.id || Date.now().toString(),
          type: this.mapEventToType(data.event) || data.type || 'alert',
          severity: this.mapSeverity(data.severity) || 'info',
          title: data.title || this.getDefaultTitle(data.type),
          message: data.message || this.buildMessage(data),
          timestamp: new Date(data.timestamp || Date.now()),
          data: data.data || data,
          read: false
        };
      }

      // Show notification with proper formatting
      this.showNotification(notificationData);
      
      // Notify listeners
      this.notifyListeners(notificationData.type, notificationData);
      this.notifyListeners('all', notificationData);
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private mapEventToType(event?: string): 'alert' | 'case_update' | 'assignment' | 'system' {
    if (!event) return 'alert';
    if (event.includes('case.assigned') || event.includes('case.team')) return 'assignment';
    if (event.includes('case.updated')) return 'case_update';
    if (event.includes('admin')) return 'system';
    return 'alert';
  }

  private mapSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (!severity) return 'info';
    const sev = severity.toLowerCase();
    if (sev === 'critical') return 'critical';
    if (sev === 'high') return 'high';
    if (sev === 'medium') return 'medium';
    if (sev === 'low') return 'low';
    return 'info';
  }

  private getDefaultTitle(event?: string): string {
    if (!event) return 'Notification';
    if (event.includes('case.assigned')) return 'Case Assigned';
    if (event.includes('case.team')) return 'Team Case';
    if (event.includes('case.created')) return 'New Case Created';
    if (event.includes('case.updated')) return 'Case Updated';
    if (event.includes('admin.unassigned')) return 'Unassigned Case';
    return 'Notification';
  }

  private buildMessage(data: any): string {
    if (data.message) return data.message;
    
    if (data.data) {
      const caseData = data.data;
      const parts = [];
      
      if (caseData.caseNumber) parts.push(`Case: ${caseData.caseNumber}`);
      if (caseData.caseTitle) parts.push(caseData.caseTitle);
      if (caseData.severity) parts.push(`Severity: ${caseData.severity}`);
      if (caseData.assignedTo && caseData.assignedTo !== 'Unassigned') {
        parts.push(`Assigned to: ${caseData.assignedTo}`);
      }
      
      return parts.join('\n') || 'New notification received';
    }
    
    return 'New notification received';
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
