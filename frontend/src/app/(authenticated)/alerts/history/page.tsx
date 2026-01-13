'use client';

import React, { useState } from 'react';
import {
  PageContainer,
  ProTable,
  ProCard,
  ModalForm,
  ProFormTextArea,
  ProFormSelect,
} from '@ant-design/pro-components';
import { 
  Button, 
  Space, 
  Tag, 
  Dropdown, 
  message, 
  Badge,
  DatePicker,
  Select,
  Alert,
  Card,
  Statistic,
  Row,
  Col,
  Descriptions,
  Drawer,
  Timeline,
  Avatar,
  Tooltip,
  Progress,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, handleApiError } from '@/lib/api-client';
import { AlertHistory, AlertFilters, AlertSeverity, AlertStatus } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { isManagerOrHigher, canManageAlerts, Permission } from '@/lib/rbac';
import { RoleGuard } from '@/components/auth/RoleGuard';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const severityColorMap: Record<AlertSeverity, string> = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#fa8c16',
  CRITICAL: '#ff4d4f',
};

const formatTimestamp = (value?: string) => {
  if (!value) return 'N/A';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : 'N/A';
};

const statusColorMap: Record<AlertStatus, string> = {
  OPEN: '#ff4d4f',
  ACKNOWLEDGED: '#faad14',
  RESOLVED: '#52c41a',
  CLOSED: '#d9d9d9',
  SUPPRESSED: '#722ed1',
};

const severityIconMap: Record<AlertSeverity, React.ReactNode> = {
  LOW: <Badge status="success" />,
  MEDIUM: <Badge status="warning" />,
  HIGH: <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />,
  CRITICAL: <FireOutlined style={{ color: '#ff4d4f' }} />,
};

