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
  Badge,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  Empty
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import { casesApi, handleApiError } from '@/lib/api-client';
import { Case, CaseStatus } from '@/lib/types';
import { getPriorityLabel, getPriorityColor, getSeverityColor, getStatusColor, getSlaStatus, getCategoryLabel } from '@/lib/utils/case-utils';
import { useAuthStore } from '@/store/auth-store';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

export default function MyCasesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const { user } = useAuthStore();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Get my cases statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['cases', 'my-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const response = await casesApi.getAll({ 
        assignedToId: user.id,
        page: 0,
        size: 100 // Get more for statistics
      });
      
      const cases = response.data.content || [];
      const activeCases = cases.filter((c: Case) => 
        ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'PENDING_VENDOR'].includes(c.status)
      );
      
      const resolvedThisWeek = cases.filter((c: Case) => 
        c.resolvedAt && dayjs(c.resolvedAt).isAfter(dayjs().subtract(7, 'days'))
      ).length;
      
      const overdueCount = activeCases.filter((c: Case) => {
        const sla = getSlaStatus(c.slaDeadline, c.slaBreached);
        return sla.status === 'breached';
      }).length;
      
      const avgResolutionTime = cases
        .filter((c: Case) => c.resolutionTimeMinutes)
        .reduce((sum:any, c:any) => sum + (c.resolutionTimeMinutes || 0), 0) / 
        (cases.filter((c: Case) => c.resolutionTimeMinutes).length || 1);
      
      return {
        total: cases.length,
        active: activeCases.length,
        resolved: cases.filter((c: Case) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
        overdue: overdueCount,
        resolvedThisWeek,
        avgResolutionTime: Math.round(avgResolutionTime),
        inProgress: activeCases.filter((c: Case) => c.status === 'IN_PROGRESS').length,
        pending: activeCases.filter((c: Case) => 
          c.status === 'PENDING_CUSTOMER' || c.status === 'PENDING_VENDOR'
        ).length,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const handleUpdateStatus = async (caseItem: Case, newStatus: CaseStatus) => {
    try {
      await casesApi.updateStatus(caseItem.id, newStatus);
      message.success('Status updated successfully');
      actionRef.current?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleResolve = async (caseItem: Case) => {
    try {
      await casesApi.resolve(caseItem.id, 'Resolved by user');
      message.success('Case resolved successfully');
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
      render: (_: any, record: Case) => (
        <Space direction="vertical" size={0}>
          <Button 
            type="link" 
            onClick={() => router.push(`/cases/${record.id}`)}
            style={{ padding: 0 }}
          >
            {record.caseNumber}
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
      render: (text: any) => (
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
      render: (severity: any) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: true,
      render: (priority: any) => {
        const label = getPriorityLabel(priority);
        return (
          <Tag color={getPriorityColor(priority)}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: [
        { text: 'Open', value: 'OPEN' },
        { text: 'Assigned', value: 'ASSIGNED' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Pending Customer', value: 'PENDING_CUSTOMER' },
        { text: 'Pending Vendor', value: 'PENDING_VENDOR' },
        { text: 'Resolved', value: 'RESOLVED' },
        { text: 'Closed', value: 'CLOSED' },
      ],
      render: (status: any) => (
        <Tag color={getStatusColor(status)}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: any) => getCategoryLabel(category),
    },
    {
      title: 'SLA Status',
      dataIndex: 'slaDeadline',
      key: 'sla',
      width: 140,
      render: (_: any, record: Case) => {
        const sla = getSlaStatus(record.slaDeadline, record.slaBreached);
        return (
          <Space direction="vertical" size={0}>
            <Tag 
              color={sla.color} 
              icon={sla.status === 'breached' ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
            >
              {sla.label}
            </Tag>
            {record.slaDeadline && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(record.slaDeadline).fromNow()}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Age',
      dataIndex: 'createdAt',
      key: 'age',
      width: 100,
      sorter: true,
      render: (date: any) => {
        const hours = dayjs().diff(dayjs(date), 'hours');
        const days = Math.floor(hours / 24);
        const color = days > 7 ? 'red' : days > 3 ? 'orange' : 'green';
        return (
          <Tag color={color}>
            {days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`}
          </Tag>
        );
      },
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{dayjs(date).format('MMM DD, HH:mm')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(date).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record: Case) => {
        const canResolve = record.status === 'IN_PROGRESS';
        const canStart = record.status === 'ASSIGNED' || record.status === 'OPEN';
        
        return (
          <Space>
            <Tooltip title="View Details">
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => router.push(`/cases/${record.id}`)}
              />
            </Tooltip>
            {canStart && (
              <Tooltip title="Start Progress">
                <Button 
                  size="small" 
                  type="primary"
                  ghost
                  onClick={() => handleUpdateStatus(record, 'IN_PROGRESS')}
                >
                  Start
                </Button>
              </Tooltip>
            )}
            {canResolve && (
              <Tooltip title="Resolve Case">
                <Button 
                  size="small" 
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleResolve(record)}
                >
                  Resolve
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  if (!user) {
    return (
      <PageContainer>
        <Card>
          <Empty description="Please log in to view your cases" />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: 'My Cases',
        subTitle: `Cases assigned to ${user?.username || `${user.firstName} ${user.lastName}` }`,
        extra: [
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
              title="Total Assigned"
              value={stats?.total || 0}
              prefix={<SolutionOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Cases"
              value={stats?.active || 0}
              prefix={<FireOutlined />}
              loading={statsLoading}
              valueStyle={{ color: stats?.active ? '#1890ff' : undefined }}
            />
            <Progress 
              percent={((stats?.active || 0) / (stats?.total || 1)) * 100} 
              strokeColor="#1890ff"
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Cases"
              value={stats?.overdue || 0}
              prefix={<ExclamationCircleOutlined />}
              loading={statsLoading}
              valueStyle={{ color: stats?.overdue ? '#ff4d4f' : undefined }}
            />
            {stats?.overdue > 0 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                Immediate attention required
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic
                title="Resolved This Week"
                value={stats?.resolvedThisWeek || 0}
                prefix={<CheckCircleOutlined />}
                loading={statsLoading}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Avg Resolution: {stats?.avgResolutionTime ? `${Math.floor(stats.avgResolutionTime / 60)}h ${stats.avgResolutionTime % 60}m` : 'N/A'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Status Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card size="small">
            <Space size={16}>
              <Text strong>Status Breakdown:</Text>
              <Badge count={stats?.inProgress || 0} showZero color="#1890ff">
                <Tag>In Progress</Tag>
              </Badge>
              <Badge count={stats?.pending || 0} showZero color="#faad14">
                <Tag>Pending</Tag>
              </Badge>
              <Badge count={stats?.resolved || 0} showZero color="#52c41a">
                <Tag>Resolved</Tag>
              </Badge>
            </Space>
          </Card>
        </Col>
      </Row>

      <ProTable<Case>
        actionRef={actionRef}
        columns={columns}
        request={async (params = {}, sort, filter) => {
          try {
            if (!user?.id) {
              return {
                data: [],
                success: false,
                total: 0,
              };
            }

            const queryParams: any = {
              page: params.current ? params.current - 1 : 0,
              size: params.pageSize || 20,
              assignedToId: user.id, // Only show cases assigned to current user
            };

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
              // Default sort by priority and created date
              queryParams.sort = 'priority,asc';
            }

            // Handle filters
            if (filter?.status) {
              queryParams.status = filter.status.join(',');
            }
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
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`,
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1500 }}
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
              <Button size="small" type="primary" ghost>
                Bulk Update Status
              </Button>
              <Button size="small">
                Export Selected
              </Button>
            </Space>
          );
        }}
      />
    </PageContainer>
  );
}