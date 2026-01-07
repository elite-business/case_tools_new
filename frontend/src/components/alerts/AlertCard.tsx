'use client';

import React from 'react';
import { Card, Tag, Button, Tooltip, Typography, Space, Dropdown, type MenuProps } from 'antd';
import { 
  ExclamationCircleOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
  FolderAddOutlined,
  MoreOutlined,
  LinkOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { GrafanaAlert } from '@/lib/types';
import { alertUtils } from '@/hooks/useGrafanaAlerts';
import Link from 'next/link';

const { Text, Paragraph } = Typography;

interface AlertCardProps {
  alert: GrafanaAlert;
  onAcknowledge?: (id: number, notes?: string) => void;
  onResolve?: (id: number, notes?: string) => void;
  onCreateCase?: (id: number) => void;
  onAssign?: (id: number, userId: number) => void;
  compact?: boolean;
  showActions?: boolean;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onCreateCase,
  onAssign,
  compact = false,
  showActions = true,
}) => {
  const severityColor = alertUtils.getSeverityColor(alert.severity);
  const statusColor = alertUtils.getStatusColor(alert.status);
  const duration = alertUtils.formatDuration(alert.startsAt, alert.endsAt);

  const getStatusIcon = () => {
    switch (alert.status) {
      case 'OPEN':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'ACKNOWLEDGED':
        return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
      case 'RESOLVED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'CLOSED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'view-details',
      icon: <EyeOutlined />,
      label: 'View Details',
      onClick: () => window.open(`/alerts/${alert.id}`, '_blank'),
    },
    {
      key: 'view-grafana',
      icon: <LinkOutlined />,
      label: 'View in Grafana',
      onClick: () => window.open(alert.generatorURL, '_blank'),
    },
    ...(alert.dashboardUid ? [{
      key: 'view-dashboard',
      icon: <BugOutlined />,
      label: 'View Dashboard',
      onClick: () => window.open(`${process.env.NEXT_PUBLIC_GRAFANA_URL}/d/${alert.dashboardUid}`, '_blank'),
    }] : []),
    { type: 'divider' as const },
    ...(onAcknowledge && alert.status === 'OPEN' && !alert.acknowledgedBy ? [{
      key: 'acknowledge',
      icon: <CheckCircleOutlined />,
      label: 'Acknowledge',
      onClick: () => onAcknowledge(alert.id),
    }] : []),
    ...(onResolve && (alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') ? [{
      key: 'resolve',
      icon: <CheckCircleOutlined />,
      label: 'Resolve',
      onClick: () => onResolve(alert.id),
    }] : []),
    ...(onCreateCase && !alert.caseId ? [{
      key: 'create-case',
      icon: <FolderAddOutlined />,
      label: 'Create Case',
      onClick: () => onCreateCase(alert.id),
    }] : []),
  ];

  const cardTitle = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Text strong className="truncate" title={alert.ruleName}>
          {compact ? (
            alert.ruleName.length > 30 ? 
            `${alert.ruleName.substring(0, 30)}...` : 
            alert.ruleName
          ) : alert.ruleName}
        </Text>
      </div>
      {showActions && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      )}
    </div>
  );

  const cardExtra = (
    <Space size="small">
      <Tag color={severityColor} style={{ margin: 0 }}>
        {alert.severity}
      </Tag>
      <Tag color={statusColor} style={{ margin: 0 }}>
        {alert.status.toUpperCase()}
      </Tag>
    </Space>
  );

  return (
    <Card
      title={cardTitle}
      extra={cardExtra}
      size={compact ? 'small' : 'default'}
      className={`hover:shadow-lg transition-shadow duration-200 ${
        alert.severity === 'CRITICAL' ? 'border-l-4 border-l-red-500' : 
        alert.severity === 'HIGH' ? 'border-l-4 border-l-orange-500' :
        alert.severity === 'MEDIUM' ? 'border-l-4 border-l-blue-500' :
        'border-l-4 border-l-green-500'
      }`}
      bodyStyle={{ padding: compact ? '12px' : '16px' }}
    >
      <Space direction="vertical" size="small" className="w-full">
        {/* Summary */}
        <Paragraph 
          className={`mb-2 ${compact ? 'text-sm' : ''}`}
          ellipsis={{ rows: compact ? 1 : 2, tooltip: true }}
        >
          {alert.summary || alert.description || 'No description available'}
        </Paragraph>

        {/* Metadata */}
        <div className={`grid ${compact ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'}`}>
          <div className="flex items-center gap-1">
            <ClockCircleOutlined className="text-gray-400" />
            <Text type="secondary" className={compact ? 'text-xs' : 'text-sm'}>
              Duration: {duration}
            </Text>
          </div>
          
          {alert.value !== undefined && alert.threshold !== undefined && (
            <div className="flex items-center gap-1">
              <BugOutlined className="text-gray-400" />
              <Text type="secondary" className={compact ? 'text-xs' : 'text-sm'}>
                Value: {alert.value} / {alert.threshold}
              </Text>
            </div>
          )}

          {alert.assignedTo && (
            <div className="flex items-center gap-1">
              <UserOutlined className="text-gray-400" />
              <Text type="secondary" className={compact ? 'text-xs' : 'text-sm'}>
                Assigned: {alert.assignedTo.fullName}
              </Text>
            </div>
          )}

          {alert.caseId && (
            <div className="flex items-center gap-1">
              <FolderAddOutlined className="text-gray-400" />
              <Link href={`/cases/${alert.caseId}`} className="hover:underline">
                <Text type="secondary" className={compact ? 'text-xs' : 'text-sm'}>
                  Case: #{alert.caseId}
                </Text>
              </Link>
            </div>
          )}
        </div>

        {/* Labels (if not compact) */}
        {!compact && Object.keys(alert.labels).length > 0 && (
          <div>
            <Text type="secondary" className="text-xs block mb-1">Labels:</Text>
            <div className="flex flex-wrap gap-1">
              {Object.entries(alert.labels).slice(0, 4).map(([key, value]) => (
                <Tag key={key} size="small" className="text-xs">
                  {key}: {value}
                </Tag>
              ))}
              {Object.keys(alert.labels).length > 4 && (
                <Tooltip title={
                  <div>
                    {Object.entries(alert.labels).slice(4).map(([key, value]) => (
                      <div key={key}>{key}: {value}</div>
                    ))}
                  </div>
                }>
                  <Tag size="small" className="text-xs">
                    +{Object.keys(alert.labels).length - 4} more
                  </Tag>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions (if compact) */}
        {compact && showActions && (
          <div className="flex gap-2 mt-2">
            {onCreateCase && !alert.caseId && (
              <Button 
                size="small" 
                type="primary"
                icon={<FolderAddOutlined />}
                onClick={() => onCreateCase(alert.id)}
              >
                Create Case
              </Button>
            )}
            {onAcknowledge && alert.status === 'OPEN' && !alert.acknowledgedBy && (
              <Button 
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => onAcknowledge(alert.id)}
              >
                Acknowledge
              </Button>
            )}
          </div>
        )}

        {/* Acknowledgment info */}
        {alert.acknowledgedBy && (
          <div className="bg-gray-50 p-2 rounded mt-2">
            <Text type="secondary" className="text-xs">
              Acknowledged by {alert.acknowledgedBy.fullName} on{' '}
              {new Date(alert.acknowledgedAt!).toLocaleString()}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default AlertCard;