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
  Select, 
  message,
  Badge,
  Tooltip,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { Case, User, CaseStatus, CaseSeverity, CasePriority } from '@/lib/types';
import dayjs from 'dayjs';

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

// Active statuses - cases that are not resolved/closed
const ACTIVE_STATUSES: CaseStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'PENDING_VENDOR'];

export default function ActiveCasesPage() {
  const router = useRouter();
  const [actionRef, setActionRef] = useState<ActionType>();
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>();

  // Fetch available users for assignment
  const { data: users } = useQuery({
    queryKey: ['users', 'available-for-assignment'],
    queryFn: () => usersApi.getAvailableForAssignment(),
  });

  // Get active cases stats
  const { data: stats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesApi.getStats(),
  });

  const handleAssign = async () => {
    if (!selectedCase || !selectedUserId) return;

    try {
      await casesApi.assign(selectedCase.id, selectedUserId);
      message.success('Case assigned successfully');
      setAssignModalVisible(false);
      setSelectedCase(null);
      setSelectedUserId(undefined);
      actionRef?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleStartWork = async (caseItem: Case) => {
    try {
      await casesApi.update(caseItem.id, { status: 'IN_PROGRESS' });
      message.success('Case status updated to In Progress');
      actionRef?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleClose = (caseItem: Case) => {
    confirm({
      title: 'Close Case',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to close this case?',
      onOk: async () => {
        try {
          await casesApi.close(caseItem.id, 'Manually closed', '');
          message.success('Case closed successfully');
          actionRef?.reload();
        } catch (error) {
          message.error(handleApiError(error));
        }
      },
    });
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
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      filters: [
        { text: 'Urgent', value: 'URGENT' },
        { text: 'High', value: 'HIGH' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'Low', value: 'LOW' },
      ],
      render: (priority: CasePriority) => (
        <Tag color={priorityColors[priority]}>{priority}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: ACTIVE_STATUSES.map(status => ({
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
      title: 'Age',
      dataIndex: 'createdAt',
      key: 'age',
      width: 100,
      sorter: true,
      render: (date: string) => {
        const days = dayjs().diff(dayjs(date), 'day');
        const hours = dayjs().diff(dayjs(date), 'hour');
        
        if (days > 0) {
          return `${days}d`;
        } else {
          return `${hours}h`;
        }
      },
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
      width: 120,
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
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => router.push(`/cases/${record.id}?mode=edit`),
              },
              {
                key: 'start',
                icon: <PlayCircleOutlined />,
                label: 'Start Work',
                disabled: record.status === 'IN_PROGRESS',
                onClick: () => handleStartWork(record),
              },
              {
                key: 'assign',
                icon: <UserAddOutlined />,
                label: 'Assign',
                onClick: () => {
                  setSelectedCase(record);
                  setAssignModalVisible(true);
                },
              },
              {
                key: 'close',
                icon: <CheckCircleOutlined />,
                label: 'Close',
                onClick: () => handleClose(record),
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const activeCasesCount = stats?.data ? 
    stats.data.open + stats.data.assigned + stats.data.inProgress : 0;

  return (
    <PageContainer
      title="Active Cases"
      subTitle="Cases that require attention"
      onBack={() => router.push('/cases')}
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef?.reload()}>
          Refresh
        </Button>,
      ]}
    >
      {activeCasesCount > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          message={`${activeCasesCount} active cases requiring attention`}
          type={activeCasesCount > 20 ? 'warning' : 'info'}
          showIcon
        />
      )}

      <ProTable<Case>
        actionRef={(ref) => setActionRef(ref)}
        columns={columns}
        request={async (params = {}, sort, filter) => {
          try {
            const queryParams: any = {
              page: params.current ? params.current - 1 : 0,
              size: params.pageSize || 10,
              search: params.title || '',
              status: ACTIVE_STATUSES.join(','), // Filter for active statuses only
            };

            // Handle sorting
            if (sort && Object.keys(sort).length > 0) {
              const sortKey = Object.keys(sort)[0];
              const sortOrder = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
              queryParams.sort = `${sortKey},${sortOrder}`;
            } else {
              // Default sort by creation date (newest first) and priority
              queryParams.sort = 'priority,desc,createdAt,desc';
            }

            // Handle filters
            if (filter) {
              if (filter.status) {
                // Intersect with active statuses
                const activeFiltered = filter.status.filter((s: string) => 
                  ACTIVE_STATUSES.includes(s as CaseStatus)
                );
                if (activeFiltered.length > 0) {
                  queryParams.status = activeFiltered.join(',');
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
        scroll={{ x: 1400 }}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
        headerTitle={`Active Cases (${activeCasesCount})`}
        rowClassName={(record) => {
          if (record.severity === 'CRITICAL') return 'critical-row';
          if (record.priority === 'URGENT') return 'urgent-row';
          return '';
        }}
        toolBarRender={() => [
          <Button key="all" onClick={() => router.push('/cases')}>
            All Cases
          </Button>,
          <Button key="resolved" onClick={() => router.push('/cases/resolved')}>
            Resolved Cases
          </Button>,
          <Button key="my-cases" onClick={() => router.push('/cases/my-cases')}>
            My Cases
          </Button>,
        ]}
      />

      <Modal
        title="Assign Case"
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedCase(null);
          setSelectedUserId(undefined);
        }}
        okButtonProps={{ disabled: !selectedUserId }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Case:</strong> {selectedCase?.title}
          </div>
          <div>
            <strong>Assign to:</strong>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select a user"
              value={selectedUserId}
              onChange={setSelectedUserId}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users?.data?.filter((user: User) => user && user.id != null).map((user: User) => ({
                value: user.id,
                label: `${user.fullName} (${user.email})`,
              })) || []}
            />
          </div>
        </Space>
      </Modal>

      <style jsx global>{`
        .critical-row {
          background-color: #fff2f0 !important;
        }
        
        .urgent-row {
          background-color: #fffbf0 !important;
        }
      `}</style>
    </PageContainer>
  );
}