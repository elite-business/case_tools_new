'use client';

import React, { useState } from 'react';
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
  Dropdown, 
  Modal, 
  message,
  Badge,
  Tooltip,
  Card,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  EyeOutlined,
  MoreOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RedoOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { casesApi, handleApiError } from '@/lib/api-client';
import { Case, User, CaseStatus, CaseSeverity, CasePriority } from '@/lib/types';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const { confirm } = Modal;

const statusColors: Record<CaseStatus, string> = {
  OPEN: 'blue',
  ASSIGNED: 'orange',
  IN_PROGRESS: 'processing',
  PENDING_CUSTOMER: 'warning',
  PENDING_VENDOR: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  CANCELLED: 'error',
};

const severityColors: Record<CaseSeverity, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#ffa940',
  MEDIUM: '#fadb14',
  LOW: '#52c41a',
};

const priorityColors: Record<CasePriority, string> = {
  URGENT: '#ff4d4f',
  HIGH: '#ffa940',
  MEDIUM: '#fadb14',
  LOW: '#52c41a',
};

// Resolved statuses
const RESOLVED_STATUSES: CaseStatus[] = ['RESOLVED', 'CLOSED'];

export default function ResolvedCasesPage() {
  const router = useRouter();
  const [actionRef, setActionRef] = useState<ActionType>();

  // Get resolved cases stats
  const { data: stats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesApi.getStats(),
  });

  const handleReopen = (caseItem: Case) => {
    confirm({
      title: 'Reopen Case',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to reopen this case?',
      onOk: async () => {
        try {
          await casesApi.update(caseItem.id, { status: 'OPEN' });
          message.success('Case reopened successfully');
          actionRef?.reload();
        } catch (error) {
          message.error(handleApiError(error));
        }
      },
    });
  };

  const formatDuration = (hours: number | undefined) => {
    if (!hours) return 'N/A';
    
    const dur = dayjs.duration(hours, 'hours');
    const days = Math.floor(dur.asDays());
    const remainingHours = dur.hours();
    const minutes = dur.minutes();
    
    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (remainingHours > 0) {
      return `${remainingHours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const columns: ProColumns<Case>[] = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      width: 120,
      fixed: 'left',
      render: (text: string, record: Case) => (
        <Button 
          type="link" 
          onClick={() => router.push(`/cases/${record.id}`)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
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
        <Tag color={severityColors[severity]}>{severity}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: RESOLVED_STATUSES.map(status => ({
        text: status.replace('_', ' '),
        value: status,
      })),
      render: (status: CaseStatus) => (
        <Badge 
          status={statusColors[status] as any} 
          text={status.replace('_', ' ')} 
        />
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 150,
      render: (assignedTo: User) => (
        assignedTo ? (
          <span>{assignedTo.fullName}</span>
        ) : (
          <span style={{ color: '#999' }}>Unassigned</span>
        )
      ),
    },
    {
      title: 'Resolution',
      dataIndex: 'resolution',
      key: 'resolution',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        text ? (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ) : (
          <span style={{ color: '#999' }}>No resolution provided</span>
        )
      ),
    },
    {
      title: 'Resolution Time',
      dataIndex: 'actualResolutionTime',
      key: 'resolutionTime',
      width: 130,
      sorter: true,
      render: (time: number, record: Case) => {
        if (record.createdAt && record.closedAt) {
          const hours = dayjs(record.closedAt).diff(dayjs(record.createdAt), 'hour', true);
          return formatDuration(hours);
        }
        return formatDuration(time);
      },
    },
    {
      title: 'Closed Date',
      dataIndex: 'closedAt',
      key: 'closedAt',
      width: 150,
      sorter: true,
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'N/A',
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: true,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record: Case) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View Details',
                onClick: () => router.push(`/cases/${record.id}`),
              },
              {
                key: 'reopen',
                icon: <RedoOutlined />,
                label: 'Reopen',
                disabled: record.status === 'CANCELLED',
                onClick: () => handleReopen(record),
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const resolvedCasesCount = stats?.data ? 
    stats.data.resolved + stats.data.closed : 0;

  return (
    <PageContainer
      title="Resolved Cases"
      subTitle="Cases that have been resolved or closed"
      onBack={() => router.push('/cases')}
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef?.reload()}>
          Refresh
        </Button>,
      ]}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Resolved"
              value={resolvedCasesCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Avg. Resolution Time"
              value={stats?.data?.averageResolutionTime || 0}
              suffix="hours"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="SLA Compliance"
              value={stats?.data?.slaCompliance || 0}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
      </Row>

      <ProTable<Case>
        actionRef={(ref) => setActionRef(ref)}
        columns={columns}
        request={async (params = {}, sort, filter) => {
          try {
            const queryParams: any = {
              page: params.current ? params.current - 1 : 0,
              size: params.pageSize || 10,
              search: params.title || '',
              status: RESOLVED_STATUSES.join(','), // Filter for resolved statuses only
            };

            // Handle sorting
            if (sort && Object.keys(sort).length > 0) {
              const sortKey = Object.keys(sort)[0];
              const sortOrder = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
              queryParams.sort = `${sortKey},${sortOrder}`;
            } else {
              // Default sort by close date (newest first)
              queryParams.sort = 'closedAt,desc';
            }

            // Handle filters
            if (filter) {
              if (filter.status) {
                // Intersect with resolved statuses
                const resolvedFiltered = filter.status.filter((s: string) => 
                  RESOLVED_STATUSES.includes(s as CaseStatus)
                );
                if (resolvedFiltered.length > 0) {
                  queryParams.status = resolvedFiltered.join(',');
                }
              }
              if (filter.severity) queryParams.severity = filter.severity.join(',');
              if (filter.priority) queryParams.priority = filter.priority.join(',');
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
          labelWidth: 'auto',
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1500 }}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
        headerTitle={`Resolved Cases (${resolvedCasesCount})`}
        toolBarRender={() => [
          <Button key="all" onClick={() => router.push('/cases')}>
            All Cases
          </Button>,
          <Button key="active" onClick={() => router.push('/cases/active')}>
            Active Cases
          </Button>,
          <Button key="my-cases" onClick={() => router.push('/cases/my-cases')}>
            My Cases
          </Button>,
        ]}
        dateFormatter="string"
      />
    </PageContainer>
  );
}