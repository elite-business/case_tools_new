'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  PageContainer, 
  ProTable, 
  ProColumns,
  ActionType
} from '@ant-design/pro-components';
import { 
  Button, 
  Space, 
  Tag, 
  message,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  DatePicker
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  TrophyOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons';
import { casesApi, handleApiError } from '@/lib/api-client';
import { Case, UserSummaryDto, CaseStatus, CaseSeverity } from '@/lib/types';
import { getPriorityLabel, getPriorityColor, getSeverityColor, formatResolutionTime, getCategoryLabel } from '@/lib/utils/case-utils';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ResolvedCasesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Get resolved cases statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['cases', 'resolved-stats', dateRange],
    queryFn: async () => {
      const queryParams: any = {
        status: 'RESOLVED,CLOSED',
        page: 0,
        size: 100, // Get more for statistics
      };

      if (dateRange) {
        queryParams.resolvedFrom = dateRange[0].format('YYYY-MM-DD');
        queryParams.resolvedTo = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await casesApi.getAll(queryParams);
      const cases = response.data.content || [];
      
      // Calculate statistics
      const totalResolved = cases.length;
      const avgResolutionTime = cases.reduce((sum, c) => {
        return sum + (c.resolutionTimeMinutes || 0);
      }, 0) / (totalResolved || 1);

      const withinSla = cases.filter(c => !c.slaBreached).length;
      const slaCompliance = totalResolved > 0 ? (withinSla / totalResolved) * 100 : 0;

      const bySeverity = {
        CRITICAL: cases.filter(c => c.severity === 'CRITICAL').length,
        HIGH: cases.filter(c => c.severity === 'HIGH').length,
        MEDIUM: cases.filter(c => c.severity === 'MEDIUM').length,
        LOW: cases.filter(c => c.severity === 'LOW').length,
      };

      return {
        totalResolved,
        avgResolutionTime,
        slaCompliance,
        bySeverity,
        withinSla,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleClose = async (caseItem: Case) => {
    try {
      await casesApi.close(caseItem.id, 'Closed after resolution', '');
      message.success('Case closed successfully');
      actionRef.current?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleReopen = async (caseItem: Case) => {
    try {
      await casesApi.reopen(caseItem.id, 'Reopened for further investigation');
      message.success('Case reopened successfully');
      actionRef.current?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const columns: ProColumns<Case>[] = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      width: 140,
      fixed: 'left',
      render: (text: string, record: Case) => (
        <Space direction="vertical" size={0}>
          <Button 
            type="link" 
            onClick={() => router.push(`/cases/${record.id}`)}
            style={{ padding: 0 }}
          >
            {text}
          </Button>
          {record.grafanaAlertId && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Alert: {record.grafanaAlertId.substring(0, 8)}...
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      filters: [
        { text: 'Critical', value: 'CRITICAL' },
        { text: 'High', value: 'HIGH' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'Low', value: 'LOW' },
      ],
      render: (severity: CaseSeverity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      title: 'Resolution Time',
      dataIndex: 'resolutionTimeMinutes',
      key: 'resolutionTime',
      width: 140,
      sorter: true,
      render: (minutes: number, record: Case) => {
        if (!minutes && record.resolvedAt && record.createdAt) {
          minutes = dayjs(record.resolvedAt).diff(dayjs(record.createdAt), 'minutes');
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{formatResolutionTime(minutes)}</Text>
            {record.slaBreached && (
              <Tag color="error" style={{ fontSize: 10 }}>
                SLA Breached
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Resolved By',
      dataIndex: 'assignedTo',
      key: 'resolvedBy',
      width: 150,
      render: (assignedTo: UserSummaryDto) => (
        assignedTo ? (
          <Space size={4}>
            <UserOutlined style={{ fontSize: 12 }} />
            <span>{assignedTo.name || assignedTo.fullName || assignedTo.username}</span>
          </Space>
        ) : (
          <Text type="secondary">System</Text>
        )
      ),
    },
    {
      title: 'Resolved Date',
      dataIndex: 'resolvedAt',
      key: 'resolvedAt',
      width: 150,
      sorter: true,
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: CaseStatus) => (
        <Tag 
          color={status === 'RESOLVED' ? 'success' : 'default'}
          icon={status === 'RESOLVED' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Root Cause',
      dataIndex: 'rootCause',
      key: 'rootCause',
      ellipsis: true,
      width: 200,
      render: (text: string) => text ? (
        <Tooltip title={text}>
          <Text ellipsis>{text}</Text>
        </Tooltip>
      ) : (
        <Text type="secondary">Not specified</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: Case) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => router.push(`/cases/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'RESOLVED' && (
            <Tooltip title="Close Case">
              <Button 
                size="small" 
                icon={<CloseCircleOutlined />}
                onClick={() => handleClose(record)}
              />
            </Tooltip>
          )}
          {record.status === 'CLOSED' && (
            <Tooltip title="Reopen Case">
              <Button 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={() => handleReopen(record)}
                danger
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: 'Resolved Cases',
        subTitle: 'Successfully resolved and closed cases',
        onBack: () => router.push('/cases'),
        extra: [
          <RangePicker
            key="dateRange"
            onChange={(dates) => {
              if (dates) {
                setDateRange([dates[0]!, dates[1]!]);
              } else {
                setDateRange(null);
              }
              actionRef.current?.reload();
            }}
          />,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            Refresh
          </Button>,
        ],
      }}
    >
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Resolved"
              value={stats?.totalResolved || 0}
              prefix={<CheckCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Resolution Time"
              value={formatResolutionTime(stats?.avgResolutionTime || 0)}
              prefix={<ClockCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SLA Compliance"
              value={stats?.slaCompliance || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              loading={statsLoading}
              valueStyle={{ color: stats?.slaCompliance >= 90 ? '#52c41a' : '#ffa940' }}
            />
            <Progress 
              percent={stats?.slaCompliance || 0} 
              strokeColor={stats?.slaCompliance >= 90 ? '#52c41a' : '#ffa940'}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">By Severity</Text>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tag color="#ff4d4f">Critical</Tag>
                  <Text strong>{stats?.bySeverity?.CRITICAL || 0}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tag color="#ffa940">High</Tag>
                  <Text strong>{stats?.bySeverity?.HIGH || 0}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tag color="#fadb14">Medium</Tag>
                  <Text strong>{stats?.bySeverity?.MEDIUM || 0}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tag color="#52c41a">Low</Tag>
                  <Text strong>{stats?.bySeverity?.LOW || 0}</Text>
                </div>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <ProTable<Case>
        actionRef={actionRef}
        columns={columns}
        request={async (params = {}, sort, filter) => {
          try {
            const queryParams: any = {
              page: params.current ? params.current - 1 : 0,
              size: params.pageSize || 20,
              status: 'RESOLVED,CLOSED', // Only resolved and closed cases
            };

            // Handle date range filter
            if (dateRange) {
              queryParams.resolvedFrom = dateRange[0].format('YYYY-MM-DD');
              queryParams.resolvedTo = dateRange[1].format('YYYY-MM-DD');
            }

            // Handle search
            if (params.keyword) {
              queryParams.search = params.keyword;
            }

            // Handle sorting
            if (sort && Object.keys(sort).length > 0) {
              const sortKey = Object.keys(sort)[0];
              const sortOrder = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
              queryParams.sort = `${sortKey},${sortOrder}`;
            } else {
              // Default sort by resolved date (most recent first)
              queryParams.sort = 'resolvedAt,desc';
            }

            // Handle filters
            if (filter?.severity) {
              queryParams.severity = filter.severity.join(',');
            }

            const response = await casesApi.getAll(queryParams);
            
            return {
              data: response.data.content || [],
              success: true,
              total: response.data.totalElements || 0,
            };
          } catch (error) {
            message.error(handleApiError(error));
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        rowKey="id"
        search={{
          labelWidth: 120,
          placeholder: 'Search by case number, title, or root cause...',
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} resolved cases`,
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1600 }}
        options={{
          reload: true,
          density: true,
          setting: true,
          fullScreen: true,
        }}
        dateFormatter="string"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return selectedRowKeys && selectedRowKeys.length > 0 ? (
            <Space>
              <span>Selected {selectedRowKeys.length} cases</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Clear Selection
              </Button>
            </Space>
          ) : false;
        }}
        tableAlertOptionRender={() => {
          return (
            <Space>
              <Button size="small" icon={<FileTextOutlined />}>
                Export Report
              </Button>
              <Button size="small" icon={<SolutionOutlined />}>
                View Analytics
              </Button>
            </Space>
          );
        }}
      />
    </PageContainer>
  );
}