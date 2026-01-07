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
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const severityColorMap: Record<AlertSeverity, string> = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#fa8c16',
  CRITICAL: '#ff4d4f',
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

  // Fetch alert history
  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alertHistory', filters],
    queryFn: () => alertsApi.getHistory(filters),
    select: (response) => response.data,
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
            {severityIconMap[record.severity]}
            <strong>{text}</strong>
          </Space>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Rule ID: {record.ruleId}
          </div>
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => (
        <Tag color={severityColorMap[severity]} style={{ fontWeight: 'bold' }}>
          {severity}
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
      render: (status: AlertStatus) => (
        <Tag color={statusColorMap[status]}>
          {status.replace('_', ' ')}
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
      render: (text) => (
        <Tooltip title={dayjs(text).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(text).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        const start = dayjs(record.triggeredAt);
        const end = record.resolvedAt ? dayjs(record.resolvedAt) : dayjs();
        const duration = end.diff(start, 'minute');
        
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
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.value && (
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {record.value.toLocaleString()}
            </div>
          )}
          {record.threshold && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Threshold: {record.threshold.toLocaleString()}
            </div>
          )}
        </Space>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 120,
      render: (assignedTo) => (
        assignedTo ? (
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            {assignedTo.username}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>Unassigned</span>
        )
      ),
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
          {record.status === 'OPEN' && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => acknowledgeMutation.mutate(record.id)}
              title="Acknowledge"
              style={{ color: '#faad14' }}
            />
          )}
          {['OPEN', 'ACKNOWLEDGED'].includes(record.status) && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => resolveMutation.mutate(record.id)}
              title="Resolve"
              style={{ color: '#52c41a' }}
            />
          )}
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

  // Mock statistics for the overview cards
  const stats = {
    total: historyData?.totalElements || 0,
    open: historyData?.content?.filter((alert: AlertHistory) => alert.status === 'OPEN').length || 0,
    resolved: historyData?.content?.filter((alert: AlertHistory) => alert.status === 'RESOLVED').length || 0,
    avgResolution: 45, // in minutes
  };

  return (
    <PageContainer
      title="Alert History"
      subTitle="View and manage historical alert data"
      extra={[
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          Export
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
                  <strong>{selectedAlert.ruleName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Tag color={severityColorMap[selectedAlert.severity]}>
                    {selectedAlert.severity}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColorMap[selectedAlert.status]}>
                    {selectedAlert.status.replace('_', ' ')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Message">
                  {selectedAlert.message}
                </Descriptions.Item>
                {selectedAlert.value && (
                  <Descriptions.Item label="Current Value">
                    {selectedAlert.value.toLocaleString()}
                  </Descriptions.Item>
                )}
                {selectedAlert.threshold && (
                  <Descriptions.Item label="Threshold">
                    {selectedAlert.threshold.toLocaleString()}
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
                    {dayjs(selectedAlert.triggeredAt).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                </Timeline.Item>
                
                {selectedAlert.acknowledgedAt && (
                  <Timeline.Item 
                    color="orange"
                    dot={<CheckOutlined />}
                  >
                    <strong>Acknowledged</strong>
                    {selectedAlert.acknowledgedBy && (
                      <span> by {selectedAlert.acknowledgedBy.username}</span>
                    )}
                    <br />
                    <span style={{ color: '#666' }}>
                      {dayjs(selectedAlert.acknowledgedAt).format('YYYY-MM-DD HH:mm:ss')}
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
                      {dayjs(selectedAlert.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
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
            {['OPEN', 'ACKNOWLEDGED'].includes(selectedAlert.status) && (
              <Card title="Actions" size="small">
                <Space>
                  {selectedAlert.status === 'OPEN' && (
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
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}