export default function AlertHistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState<AlertHistory | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<AlertFilters>({});
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const queryClient = useQueryClient();

  // Get user role and permissions
  const { user } = useAuthStore();
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';
  const canAcknowledgeAlert = canManageAlerts(userRole);
  const canResolveAlert = canManageAlerts(userRole);
  const canViewAllAlerts = isManagerOrHigher(userRole);

  if (!canViewAllAlerts) {
    return (
      <PageContainer title="Alert History & Audit Trail">
        <Alert
          message="Access Denied"
          description="Alert audit trail is available to admins and managers only."
          type="error"
          showIcon
        />
      </PageContainer>
    );
  }

  // Fetch alert history with role-based filtering
  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alertHistory', filters],
    queryFn: () => {
      // For non-admin/non-manager users, filter to only show their assigned alerts
      const queryFilters = { ...filters };
      if (!canViewAllAlerts && user?.id) {
        queryFilters.assignedTo = [user.id];
      }
      return alertsApi.getHistory(queryFilters);
    },
    select: (response) => response.data,
    enabled: canViewAllAlerts,
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => 
      alertsApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      message.success('Alert acknowledged');
      queryClient.invalidateQueries({ queryKey: ['alertHistory'] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: (alertId: number) => 
      alertsApi.resolveAlert(alertId),
    onSuccess: () => {
      message.success('Alert resolved');
      queryClient.invalidateQueries({ queryKey: ['alertHistory'] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const columns: ProColumns<AlertHistory>[] = [
    {
      title: 'Alert',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            {severityIconMap[record.severity || 'LOW']}
            <strong>{record.ruleName || record.alertName || text}</strong>
          </Space>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.ruleId && `Rule ID: ${record.ruleId}`}
            {record.grafanaRuleUid && (record.ruleId ? ` | UID: ${record.grafanaRuleUid}` : `UID: ${record.grafanaRuleUid}`)}
          </div>
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (_, record) => (
        <Tag color={severityColorMap[record.severity || 'LOW']} style={{ fontWeight: 'bold' }}>
          {record.severity || 'LOW'}
        </Tag>
      ),
      filters: [
        { text: 'Critical', value: 'CRITICAL' },
        { text: 'High', value: 'HIGH' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'Low', value: 'LOW' },
      ],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={statusColorMap[record.status || 'OPEN']}>
          {(record.status || 'OPEN').replace('_', ' ')}
        </Tag>
      ),
      filters: [
        { text: 'Open', value: 'OPEN' },
        { text: 'Acknowledged', value: 'ACKNOWLEDGED' },
        { text: 'Resolved', value: 'RESOLVED' },
        { text: 'Closed', value: 'CLOSED' },
        { text: 'Suppressed', value: 'SUPPRESSED' },
      ],
    },
    {
      title: 'Triggered',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      width: 150,
      valueType: 'dateTime',
      render: (_, record) => {
        const dateValue = record.triggeredAt || record.receivedAt || record.createdAt;
        if (!dateValue) return 'Unknown';
        const date = dayjs(dateValue);
        return date.isValid() ? (
          <Tooltip title={date.format('YYYY-MM-DD HH:mm:ss')}>
            {date.fromNow()}
          </Tooltip>
        ) : 'Invalid Date';
      },
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        const startDate = record.triggeredAt || record.receivedAt || record.createdAt;
        if (!startDate) return 'N/A';
        
        const start = dayjs(startDate);
        if (!start.isValid()) return 'Invalid';
        
        const end = record.resolvedAt ? dayjs(record.resolvedAt) : dayjs();
        const duration = end.diff(start, 'minute');
        
        if (duration < 0) return 'N/A'; // Handle invalid duration
        
        let color = '#52c41a';
        if (duration > 60) color = '#faad14';
        if (duration > 180) color = '#ff4d4f';
        
        return (
          <Tag color={color}>
            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
          </Tag>
        );
      },
    },
    {
      title: 'Value/Threshold',
      key: 'metrics',
      width: 120,
      render: (_, record) => {
        const hasValue = record?.value != null;
        const hasThreshold = record?.threshold != null;
        return (
          <Space direction="vertical" size="small">
            {hasValue && (
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {typeof record.value === 'number' ? record.value.toLocaleString() : record.value}
              </div>
            )}
            {hasThreshold && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                Threshold: {typeof record.threshold === 'number' ? record.threshold.toLocaleString() : record.threshold}
              </div>
            )}
            {!hasValue && !hasThreshold && (
              <div style={{ fontSize: '12px', color: '#999' }}>No metrics</div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 120,
      render: (_, record) => {
        // Check different possible assignment field structures
        const assignedUser = record.assignedTo;
        const assignedToName = record.assignedToName;
        const assignedToUsername = record.assignedToUsername;
        
        // If we have direct assignedTo user object
        if (assignedUser && (assignedUser.name || assignedUser.username)) {
          return (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              {assignedUser.name || assignedUser.fullName || assignedUser.username || 'Unknown User'}
            </Space>
          );
        }
        
        // If we have assignment fields from backend mapping
        if (assignedToName && assignedToName !== 'Unknown User') {
          return (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              {assignedToName}
            </Space>
          );
        }
        
        return <span style={{ color: '#999' }}>Unassigned</span>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedAlert(record);
              setDrawerOpen(true);
            }}
            title="View Details"
          />
          {canAcknowledgeAlert && record.status === 'OPEN' && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => acknowledgeMutation.mutate(record.id)}
              title="Acknowledge"
              style={{ color: '#faad14' }}
            />
          )}
          <RoleGuard permissions={Permission.RESOLVE_ALERTS}>
            {['OPEN', 'ACKNOWLEDGED'].includes(record.status) && (
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => resolveMutation.mutate(record.id)}
                title="Resolve"
                style={{ color: '#52c41a' }}
              />
            )}
          </RoleGuard>
        </Space>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      const response = await alertsApi.exportHistory(filters, 'csv');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alert-history-${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Alert history exported successfully');
    } catch (error) {
      message.error('Failed to export alert history');
    }
  };

  const handleFilterChange = (key: keyof AlertFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
    if (dates && dates.length === 2) {
      handleFilterChange('dateFrom', dates[0].format('YYYY-MM-DD'));
      handleFilterChange('dateTo', dates[1].format('YYYY-MM-DD'));
    } else {
      handleFilterChange('dateFrom', undefined);
      handleFilterChange('dateTo', undefined);
    }
  };

  // Calculate real statistics from the data
  const stats = React.useMemo(() => {
    if (!historyData?.content) {
      return { total: 0, open: 0, resolved: 0, avgResolution: 0 };
    }
    
    const alerts = historyData.content;
    const total = historyData.totalElements || 0;
    const open = alerts.filter((alert: AlertHistory) => alert.status === 'OPEN').length;
    const resolved = alerts.filter((alert: AlertHistory) => alert.status === 'RESOLVED').length;
    
    // Calculate average resolution time for resolved alerts
    const resolvedAlerts = alerts.filter((alert: AlertHistory) => 
      alert.status === 'RESOLVED' && alert.triggeredAt && alert.resolvedAt
    );
    
    let avgResolution = 0;
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce((sum: number, alert: AlertHistory) => {
        const triggered = dayjs(alert.triggeredAt || alert.receivedAt || alert.createdAt);
        const resolved = dayjs(alert.resolvedAt);
        if (triggered.isValid() && resolved.isValid()) {
          return sum + resolved.diff(triggered, 'minute');
        }
        return sum;
      }, 0);
      avgResolution = Math.round(totalResolutionTime / resolvedAlerts.length);
    }
    
    return { total, open, resolved, avgResolution };
  }, [historyData]);

  return (
    <PageContainer
      title="Alert History & Audit Trail"
      subTitle="Complete alert audit trail - view all received alerts, their processing status, and lifecycle events. This serves as a compliance and forensic analysis tool."
      extra={[
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          Export Audit Log
        </Button>,
      ]}
    >
      {/* Statistics Overview */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Alerts"
              value={stats.total}
              prefix={<BellOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Open Alerts"
              value={stats.open}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Resolved"
              value={stats.resolved}
              prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Resolution"
              value={stats.avgResolution}
              suffix="min"
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder={['Start Date', 'End Date']}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Severity"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => handleFilterChange('severity', value ? [value] : undefined)}
          >
            <Option value="CRITICAL">Critical</Option>
            <Option value="HIGH">High</Option>
            <Option value="MEDIUM">Medium</Option>
            <Option value="LOW">Low</Option>
          </Select>
          <Select
            placeholder="Status"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => handleFilterChange('status', value ? [value] : undefined)}
          >
            <Option value="OPEN">Open</Option>
            <Option value="ACKNOWLEDGED">Acknowledged</Option>
            <Option value="RESOLVED">Resolved</Option>
            <Option value="CLOSED">Closed</Option>
          </Select>
        </Space>
      </Card>

      {/* Alert History Table */}
      <ProTable<AlertHistory>
        columns={columns}
        dataSource={historyData?.content || []}
        loading={isLoading}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 20,
          total: historyData?.totalElements || 0,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        toolbar={{
          actions: [
            <Button key="filter" icon={<FilterOutlined />}>
              Advanced Filters
            </Button>,
          ],
        }}
        scroll={{ x: 1200 }}
        rowClassName={(record) => {
          if (record.severity === 'CRITICAL') return 'critical-row';
          if (record.status === 'OPEN') return 'open-row';
          return '';
        }}
      />

      {/* Alert Details Drawer */}
      <Drawer
        title="Alert Details"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={600}
      >
        {selectedAlert && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Alert Overview */}
            <Card title="Alert Information" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Rule Name">
                  <strong>{selectedAlert.ruleName || selectedAlert.alertName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Tag color={severityColorMap[selectedAlert.severity || 'LOW']}>
                    {selectedAlert.severity || 'LOW'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColorMap[selectedAlert.status || 'OPEN']}>
                    {(selectedAlert.status || 'OPEN').replace('_', ' ')}
                  </Tag>
                </Descriptions.Item>
                {selectedAlert.message && (
                  <Descriptions.Item label="Message">
                    {selectedAlert.message}
                  </Descriptions.Item>
                )}
                {selectedAlert.value != null && (
                  <Descriptions.Item label="Current Value">
                    {typeof selectedAlert.value === 'number' ? selectedAlert.value.toLocaleString() : selectedAlert.value}
                  </Descriptions.Item>
                )}
                {selectedAlert.threshold != null && (
                  <Descriptions.Item label="Threshold">
                    {typeof selectedAlert.threshold === 'number' ? selectedAlert.threshold.toLocaleString() : selectedAlert.threshold}
                  </Descriptions.Item>
                )}
                {selectedAlert.assignedTo && (
                  <Descriptions.Item label="Assigned To">
                    {selectedAlert.assignedTo.name || selectedAlert.assignedTo.username || selectedAlert.assignedTo.fullName}
                  </Descriptions.Item>
                )}
                {selectedAlert.caseId && (
                  <Descriptions.Item label="Related Case">
                    Case #{selectedAlert.caseId}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Timeline */}
            <Card title="Alert Timeline" size="small">
              <Timeline>
                <Timeline.Item 
                  color="red"
                  dot={<FireOutlined />}
                >
                  <strong>Alert Triggered</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {selectedAlert.triggeredAt 
                      ? formatTimestamp(selectedAlert.triggeredAt)
                      : selectedAlert.receivedAt 
                        ? formatTimestamp(selectedAlert.receivedAt)
                        : formatTimestamp(selectedAlert.createdAt)
                    }
                  </span>
                </Timeline.Item>
                
                {selectedAlert.acknowledgedAt && (
                  <Timeline.Item 
                    color="orange"
                    dot={<CheckOutlined />}
                  >
                    <strong>Acknowledged</strong>
                    {selectedAlert.acknowledgedBy && (
                      <span> by {selectedAlert.acknowledgedBy.name || selectedAlert.acknowledgedBy.username}</span>
                    )}
                    <br />
                    <span style={{ color: '#666' }}>
                      {formatTimestamp(selectedAlert.acknowledgedAt)}
                    </span>
                  </Timeline.Item>
                )}
                
                {selectedAlert.resolvedAt && (
                  <Timeline.Item 
                    color="green"
                    dot={<CloseOutlined />}
                  >
                    <strong>Resolved</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {formatTimestamp(selectedAlert.resolvedAt)}
                    </span>
                  </Timeline.Item>
                )}
              </Timeline>
            </Card>

            {/* Notes */}
            {selectedAlert.notes && (
              <Card title="Notes" size="small">
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedAlert.notes}</div>
              </Card>
            )}

            {/* Actions */}
            {['OPEN', 'ACKNOWLEDGED'].includes(selectedAlert.status) && (canAcknowledgeAlert || canResolveAlert) && (
              <Card title="Actions" size="small">
                <Space>
                  {canAcknowledgeAlert && selectedAlert.status === 'OPEN' && (
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => {
                        acknowledgeMutation.mutate(selectedAlert.id);
                        setDrawerOpen(false);
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {canResolveAlert && (
                    <Button
                      type="primary"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => {
                        resolveMutation.mutate(selectedAlert.id);
                        setDrawerOpen(false);
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}
