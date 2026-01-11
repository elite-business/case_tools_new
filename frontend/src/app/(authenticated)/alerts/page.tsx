'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  Statistic,
  Empty,
  Spin,
  Typography,
  Alert,
  Tabs,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { 
  useGrafanaAlerts, 
  useAcknowledgeAlert, 
  useResolveAlert, 
  useCreateCaseFromAlert,
  useRealTimeAlerts,
  alertUtils
} from '@/hooks/useGrafanaAlerts';
import { AlertFiltersEnhanced, AlertSeverity } from '@/lib/types';
import AlertCard from '@/components/alerts/AlertCard';
import DateRangePicker, { DateRangePresets, useDateRange } from '@/components/common/DateRangePicker';
import { AlertsExportButton } from '@/components/common/ExportButton';
import ReportChart from '@/components/reports/ReportChart';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { ruleAssignmentsApi } from '@/lib/api/rule-assignments';
import Link from 'next/link';

const { Title, Text } = Typography;
const { Search } = Input;

const AlertsPage: React.FC = () => {
  // State management
  const { timeRange, updateTimeRange } = useDateRange('last_24h');
  const [filters, setFilters] = useState<AlertFiltersEnhanced>({
    timeRange,
    sortBy: 'startsAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const { permissions, user, isAdmin } = useRoleAccess();

  // Fetch user's rule assignments
  const { data: userAssignments } = useQuery({
    queryKey: ['user-rule-assignments'],
    queryFn: () => ruleAssignmentsApi.getUserAssignments(),
    enabled: !isAdmin(), // Only fetch if not admin (admins see all alerts)
  });

  // Queries and mutations
  const { data: alertsResponse, isLoading, error, refetch } = useGrafanaAlerts(filters);
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const createCaseMutation = useCreateCaseFromAlert();

  // Real-time updates
  useRealTimeAlerts((alert) => {
    // Automatically refetch when new alerts arrive
    refetch();
  });

  // Computed values
  const alerts = alertsResponse?.data || [];
  
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    
    // Filter by user's assigned rules if not admin
    if (!isAdmin() && userAssignments && userAssignments.length > 0) {
      const assignedRuleUids = userAssignments.map((ra: any) => ra.grafanaRuleUid);
      filtered = alerts.filter((alert: any) => 
        assignedRuleUids.includes(alert.ruleUid) || assignedRuleUids.includes(alert.ruleId)
      );
    }
    
    return filtered.filter((alert:any) => {
      const matchesSearch = !searchTerm || 
        alert.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.summary.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = selectedSeverity.length === 0 || selectedSeverity.includes(alert.severity);
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(alert.status);
      
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'open' && alert.status === 'OPEN') ||
        (activeTab === 'acknowledged' && alert.status === 'ACKNOWLEDGED') ||
        (activeTab === 'resolved' && alert.status === 'RESOLVED') ||
        (activeTab === 'unprocessed' && !alert.processed);

      return matchesSearch && matchesSeverity && matchesStatus && matchesTab;
    });
  }, [alerts, searchTerm, selectedSeverity, selectedStatus, activeTab, userAssignments, isAdmin]);

  // Statistics
  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((a:any) => a.status === 'OPEN').length;
    const acknowledged = alerts.filter((a:any) => a.status === 'ACKNOWLEDGED').length;
    const resolved = alerts.filter((a:any) => a.status === 'RESOLVED').length;
    const critical = alerts.filter((a:any) => a.severity === 'CRITICAL').length;
    const unprocessed = alerts.filter((a:any) => !a.processed).length;

    return { total, open, acknowledged, resolved, critical, unprocessed };
  }, [alerts]);

  // Chart data for trends
  const chartData = useMemo(() => {
    const alertsByHour = alerts.reduce((acc:any, alert:any) => {
      const hour = new Date(alert.startsAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      type: 'bar' as const,
      title: 'Alerts by Hour',
      data: Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        alerts: alertsByHour[hour] || 0,
      })),
      config: {
        xAxisKey: 'hour',
        dataKey: 'alerts',
        bars: [{ dataKey: 'alerts', fill: '#1890ff' }],
      },
    };
  }, [alerts]);

  // Event handlers
  const handleFiltersChange = (newFilters: Partial<AlertFiltersEnhanced>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleTimeRangeChange = (newTimeRange: any) => {
    updateTimeRange(newTimeRange);
    handleFiltersChange({ timeRange: newTimeRange });
  };

  const handleAcknowledge = (id: number) => {
    acknowledgeMutation.mutate({ id });
  };

  const handleResolve = (id: number) => {
    resolveMutation.mutate({ id });
  };

  const handleCreateCase = (id: number) => {
    createCaseMutation.mutate({ id });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSeverity([]);
    setSelectedStatus([]);
    setActiveTab('all');
    handleFiltersChange({
      severity: undefined,
      status: undefined,
      search: undefined,
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Alerts"
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={2} style={{ margin: 0 }}>
            <BellOutlined className="mr-2" />
            Grafana Alerts
          </Title>
          <Space>
            <Link href="/admin/rule-assignments">
              <Button icon={<PlusOutlined />}>
                Manage Rules
              </Button>
            </Link>
            {/* <Link href="/alerts/builder">
              <Button type="primary" icon={<PlusOutlined />}>
                Create Rule
              </Button>
            </Link> */}
          </Space>
        </div>

        {/* Alert for filtered view */}
        {!isAdmin() && userAssignments && userAssignments.length > 0 && (
          <Alert
            message="Filtered View"
            description={`You are viewing alerts from ${userAssignments.length} assigned rules. Contact your administrator to adjust rule assignments.`}
            type="info"
            showIcon
            closable
            className="mb-4"
          />
        )}

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Alerts"
                value={stats.total}
                prefix={<BellOutlined style={{ color: '#1890ff' }} />}
                loading={isLoading}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Open"
                value={stats.open}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                loading={isLoading}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Critical"
                value={stats.critical}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                loading={isLoading}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Unprocessed"
                value={stats.unprocessed}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                loading={isLoading}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card className="mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                mode="multiple"
                placeholder="Severity"
                value={selectedSeverity}
                onChange={setSelectedSeverity}
                className="w-full"
                options={[
                  { label: 'Critical', value: 'CRITICAL' },
                  { label: 'High', value: 'HIGH' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'Low', value: 'LOW' },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                mode="multiple"
                placeholder="Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                className="w-full"
                options={[
                  { label: 'Open', value: 'OPEN' },
                  { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
                  { label: 'Resolved', value: 'RESOLVED' },
                  { label: 'Closed', value: 'CLOSED' },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <DateRangePicker
                value={timeRange}
                onChange={handleTimeRangeChange}
                {...DateRangePresets.alerts}
                size="middle"
              />
            </Col>
          </Row>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Text type="secondary">
                Showing {filteredAlerts.length} of {alerts.length} alerts
              </Text>
              {(selectedSeverity.length > 0 || selectedStatus.length > 0 || searchTerm) && (
                <Button size="small" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
            <Space>
              <AlertsExportButton data={filteredAlerts} />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </Card>

        {/* Trends Chart */}
        <Card className="mb-6" title="Alert Trends">
          <ReportChart chartData={chartData} loading={isLoading} height={200} />
        </Card>
      </div>

      {/* Alert Tabs */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'all',
              label: 'All Alerts',
              children: null,
            },
            {
              key: 'open',
              label: (
                <Badge count={stats.open} size="small" color="red">
                  <span>Open</span>
                </Badge>
              ),
              children: null,
            },
            {
              key: 'acknowledged',
              label: (
                <Badge count={stats.acknowledged} size="small" color="orange">
                  <span>Acknowledged</span>
                </Badge>
              ),
              children: null,
            },
            {
              key: 'resolved',
              label: (
                <Badge count={stats.resolved} size="small" color="green">
                  <span>Resolved</span>
                </Badge>
              ),
              children: null,
            },
            {
              key: 'unprocessed',
              label: (
                <Badge count={stats.unprocessed} size="small" color="gray">
                  <span>Unprocessed</span>
                </Badge>
              ),
              children: null,
            },
          ]}
        />

        {/* Alerts List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" tip="Loading alerts..." />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Empty
            description="No alerts found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => refetch()}>
              Refresh
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]} className="mt-4">
            {filteredAlerts.map((alert:any) => (
              <Col xs={24} lg={12} xl={8} key={alert.id}>
                <AlertCard
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onCreateCase={handleCreateCase}
                  compact={false}
                />
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default AlertsPage;