'use client';

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tabs,
  Empty,
  Spin,
  Alert,
  Statistic,
  Switch,
  Divider,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  BellOutlined,
  SettingOutlined,
  CheckOutlined,
  DeleteOutlined,
  FilterOutlined,
  DesktopOutlined,
  MailOutlined,
} from '@ant-design/icons';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useRealTimeNotifications,
  useDesktopNotifications,
  notificationUtils,
} from '@/hooks/useNotifications';
import { NotificationType, NotificationSeverity } from '@/lib/types';
import NotificationItem from '@/components/notifications/NotificationItem';
import { NotificationsExportButton } from '@/components/common/ExportButton';

const { Title, Text } = Typography;
const { Search } = Input;

const NotificationsPage: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverity[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  // Queries and mutations
  const { data: notificationsResponse, isLoading, error, refetch } = useNotifications({
    search: searchTerm,
    type: selectedTypes,
    severity: selectedSeverity,
    status: activeTab === 'unread' ? 'PENDING' : undefined,
  });
  
  const { data: unreadCountResponse } = useUnreadCount();
  const { data: preferences, isLoading: preferencesLoading } = useNotificationPreferences();
  
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();
  const updatePreferencesMutation = useUpdateNotificationPreferences();

  // Real-time and desktop notifications
  const { isConnected } = useRealTimeNotifications();
  const { permission, showDesktopNotification } = useDesktopNotifications(
    preferences?.data?.enableDesktop || false
  );

  // Computed values
  const notifications = notificationsResponse?.data?.content || [];
  const unreadCount = unreadCountResponse?.data || 0;
  const totalPages = notificationsResponse?.data?.totalPages || 0;
  const currentPage = notificationsResponse?.data?.number || 0;

  // Event handlers
  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleUpdatePreferences = (field: string, value: any) => {
    updatePreferencesMutation.mutate({
      [field]: value,
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTypes([]);
    setSelectedSeverity([]);
  };

  // Filter options
  const typeOptions = [
    { label: 'Alert Triggered', value: 'ALERT_TRIGGERED' },
    { label: 'Case Assigned', value: 'CASE_ASSIGNED' },
    { label: 'Case Updated', value: 'CASE_UPDATED' },
    { label: 'Case Closed', value: 'CASE_CLOSED' },
    { label: 'Alert Resolved', value: 'ALERT_RESOLVED' },
    { label: 'System Maintenance', value: 'SYSTEM_MAINTENANCE' },
    { label: 'Rule Failed', value: 'RULE_FAILED' },
  ];

  const severityOptions = [
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' },
    { label: 'Info', value: 'INFO' },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Notifications"
          description={error.message}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const renderNotificationsTab = () => (
    <div>
      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Type"
              value={selectedTypes}
              onChange={setSelectedTypes}
              className="w-full"
              options={typeOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Severity"
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              className="w-full"
              options={severityOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space className="w-full">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                Refresh
              </Button>
              {(selectedTypes.length > 0 || selectedSeverity.length > 0 || searchTerm) && (
                <Button onClick={resetFilters}>
                  Clear
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <Text type="secondary">
              Showing {notifications.length} notifications
            </Text>
            <div className="flex items-center gap-2">
              <Text type="secondary">Real-time:</Text>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text type="secondary" className="text-xs">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </div>
          </div>
          <Space>
            <NotificationsExportButton data={notifications} />
            {unreadCount > 0 && (
              <Button
                icon={<CheckOutlined />}
                onClick={handleMarkAllAsRead}
                loading={markAllAsReadMutation.isPending}
              >
                Mark All Read ({unreadCount})
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" tip="Loading notifications..." />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="No notifications found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => refetch()}>
              Refresh
            </Button>
          </Empty>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                compact={false}
                showActions={true}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <Card title="Notification Preferences">
      {preferencesLoading ? (
        <div className="flex justify-center py-8">
          <Spin tip="Loading preferences..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notification Channels */}
          <div>
            <Title level={5}>Notification Channels</Title>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellOutlined />
                  <div>
                    <Text strong>In-App Notifications</Text>
                    <div className="text-gray-500 text-sm">
                      Receive notifications within the application
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences?.data?.enableInApp !== false}
                  onChange={(checked) => handleUpdatePreferences('enableInApp', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MailOutlined />
                  <div>
                    <Text strong>Email Notifications</Text>
                    <div className="text-gray-500 text-sm">
                      Receive notifications via email
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences?.data?.enableEmail || false}
                  onChange={(checked) => handleUpdatePreferences('enableEmail', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DesktopOutlined />
                  <div>
                    <Text strong>Desktop Notifications</Text>
                    <div className="text-gray-500 text-sm">
                      Show browser notifications (Permission: {permission})
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences?.data?.enableDesktop || false}
                  onChange={(checked) => handleUpdatePreferences('enableDesktop', checked)}
                  disabled={permission !== 'granted'}
                />
              </div>
            </div>
          </div>

          <Divider />

          {/* Severity Threshold */}
          <div>
            <Title level={5}>Alert Severity Threshold</Title>
            <Text type="secondary" className="block mb-4">
              Only receive notifications for alerts at or above this severity level
            </Text>
            <Select
              value={preferences?.data?.alertSeverityThreshold || 'MEDIUM'}
              onChange={(value) => handleUpdatePreferences('alertSeverityThreshold', value)}
              className="w-full max-w-xs"
              options={severityOptions}
            />
          </div>

          <Divider />

          {/* Notification Types */}
          <div>
            <Title level={5}>Notification Types</Title>
            <Text type="secondary" className="block mb-4">
              Select which types of notifications you want to receive
            </Text>
            <Select
              mode="multiple"
              value={preferences?.data?.notificationTypes || []}
              onChange={(value) => handleUpdatePreferences('notificationTypes', value)}
              className="w-full"
              options={typeOptions}
              placeholder="Select notification types"
            />
          </div>

          {/* Test Notifications */}
          <Divider />
          <div>
            <Title level={5}>Test Notifications</Title>
            <Space wrap>
              <Button
                onClick={() => {
                  message.info('Test in-app notification');
                }}
              >
                Test In-App
              </Button>
              <Button
                onClick={() => {
                  if (showDesktopNotification) {
                    showDesktopNotification('Test Desktop Notification', {
                      body: 'This is a test desktop notification',
                      icon: '/favicon.ico',
                    });
                  } else {
                    message.warning('Desktop notifications not available');
                  }
                }}
              >
                Test Desktop
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={2} style={{ margin: 0 }}>
            <BellOutlined className="mr-2" />
            Notifications
          </Title>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total"
                value={notificationsResponse?.data?.totalElements || 0}
                prefix={<BellOutlined />}
                loading={isLoading}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Unread"
                value={unreadCount}
                prefix={<BellOutlined style={{ color: '#fa8c16' }} />}
                loading={isLoading}
                valueStyle={{ color: unreadCount > 0 ? '#fa8c16' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="This Week"
                value={notifications.filter(n => 
                  new Date(n.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
                prefix={<BellOutlined style={{ color: '#1890ff' }} />}
                loading={isLoading}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Critical"
                value={notifications.filter(n => n.severity === 'CRITICAL').length}
                prefix={<BellOutlined style={{ color: '#ff4d4f' }} />}
                loading={isLoading}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Main Content */}
      <Tabs
        activeKey={showSettings ? 'settings' : activeTab}
        onChange={(key) => {
          if (key === 'settings') {
            setShowSettings(true);
          } else {
            setShowSettings(false);
            setActiveTab(key);
          }
        }}
        items={[
          {
            key: 'all',
            label: `All (${notificationsResponse?.data?.totalElements || 0})`,
            children: renderNotificationsTab(),
          },
          {
            key: 'unread',
            label: `Unread (${unreadCount})`,
            children: renderNotificationsTab(),
          },
          {
            key: 'settings',
            label: 'Settings',
            children: renderSettingsTab(),
          },
        ]}
      />
    </div>
  );
};

export default NotificationsPage;