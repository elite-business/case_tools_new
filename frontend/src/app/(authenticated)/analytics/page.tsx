'use client';

import React, { useState, useEffect } from 'react';
import {
  PageContainer,
  ProCard,
} from '@ant-design/pro-components';
import {
  Row,
  Col,
  Card,
  Statistic,
  Select,
  DatePicker,
  Space,
  Typography,
  Table,
  Tag,
  Button,
  Alert,
  Progress,
  List,
  Avatar,
  Badge,
  Tooltip,
  Spin,
} from 'antd';
import {
  RiseOutlined as TrendingUpOutlined,
  FallOutlined as TrendingDownOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Area, Column, Pie } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  
  // Check user role and permissions
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [timeframe, setTimeframe] = useState('daily');
  const [selectedMetric, setSelectedMetric] = useState('alerts');

  // Fetch analytics data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: () => analyticsApi.getOverview({
      startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
      endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
    }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'trends', dateRange, timeframe],
    queryFn: () => analyticsApi.getTrends({
      startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
      endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
      interval: timeframe,
    }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const { data: performanceData } = useQuery({
    queryKey: ['analytics', 'performance', dateRange],
    queryFn: () => analyticsApi.getPerformanceMetrics({
      startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
      endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
    }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const { data: topAlerts } = useQuery({
    queryKey: ['analytics', 'top-alerts', dateRange],
    queryFn: () => analyticsApi.getTopAlerts({
      startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
      endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
      limit: 10,
    }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const { data: userActivity } = useQuery({
    queryKey: ['analytics', 'user-activity', dateRange],
    queryFn: () => analyticsApi.getUserActivity({
      startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
      endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
    }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const overview = overviewData?.data;
  const trends = trendsData?.data;
  const performance = performanceData?.data;

  // Chart configurations
  const alertTrendConfig = {
    data: trends?.alertTrends || [],
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    color: ['#ff4d4f', '#ffa940', '#fadb14', '#52c41a'],
    legend: { position: 'top' as const },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${(datum.value ?? 0).toLocaleString()} alerts`,
      }),
    },
  };

  const caseResolutionData = (trends?.alertTrends || [])
    .filter((item: any) => item.type === 'Cases')
    .map((item: any) => ({ date: item.date, value: item.value, type: 'Created' }));

  const caseResolutionConfig = {
    data: caseResolutionData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    isStack: true,
    color: ['#1890ff', '#52c41a'],
    legend: { position: 'top' as const },
  };

  const severityDistributionConfig = {
    data: overview?.severityDistribution || [],
    angleField: 'value',
    colorField: 'severity',
    radius: 0.8,
    color: ['#ff4d4f', '#ffa940', '#fadb14', '#52c41a'],
    label: {
      type: 'outer' as const,
      content: ({ severity, percent }: any) => `${severity} ${(percent * 100).toFixed(1)}%`,
    },
    interactions: [{ type: 'element-active' }],
  };

  const systemHealthPercent = Math.round((performance?.overallHealth || 0) * 100);
  const systemHealthColor =
    systemHealthPercent >= 80 ? '#52c41a' : systemHealthPercent >= 60 ? '#ffa940' : '#ff4d4f';

  const alertColumns = [
    {
      title: 'Alert Rule',
      dataIndex: 'ruleName',
      key: 'ruleName',
      ellipsis: true,
    },
    {
      title: 'Triggered',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => b.count - a.count,
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Avg Severity',
      dataIndex: 'avgSeverity',
      key: 'avgSeverity',
      render: (severity: string) => {
        const colors = {
          CRITICAL: 'red',
          HIGH: 'orange', 
          MEDIUM: 'gold',
          LOW: 'green',
        };
        return <Tag color={colors[severity as keyof typeof colors]}>{severity}</Tag>;
      },
    },
    {
      title: 'Resolution Time',
      dataIndex: 'avgResolutionTime',
      key: 'avgResolutionTime',
      render: (time: number) => `${time}h`,
    },
  ];

  return (
    <PageContainer
      title="Analytics & Insights"
      subTitle="Operational performance metrics and system analytics"
      extra={[
        <Space key="controls">
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates)}
            presets={[
              { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
              { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
              { label: 'Last 3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
              { label: 'Last 6 Months', value: [dayjs().subtract(6, 'month'), dayjs()] },
            ]}
          />
          <Select
            value={timeframe}
            onChange={setTimeframe}
            style={{ width: 120 }}
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
            ]}
          />
          <Button icon={<ReloadOutlined />}>Refresh</Button>
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Space>,
      ]}
    >
      {/* Key Metrics Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="Total Alerts"
              value={overview?.totalAlerts || 0}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<AlertOutlined />}
              suffix={
                <span style={{ fontSize: 14 }}>
                  {overview?.alertsGrowth ? (
                    <span style={{ color: overview.alertsGrowth > 0 ? '#cf1322' : '#52c41a' }}>
                      {overview.alertsGrowth > 0 ? <TrendingUpOutlined /> : <TrendingDownOutlined />}
                      {Math.abs(overview.alertsGrowth).toFixed(1)}%
                    </span>
                  ) : null}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="Open Cases"
              value={overview?.openCases || 0}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="Total Cases"
              value={overview?.totalCases || 0}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="Avg Resolution Time"
              value={overview?.avgResolutionTime || 0}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ClockCircleOutlined />}
              suffix="hours"
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Alert Trends" loading={trendsLoading}>
            <Area {...alertTrendConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Alert Severity Distribution">
            <Pie {...severityDistributionConfig} height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Case Resolution Progress">
            <Column {...caseResolutionConfig} height={250} />
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="System Health Score">
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
              <Progress
                type="dashboard"
                percent={systemHealthPercent}
                strokeColor={systemHealthColor}
                format={() => `${systemHealthPercent}%`}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Text type="secondary">Overall system performance</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Performance Metrics">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Alert Processing Speed</Text>
                  <Text>{performance?.alertProcessingSpeed || 0}ms</Text>
                </div>
                <Progress 
                  percent={Math.min(100, Math.max(0, 100 - (performance?.alertProcessingSpeed || 0) / 10))} 
                  showInfo={false}
                  strokeColor="#52c41a"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Database Response</Text>
                  <Text>{performance?.dbResponseTime || 0}ms</Text>
                </div>
                <Progress 
                  percent={Math.min(100, Math.max(0, 100 - (performance?.dbResponseTime || 0) / 50))} 
                  showInfo={false}
                  strokeColor="#1890ff"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>API Response Time</Text>
                  <Text>{performance?.apiResponseTime || 0}ms</Text>
                </div>
                <Progress 
                  percent={Math.min(100, Math.max(0, 100 - (performance?.apiResponseTime || 0) / 20))} 
                  showInfo={false}
                  strokeColor="#ffa940"
                />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="User Activity">
            <List
              dataSource={userActivity?.data?.slice(0, 6) || []}
              renderItem={(activity: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={activity.userName}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text style={{ fontSize: 12 }}>
                          {activity.actionsCount} actions
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Last: {activity.lastActivity && dayjs(activity.lastActivity).isValid()
                            ? dayjs(activity.lastActivity).fromNow()
                            : 'N/A'}
                        </Text>
                      </Space>
                    }
                  />
                  <Badge 
                    status={activity.isOnline ? 'success' : 'default'} 
                    text={activity.isOnline ? 'Online' : 'Offline'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Top Alerts Table */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title="Top Alert Rules (By Frequency)" 
            extra={
              <Space>
                <Button icon={<FilterOutlined />} size="small">Filter</Button>
                <Button icon={<DownloadOutlined />} size="small">Export</Button>
              </Space>
            }
          >
            <Table
              dataSource={topAlerts?.data || []}
              columns={alertColumns}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
