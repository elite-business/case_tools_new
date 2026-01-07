'use client';

import React from 'react';
import { List, Typography, Button, Space, Tag, Tooltip, Dropdown, type MenuProps } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  MoreOutlined,
  LinkOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Notification } from '@/lib/types';
import { notificationUtils } from '@/hooks/useNotifications';
import Link from 'next/link';

const { Text, Paragraph } = Typography;

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
  showActions?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
  showActions = true,
}) => {
  const isRead = !!notification.readAt;
  const severityColor = notificationUtils.getSeverityColor(notification.severity);
  const severityIcon = notificationUtils.getSeverityIcon(notification.severity);
  const timeAgo = notificationUtils.formatTimeAgo(notification.createdAt);
  const typeLabel = notificationUtils.getTypeLabel(notification.type);

  const handleItemClick = () => {
    // Mark as read when clicked
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to related resource if available
    if (notification.data?.caseId) {
      window.open(`/cases/${notification.data.caseId}`, '_blank');
    } else if (notification.data?.alertId) {
      window.open(`/alerts/${notification.data.alertId}`, '_blank');
    } else if (notification.data?.url) {
      window.open(notification.data.url, '_blank');
    }
  };

  const menuItems: MenuProps['items'] = [
    ...(onMarkAsRead ? [{
      key: 'toggle-read',
      icon: isRead ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: isRead ? 'Mark as Unread' : 'Mark as Read',
      onClick: () => onMarkAsRead(notification.id),
    }] : []),
    ...(notification.data?.caseId ? [{
      key: 'view-case',
      icon: <LinkOutlined />,
      label: 'View Case',
      onClick: () => window.open(`/cases/${notification.data.caseId}`, '_blank'),
    }] : []),
    ...(notification.data?.alertId ? [{
      key: 'view-alert',
      icon: <LinkOutlined />,
      label: 'View Alert',
      onClick: () => window.open(`/alerts/${notification.data.alertId}`, '_blank'),
    }] : []),
    ...(notification.data?.url ? [{
      key: 'view-link',
      icon: <LinkOutlined />,
      label: 'Open Link',
      onClick: () => window.open(notification.data.url, '_blank'),
    }] : []),
    { type: 'divider' as const },
    ...(onDelete ? [{
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => onDelete(notification.id),
    }] : []),
  ];

  const actions = showActions ? [
    <Dropdown key="more" menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button type="text" icon={<MoreOutlined />} size="small" />
    </Dropdown>
  ] : undefined;

  return (
    <List.Item
      className={`notification-item transition-all duration-200 hover:bg-gray-50 cursor-pointer ${
        !isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      } ${compact ? 'py-2' : 'py-3'}`}
      actions={actions}
      onClick={handleItemClick}
    >
      <List.Item.Meta
        avatar={
          <div className="flex items-center justify-center w-8 h-8 rounded-full"
               style={{ backgroundColor: `${severityColor}20`, color: severityColor }}>
            <span className="text-lg">{severityIcon}</span>
          </div>
        }
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Text strong={!isRead} className={compact ? 'text-sm' : ''}>
                {notification.title}
              </Text>
              {!isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            <div className="flex items-center gap-2">
              <Tag 
                color={severityColor} 
                size="small"
                style={{ margin: 0 }}
              >
                {notification.severity}
              </Tag>
              {compact && (
                <Text type="secondary" className="text-xs">
                  {timeAgo}
                </Text>
              )}
            </div>
          </div>
        }
        description={
          <div className="space-y-1">
            <Paragraph
              className={`mb-1 ${compact ? 'text-xs' : 'text-sm'} ${isRead ? 'text-gray-600' : 'text-gray-800'}`}
              ellipsis={{ rows: compact ? 1 : 2, tooltip: true }}
            >
              {notification.message}
            </Paragraph>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <ClockCircleOutlined className="text-gray-400 text-xs" />
                  <Text type="secondary" className="text-xs">
                    {typeLabel}
                  </Text>
                </div>
                
                {notification.data?.assignedTo && (
                  <div className="flex items-center gap-1">
                    <UserOutlined className="text-gray-400 text-xs" />
                    <Text type="secondary" className="text-xs">
                      {notification.data.assignedTo}
                    </Text>
                  </div>
                )}
                
                {notification.data?.caseId && (
                  <Link href={`/cases/${notification.data.caseId}`} onClick={(e) => e.stopPropagation()}>
                    <Text type="secondary" className="text-xs hover:underline">
                      Case #{notification.data.caseId}
                    </Text>
                  </Link>
                )}
              </div>
              
              {!compact && (
                <Text type="secondary" className="text-xs">
                  {timeAgo}
                </Text>
              )}
            </div>

            {/* Additional metadata for specific notification types */}
            {notification.type === 'ALERT_TRIGGERED' && notification.data?.alertDetails && (
              <div className="bg-gray-100 p-2 rounded mt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {notification.data.alertDetails.ruleName && (
                    <div>
                      <Text type="secondary">Rule:</Text>{' '}
                      <Text>{notification.data.alertDetails.ruleName}</Text>
                    </div>
                  )}
                  {notification.data.alertDetails.value && (
                    <div>
                      <Text type="secondary">Value:</Text>{' '}
                      <Text>{notification.data.alertDetails.value}</Text>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expiration warning */}
            {notification.expiresAt && new Date(notification.expiresAt) < new Date() && (
              <div className="flex items-center gap-1 mt-1">
                <ClockCircleOutlined className="text-orange-500 text-xs" />
                <Text type="warning" className="text-xs">
                  This notification has expired
                </Text>
              </div>
            )}

            {/* Read status */}
            {isRead && notification.readAt && (
              <div className="text-xs text-gray-500">
                Read on {new Date(notification.readAt).toLocaleString()}
              </div>
            )}
          </div>
        }
      />
    </List.Item>
  );
};

export default NotificationItem;