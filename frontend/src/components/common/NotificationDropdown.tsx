'use client';

import React, { useState } from 'react';
import {
  Badge,
  Dropdown,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Tooltip,
  theme,
  Spin,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useRealTimeNotifications,
} from '@/hooks/useNotifications';
import { Notification as NotificationInterface } from '@/lib/types';
import NotificationItem from '@/components/notifications/NotificationItem';

const { Text, Title } = Typography;

interface NotificationDropdownProps {
  maxCount?: number;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  showMarkAllRead?: boolean;
  showSettings?: boolean;
  onNotificationClick?: (notification: NotificationInterface) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  maxCount = 10,
  placement = 'bottomRight',
  showMarkAllRead = true,
  showSettings = true,
  onNotificationClick,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [open, setOpen] = useState(false);
  
  const router = useRouter();
  const { token } = theme.useToken();

  // Queries and mutations
  const { data: notificationsResponse, isLoading } = useNotifications({ 
    limit: maxCount,
    status: filter === 'unread' ? 'PENDING' : undefined 
  });
  const { data: unreadCountResponse } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  // Real-time updates
  useRealTimeNotifications((notification) => {
    // Optional: Handle new notifications here
    console.log('New notification:', notification);
  });

  const notifications = notificationsResponse?.data?.content || [];
  const unreadCount = unreadCountResponse?.data || 0;
  const filteredNotifications = notifications.slice(0, maxCount);

  // Event handlers
  const handleNotificationClick = (notification: NotificationInterface) => {
    // Mark as read if unread
    if (!notification.readAt) {
      markAsReadMutation.mutate(notification.id);
    }

    // Call custom handler
    onNotificationClick?.(notification);

    // Navigate based on notification data
    if (notification.data?.caseId) {
      router.push(`/cases/${notification.data.caseId}`);
    } else if (notification.data?.alertId) {
      router.push(`/alerts/${notification.data.alertId}`);
    } else if (notification.data?.url) {
      router.push(notification.data.url);
    }
    
    setOpen(false);
  };

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Dropdown content
  const dropdownContent = (
    <div style={{ 
      width: 400, 
      maxHeight: 500, 
      backgroundColor: token.colorBgElevated,
      border: `1px solid ${token.colorBorder}`,
      borderRadius: 8,
      boxShadow: token.boxShadowSecondary,
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Title level={5} style={{ margin: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          )}
        </Title>
        
        <Space>
          {showMarkAllRead && unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={handleMarkAllRead}
                loading={markAllAsReadMutation.isPending}
              />
            </Tooltip>
          )}
          {showSettings && (
            <Tooltip title="Notification settings">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => {
                  router.push('/notifications/settings');
                  setOpen(false);
                }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Filters */}
      <div style={{ 
        padding: '8px 16px', 
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}>
        <Space>
          <Button
            type={filter === 'all' ? 'primary' : 'text'}
            size="small"
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            type={filter === 'unread' ? 'primary' : 'text'}
            size="small"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
        </Space>
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Spin tip="Loading notifications..." />
          </div>
        ) : filteredNotifications.length > 0 ? (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                compact={true}
                showActions={true}
              />
            )}
            split={false}
            style={{ padding: 0 }}
          />
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                filter === 'unread' ? 'No unread notifications' : 'No notifications'
              }
              style={{ margin: 0 }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div style={{ 
          padding: '8px 16px', 
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          textAlign: 'center',
        }}>
          <Button
            type="link"
            size="small"
            onClick={() => {
              router.push('/notifications');
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      placement={placement}
      trigger={['click']}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;