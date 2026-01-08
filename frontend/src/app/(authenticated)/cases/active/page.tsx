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
  Modal, 
  Select, 
  message,
  Badge,
  Tooltip,
  Alert,
  Card,
  Row,
  Col,
  Statistic,
  Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { Case, UserSummaryDto, CaseStatus, CaseSeverity, CasePriority } from '@/lib/types';
import { getPriorityLabel, getPriorityColor, getSeverityColor, getStatusColor, getSlaStatus, getCategoryLabel } from '@/lib/utils/case-utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { confirm } = Modal;
const { Text } = Typography;

// Active statuses - cases that are not resolved/closed
const ACTIVE_STATUSES: CaseStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'PENDING_VENDOR'];

export default function ActiveCasesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Fetch available users for assignment
  const { data: users } = useQuery({
    queryKey: ['users', 'available-for-assignment'],
    queryFn: () => usersApi.getAvailableForAssignment(),
  });

  // Get active cases stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['cases', 'active-stats'],
    queryFn: async () => {
      const response = await casesApi.getAll({ 
        status: ACTIVE_STATUSES.join(','),
        page: 0,
        size: 1 
      });
      
      // Calculate stats from active cases
      return {
        total: response.data.totalElements || 0,
        critical: response.data.content?.filter((c: Case) => c.severity === 'CRITICAL').length || 0,
        high: response.data.content?.filter((c: Case) => c.severity === 'HIGH').length || 0,
        slaAtRisk: response.data.content?.filter((c: Case) => {
          const sla = getSlaStatus(c.slaDeadline, c.slaBreached);
          return sla.status === 'at-risk' || sla.status === 'breached';
        }).length || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleAssign = async () => {
    if (!selectedCase || !selectedUserId) return;

    try {
      await casesApi.assign(selectedCase.id, selectedUserId);
      message.success('Case assigned successfully');
      setAssignModalVisible(false);
      setSelectedCase(null);
      setSelectedUserId(undefined);
      actionRef.current?.reload();
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleUpdateStatus = async (caseItem: Case, newStatus: CaseStatus) => {
    try {
      await casesApi.updateStatus(caseItem.id, newStatus);
      message.success('Status updated successfully');
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
      render: (severity: CaseSeverity) => (
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
      render: (priority: CasePriority) => {
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
      render: (status: CaseStatus) => (
        <Tag color={getStatusColor(status)} icon={status === 'IN_PROGRESS' ? <PlayCircleOutlined /> : null}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 150,
      render: (assignedTo: UserSummaryDto) => (
        assignedTo ? (
          <Space size={4}>
            <UserOutlined style={{ fontSize: 12 }} />
            <span>{assignedTo.name || assignedTo.fullName || assignedTo.username}</span>
          </Space>
        ) : (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>
            Unassigned
          </Tag>
        )
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
      title: 'SLA Status',
      dataIndex: 'slaDeadline',
      key: 'sla',
      width: 140,
      render: (slaDeadline: string, record: Case) => {
        const sla = getSlaStatus(slaDeadline, record.slaBreached);
        return (
          <Space direction="vertical" size={0}>
            <Tag color={sla.color} icon={sla.status === 'breached' ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}>
              {sla.label}
            </Tag>
            {slaDeadline && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(slaDeadline).fromNow()}
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
      render: (date: string) => {
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
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record: Case) => (
        <Space>
          <Tooltip title="View">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => router.push(`/cases/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Assign">
            <Button 
              size="small" 
              icon={<UserAddOutlined />}
              onClick={() => {
                setSelectedCase(record);
                setAssignModalVisible(true);
              }}
              disabled={record.status === 'CLOSED' || record.status === 'CANCELLED'}
            />
          </Tooltip>
          <Tooltip title="Update Status">
            <Button 
              size="small" 
              icon={<PlayCircleOutlined />}
              onClick={() => {
                if (record.status === 'OPEN' || record.status === 'ASSIGNED') {
                  handleUpdateStatus(record, 'IN_PROGRESS');
                }
              }}
              disabled={record.status === 'IN_PROGRESS' || !record.assignedTo}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: 'Active Cases',
        subTitle: 'Cases requiring immediate attention',
        onBack: () => router.push('/cases'),
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
              title="Total Active"
              value={stats?.total || 0}
              prefix={<TeamOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical Cases"
              value={stats?.critical || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="High Priority"
              value={stats?.high || 0}
              valueStyle={{ color: '#ffa940' }}
              prefix={<WarningOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SLA at Risk"
              value={stats?.slaAtRisk || 0}
              valueStyle={{ color: '#fadb14' }}
              prefix={<ClockCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Active Cases Notice */}
      <Alert
        message="Active Cases View"
        description="This view shows only cases that are currently active (Open, Assigned, In Progress, or Pending). Resolved and Closed cases are excluded."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        closable
      />

      <ProTable<Case>
        actionRef={actionRef}
        columns={columns}
        request={async (params = {}, sort, filter) => {
          try {
            const queryParams: any = {
              page: params.current ? params.current - 1 : 0,
              size: params.pageSize || 20,
              status: ACTIVE_STATUSES.join(','), // Only active statuses
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
              // Default sort by priority and severity
              queryParams.sort = 'priority,asc';
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
          placeholder: 'Search by case number or title...',
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} active cases`,
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1400 }}
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
          getCheckboxProps: (record: Case) => ({
            disabled: record.status === 'CLOSED' || record.status === 'CANCELLED',
          }),
        }}
        tableAlertRender={({ selectedRowKeys, selectedRows }) => {
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
              <Button size="small" icon={<UserAddOutlined />}>
                Bulk Assign
              </Button>
              <Button size="small" icon={<PlayCircleOutlined />}>
                Start Progress
              </Button>
            </Space>
          );
        }}
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
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {selectedCase && (
            <Card size="small">
              <Space direction="vertical" size={4}>
                <Text strong>Case: {selectedCase.caseNumber}</Text>
                <Text>{selectedCase.title}</Text>
                <Space>
                  <Tag color={getSeverityColor(selectedCase.severity)}>
                    {selectedCase.severity}
                  </Tag>
                  <Tag color={getPriorityColor(selectedCase.priority)}>
                    {getPriorityLabel(selectedCase.priority)}
                  </Tag>
                </Space>
              </Space>
            </Card>
          )}
          
          <Select
            style={{ width: '100%' }}
            placeholder="Select a user"
            value={selectedUserId}
            onChange={setSelectedUserId}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users?.data?.map((user: any) => ({
              value: user.id,
              label: `${user.name || user.fullName} (${user.email})`,
            })) || []}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
}