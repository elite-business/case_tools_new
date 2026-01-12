'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Progress,
  Space,
  Button,
  Typography,
  Alert,
  Timeline,
  Avatar,
  List,
  Segmented,
  DatePicker,
  Spin,
  message,
  Badge,
  Tooltip,
  Empty,
  Divider,
} from 'antd';
import {
  UserOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  EyeOutlined,
  BarChartOutlined,
  BellOutlined,
  TeamOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import type { AreaConfig, PieConfig } from '@ant-design/charts';

// Dynamic import for charts to avoid SSR issues
const Area = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Area || mod.default?.Area),
  { 
    ssr: false,
    loading: () => <Spin />
  }
);

const Pie = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Pie || mod.default?.Pie),
  { 
    ssr: false,
    loading: () => <Spin />
  }
);
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { casesApi, alertsApi, analyticsApi, systemApi, handleApiError } from '@/lib/api-client';
import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { useAuthStore } from '@/store/auth-store';
import { isManagerOrHigher } from '@/lib/rbac';
import MetricsCard from '@/components/ui-system/MetricsCard';
import StatusIndicator from '@/components/ui-system/StatusIndicator';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notifications, unreadCount, isConnected } = useWebSocketContext();
  const { user } = useAuthStore();
  
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [timeframe, setTimeframe] = useState('daily');

  // Check user role and permissions
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';
  const canViewAllData = isManagerOrHigher(userRole);

  // API Queries
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: () => analyticsApi.getOverview({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    }),
    enabled: canViewAllData,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'trends', dateRange, timeframe],
    queryFn: () => analyticsApi.getTrends({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      interval: timeframe,
    }),
    enabled: canViewAllData,
  });

  const { data: casesStats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesApi.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: canViewAllData,
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => alertsApi.getHistory({ 
      page: 0, 
      size: 10, 
      sort: 'triggeredAt,desc' 
    }),
    refetchInterval: 15000, // Refresh every 15 seconds
    enabled: canViewAllData,
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 60000, // Refresh every minute
    enabled: canViewAllData,
  });

  const { data: myCasesResponse, isLoading: myCasesLoading } = useQuery({
    queryKey: ['cases', 'my-cases'],
    queryFn: () => casesApi.getMyCases(),
    refetchInterval: 30000,
    enabled: !canViewAllData,
  });

  // Auto-refresh data when WebSocket notifications arrive
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.type === 'alert' || latest.type === 'case_update') {
        if (canViewAllData) {
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          queryClient.invalidateQueries({ queryKey: ['cases', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['alerts', 'recent'] });
        }
        queryClient.invalidateQueries({ queryKey: ['cases', 'my-cases'] });
      }
    }
  }, [notifications, queryClient, canViewAllData]);

  const handleRefresh = () => {
    refetchOverview();
    queryClient.invalidateQueries();
    message.success('Data refreshed');
  };

  // Chart configurations with real data
  const areaConfig = {
    data: trendsData?.data?.alertTrends || [],
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    color: ['#1890ff', '#52c41a'],
    animation: {
      appear: { animation: 'path-in', duration: 1000 },
    },
    yAxis: { title: { text: 'Count' } },
    legend: { position: 'top' },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value.toLocaleString()}`,
      }),
    },
  };

  const pieConfig = {
    data: overviewData?.data?.severityDistribution || [],
    angleField: 'value',
    colorField: 'severity',
    radius: 0.9,
    color: ['#ff4d4f', '#ffa940', '#fadb14', '#52c41a'],
    label: {
      type: 'inner',
      offset: '-30%',
      content: ({ percent }: any) => `${(percent * 100).toFixed(0)}%`,
      style: { fontSize: 14, textAlign: 'center' },
    },
    interactions: [{ type: 'element-active' }],
    legend: { position: 'bottom' },
  };

  // Table columns for recent alerts
  const alertColumns = [
    {
      title: 'Alert ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => router.push(`/alerts/history?alertId=${id}`)}
        >
          #{id}
        </Button>
      ),
    },
    {
      title: 'Rule',
      dataIndex: 'ruleName',
      key: 'ruleName',
      ellipsis: true,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity: string) => (
        <StatusIndicator 
          type="severity" 
          value={severity} 
          showText 
          animated={severity === 'CRITICAL'}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <StatusIndicator 
          type="status" 
          value={status} 
          showText 
          showIcon 
          animated={status === 'IN_PROGRESS'}
        />
      ),
    },
    {
      title: 'Time',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      width: 80,
      render: (time: string) => dayjs(time).fromNow(),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/alerts/history?alertId=${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // Process recent activities from WebSocket notifications
  const recentActivities = notifications.slice(0, 8).map((notif, index) => ({
    title: notif.title,
    description: notif.message,
    time: dayjs(notif.timestamp).format('HH:mm'),
    icon: notif.type === 'alert' ? <AlertOutlined /> :
          notif.type === 'case_update' ? <FileProtectOutlined /> :
          notif.type === 'assignment' ? <UserOutlined /> : <CheckCircleOutlined />,
    color: notif.severity?.toLowerCase() === 'critical' ? 'red' :
           notif.severity?.toLowerCase() === 'high' ? 'orange' :
           notif.severity?.toLowerCase() === 'medium' ? 'gold' : 'blue',
  }));

  // Statistics calculations
  const stats = {
    totalAlerts: overviewData?.data?.totalAlerts || 0,
    activeRules: overviewData?.data?.activeRules || 0,
    systemUsers: overviewData?.data?.systemUsers || 0,
    alertsGrowth: overviewData?.data?.alertsGrowth || 0,
    rulesGrowth: overviewData?.data?.rulesGrowth || 0,
    usersGrowth: overviewData?.data?.usersGrowth || 0,
  };

  const myCases = myCasesResponse?.data || [];
  const myCaseStats = {
    open: myCases.filter((item: any) => ['OPEN', 'ASSIGNED'].includes(item.status)).length,
    inProgress: myCases.filter((item: any) => item.status === 'IN_PROGRESS').length,
    resolved: myCases.filter((item: any) => ['RESOLVED', 'CLOSED'].includes(item.status)).length,
    slaBreached: myCases.filter((item: any) => item.slaBreached).length,
  };

  return (
    <div style={{ minHeight: '100%' }}>
        {/* Connection Status Alert */}
        {!isConnected && (
          <Alert
            message="WebSocket Connection Lost"
            description="Real-time updates are unavailable. Data may not be current."
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space direction="vertical" size={0}>
                <Title level={2} style={{ margin: 0 }}>
                  {canViewAllData ? 'System Dashboard' : 'My Dashboard'}
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge count={unreadCount} size="small" />
                    </span>
                  )}
                </Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  {canViewAllData 
                    ? 'System-wide monitoring and analytics for case management'
                    : 'Your personal overview of assigned cases and workload'
                  }
                </Paragraph>
                {!canViewAllData && (
                  <Alert
                    message={`Personal View (${userRole})`}
                    description="You're viewing data specific to your role. Contact your manager for system-wide access."
                    type="info"
                    showIcon
                    closable
                    style={{ marginTop: 8, maxWidth: 500 }}
                  />
                )}
              </Space>
            </Col>
            <Col>
              {canViewAllData ? (
                <Space>
                  <RangePicker
                    value={dateRange as any}
                    onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
                    presets={[
                      { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
                      { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                      { label: 'Last 3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
                    ]}
                  />
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleRefresh}
                    loading={overviewLoading}
                  >
                    Refresh
                  </Button>
                  <Button icon={<ExportOutlined />}>Export</Button>
                  {/* <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => router.push('/alerts/builder')}
                  >
                    Create Rule
                  </Button> */}
                </Space>
              ) : (
                <Space>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['cases', 'my-cases'] })}
                    loading={myCasesLoading}
                  >
                    Refresh
                  </Button>
                  <Button type="primary" onClick={() => router.push('/cases')}>
                    View My Cases
                  </Button>
                </Space>
              )}
            </Col>
          </Row>
        </div>

        {/* Statistics Cards */}
        {canViewAllData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <MetricsCard
                  title="Total Alerts"
                  value={stats.totalAlerts}
                  icon={<AlertOutlined />}
                  color="#ff4d4f"
                  loading={overviewLoading}
                  trend={stats.alertsGrowth !== 0 ? {
                    value: stats.alertsGrowth,
                    isPositive: stats.alertsGrowth < 0, // Fewer alerts is positive
                    label: 'vs last period'
                  } : undefined}
                  onClick={() => router.push('/alerts/history')}
                  tooltip="Total number of triggered alerts across all rules"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricsCard
                  title="Active Rules"
                  value={stats.activeRules}
                  icon={<FileProtectOutlined />}
                  color="#1677ff"
                  loading={overviewLoading}
                  trend={stats.rulesGrowth !== 0 ? {
                    value: stats.rulesGrowth,
                    isPositive: stats.rulesGrowth > 0,
                    label: 'vs last period'
                  } : undefined}
                  onClick={() => router.push('/alerts/rules')}
                  tooltip="Number of active alert rules monitoring the system"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricsCard
                  title="Open Cases"
                  value={casesStats?.data?.open || 0}
                  icon={<ClockCircleOutlined />}
                  color="#faad14"
                  loading={overviewLoading}
                  onClick={() => router.push('/cases')}
                  tooltip="Cases that are currently open or assigned"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricsCard
                  title="Active Users"
                  value={stats.systemUsers}
                  icon={<TeamOutlined />}
                  color="#722ed1"
                  loading={overviewLoading}
                  trend={stats.usersGrowth !== 0 ? {
                    value: stats.usersGrowth,
                    isPositive: stats.usersGrowth > 0,
                    label: 'vs last period'
                  } : undefined}
                  onClick={() => router.push('/admin/users')}
                  tooltip="Number of active users in the system"
                />
              </Col>
            </Row>
          </motion.div>
        ) : (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="Open Cases"
                value={myCaseStats.open}
                icon={<ClockCircleOutlined />}
                color="#1677ff"
                loading={myCasesLoading}
                onClick={() => router.push('/cases?status=OPEN,ASSIGNED')}
                tooltip="Cases currently assigned to you"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="In Progress"
                value={myCaseStats.inProgress}
                icon={<CheckCircleOutlined />}
                color="#722ed1"
                loading={myCasesLoading}
                onClick={() => router.push('/cases?status=IN_PROGRESS')}
                tooltip="Cases you are actively working on"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="Resolved"
                value={myCaseStats.resolved}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
                loading={myCasesLoading}
                onClick={() => router.push('/cases?status=RESOLVED,CLOSED')}
                tooltip="Cases you have completed"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="SLA Breached"
                value={myCaseStats.slaBreached}
                icon={<WarningOutlined />}
                color="#ff4d4f"
                loading={myCasesLoading}
                onClick={() => router.push('/cases?slaBreached=true')}
                tooltip="Cases that breached SLA"
              />
            </Col>
          </Row>
        )}

        {!canViewAllData && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={16}>
              <Card
                title="My Recent Cases"
                extra={
                  <Button type="link" size="small" onClick={() => router.push('/cases')}>
                    View All
                  </Button>
                }
                loading={myCasesLoading}
              >
                {myCases.length > 0 ? (
                  <List
                    dataSource={myCases.slice(0, 6)}
                    renderItem={(item: any) => (
                      <List.Item
                        key={item.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/cases/${item.id}`)}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{item.caseNumber}</Text>
                              <Tag color={item.slaBreached ? 'red' : 'blue'}>
                                {item.status}
                              </Tag>
                            </Space>
                          }
                          description={item.title}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.createdAt).fromNow()}
                        </Text>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No assigned cases yet" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="My Focus" loading={myCasesLoading}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">SLA breaches</Text>
                    <Title level={4} style={{ margin: 0 }}>
                      {myCaseStats.slaBreached}
                    </Title>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Text type="secondary">Open workload</Text>
                    <Title level={4} style={{ margin: 0 }}>
                      {myCaseStats.open + myCaseStats.inProgress}
                    </Title>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* Charts Row */}
        {canViewAllData && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={16}>
              <Card 
                title="Alert Trends" 
                extra={
                  <Segmented 
                    options={[
                      { label: 'Daily', value: 'daily' },
                      { label: 'Weekly', value: 'weekly' },
                      { label: 'Monthly', value: 'monthly' }
                    ]} 
                    value={timeframe}
                    onChange={setTimeframe}
                  />
                }
                loading={trendsLoading}
              >
                {trendsData?.data?.alertTrends?.length > 0 ? (
                  <Area {...areaConfig} height={300} />
                ) : (
                  <div style={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    No trend data available for selected period
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Alert Severity Distribution" loading={overviewLoading}>
                {overviewData?.data?.severityDistribution?.length > 0 ? (
                  <Pie {...pieConfig} height={300} />
                ) : (
                  <div style={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    No alerts to display
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {canViewAllData && (
          <>
            {/* Table and Activities */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card 
                  title="Recent Alerts" 
                  extra={
                    <Space>
                      <Button 
                        type="text" 
                        size="small"
                        onClick={() => router.push('/alerts/history')}
                      >
                        View All
                      </Button>
                      {/* <Button 
                        type="primary" 
                        size="small"
                        onClick={() => router.push('/alerts/builder')}
                      >
                        Create Rule
                      </Button> */}
                    </Space>
                  }
                >
                  <Table 
                    columns={alertColumns} 
                    dataSource={recentAlerts?.data?.content || []} 
                    pagination={false}
                    size="middle"
                    loading={!recentAlerts}
                    locale={{ 
                      emptyText: 'No recent alerts' 
                    }}
                    rowKey="id"
                  />
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card 
                  title="Live Activity Feed"
                  extra={
                    <Badge 
                      status={isConnected ? "processing" : "error"} 
                      text={isConnected ? "Live" : "Offline"} 
                    />
                  }
                >
                  {recentActivities.length > 0 ? (
                    <Timeline mode="left">
                      {recentActivities.map((activity, index) => (
                        <Timeline.Item key={index} color={activity.color} dot={activity.icon}>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 13 }}>{activity.title}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {activity.description}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {activity.time}
                            </Text>
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      color: '#999' 
                    }}>
                      <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                      <br />
                      No recent activity
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* System Status */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card 
                  title="System Health Status"
                  extra={
                    <Space>
                      <Badge 
                        status={systemHealth?.data?.overallStatus === 'HEALTHY' ? 'success' : 
                                systemHealth?.data?.overallStatus === 'DEGRADED' ? 'warning' : 'error'} 
                        text={systemHealth?.data?.overallStatus || 'Unknown'} 
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Last check: {systemHealth?.data?.lastCheck ? 
                          dayjs(systemHealth.data.lastCheck).fromNow() : 'Never'}
                      </Text>
                    </Space>
                  }
                  loading={!systemHealth}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                          <Space align="center">
                            <BarChartOutlined style={{ color: '#1677ff' }} />
                            <Text type="secondary" strong>Database</Text>
                          </Space>
                          <StatusIndicator
                            type="health"
                            value={systemHealth?.data?.database?.status || 'UNKNOWN'}
                            showText
                            showIcon
                            size="large"
                            animated
                          />
                          <Progress 
                            percent={systemHealth?.data?.database?.responseTime ? 
                              Math.max(0, 100 - (systemHealth.data.database.responseTime / 10)) : 0} 
                            status={systemHealth?.data?.database?.status === 'UP' ? 'success' : 'exception'} 
                            showInfo={false}
                            size="small"
                            strokeWidth={6}
                          />
                          <Text style={{ fontSize: 12 }}>
                            {systemHealth?.data?.database?.responseTime && 
                              `Response: ${systemHealth.data.database.responseTime}ms`}
                          </Text>
                        </Space>
                      </motion.div>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                          <Space align="center">
                            <DashboardOutlined style={{ color: '#722ed1' }} />
                            <Text type="secondary" strong>Grafana</Text>
                          </Space>
                          <StatusIndicator
                            type="health"
                            value={systemHealth?.data?.grafana?.status || 'DOWN'}
                            showText
                            showIcon
                            size="large"
                            animated
                          />
                          <Progress 
                            percent={systemHealth?.data?.grafana?.responseTime ? 
                              Math.max(0, 100 - (systemHealth.data.grafana.responseTime / 20)) : 0} 
                            status={systemHealth?.data?.grafana?.status === 'UP' ? 'success' : 'exception'} 
                            showInfo={false}
                            size="small"
                            strokeWidth={6}
                          />
                          <Text style={{ fontSize: 12 }}>
                            {systemHealth?.data?.grafana?.responseTime && 
                              `Response: ${systemHealth.data.grafana.responseTime}ms`}
                          </Text>
                        </Space>
                      </motion.div>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                          <Space align="center">
                            <BellOutlined style={{ color: '#52c41a' }} />
                            <Text type="secondary" strong>WebSocket</Text>
                          </Space>
                          <StatusIndicator
                            type="health"
                            value={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                            showText
                            showIcon
                            size="large"
                            animated={!isConnected}
                          />
                          <Progress 
                            percent={isConnected ? 100 : 0} 
                            status={isConnected ? 'success' : 'exception'} 
                            showInfo={false}
                            size="small"
                            strokeWidth={6}
                          />
                          <Text style={{ fontSize: 12 }}>
                            Real-time updates
                          </Text>
                        </Space>
                      </motion.div>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                          <Space align="center">
                            <AlertOutlined style={{ color: '#ffa940' }} />
                            <Text type="secondary" strong>Notifications</Text>
                          </Space>
                          <StatusIndicator
                            type="health"
                            value={systemHealth?.data?.notifications?.status || 'UNKNOWN'}
                            showText
                            showIcon
                            size="large"
                            animated
                          />
                          <Progress 
                            percent={systemHealth?.data?.notifications?.status === 'UP' ? 100 : 0} 
                            status={systemHealth?.data?.notifications?.status === 'UP' ? 'success' : 'exception'} 
                            showInfo={false}
                            size="small"
                            strokeWidth={6}
                          />
                          <Text style={{ fontSize: 12 }}>
                            Alert delivery
                          </Text>
                        </Space>
                      </motion.div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </>
        )}
    </div>
  );
}
