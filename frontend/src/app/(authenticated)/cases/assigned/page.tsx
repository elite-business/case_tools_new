'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  ExportOutlined,
  UserOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileFilled,
  TeamOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { Case, CaseFilters, User, UserSummaryDto } from '@/lib/types';
import { getPriorityLabel, getPriorityColor, getSeverityColor, getStatusColor, getSlaStatus, formatResolutionTime, getCategoryLabel, getPriorityValue } from '@/lib/utils/case-utils';
import StatusIndicator from '@/components/ui-system/StatusIndicator';
import ActionDropdown, { CommonActions } from '@/components/ui-system/ActionDropdown';
import MetricsCard from '@/components/ui-system/MetricsCard';
import { useAuthStore } from '@/store/auth-store';
import { Permission } from '@/lib/rbac';
import { RoleGuard, useRolePermissions } from '@/components/auth/RoleGuard';
import dayjs from 'dayjs';

const { confirm } = Modal;
const { Title, Text } = Typography;

export default function AssignedCasesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Get user info
  const { user } = useAuthStore();
  const { userRole, hasPermission: checkPermission } = useRolePermissions();
  
  // Define permissions for different actions
  const permissions = {
    create: checkPermission(Permission.CREATE_CASES),
    edit: checkPermission(Permission.EDIT_CASES),
    delete: checkPermission(Permission.DELETE_CASES),
    assign: checkPermission(Permission.ASSIGN_CASES),
    close: checkPermission(Permission.CLOSE_CASES),
    viewAll: userRole === 'ADMIN' || userRole === 'MANAGER', // Only admin/manager can see all cases
    export: checkPermission(Permission.EXPORT_DATA),
  };

  // Fetch available users for assignment
  const { data: users } = useQuery({
    queryKey: ['users', 'available-for-assignment'],
    queryFn: () => usersApi.getAvailableForAssignment(),
  });

  // Fetch cases statistics
  const { data: casesStats, isLoading: statsLoading } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesApi.getStats(),
    refetchInterval: 30000,
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

  const handleClose = (caseItem: Case) => {
    confirm({
      title: 'Close Case',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to close this case?',
      onOk: async () => {
        try {
          await casesApi.close(caseItem.id, 'Manually closed', '');
          message.success('Case closed successfully');
          actionRef.current?.reload();
        } catch (error) {
          message.error(handleApiError(error));
        }
      },
    });
  };

  const columns: ProColumns<Case>[] = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      width: 140,
      fixed: 'left',
      render: (_, record: Case) => (
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
      render: (_, record: Case) => (
        <Tooltip title={record.title}>
          <span>{record.title}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (_, record: Case) => (
        <StatusIndicator 
          type="severity" 
          value={record.severity} 
          showText 
          animated={record.severity === 'CRITICAL'}
        />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (_, record: Case) => {
        const label = getPriorityLabel(record.priority);
        return (
          <Tag color={getPriorityColor(record.priority)}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_, record: Case) => (
        <StatusIndicator 
          type="status" 
          value={record.status} 
          showText 
          showIcon 
          animated={record.status === 'IN_PROGRESS'}
        />
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedUsers',
      key: 'assignedUsers',
      width: 150,
      render: (_, record: Case) => {
        // Backend returns assignedUsers as an array, but Case type has assignedTo
        const assignedUsers = record.assignedUsers || [];
        const assignedTo = record.assignedTo; // Fallback for single assignment
        
        if (assignedUsers.length > 0) {
          const firstUser = assignedUsers[0];
          return (
            <Space size={4}>
              <UserOutlined style={{ fontSize: 12 }} />
              <span>{firstUser.name || firstUser.fullName || firstUser.username}</span>
              {assignedUsers.length > 1 && (
                <span style={{ color: '#999', fontSize: 11 }}>+{assignedUsers.length - 1}</span>
              )}
            </Space>
          );
        } else if (assignedTo) {
          return (
            <Space size={4}>
              <UserOutlined style={{ fontSize: 12 }} />
              <span>{assignedTo.name || assignedTo.fullName || assignedTo.username}</span>
            </Space>
          );
        } else {
          return (
            <span style={{ color: '#999', fontStyle: 'italic' }}>Unassigned</span>
          );
        }
      },
    },
    {
      title: 'Assigned Date',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      width: 150,
      sorter: true,
      render: (_, record: Case) => record.assignedAt ? dayjs(record.assignedAt).format('MMM DD, YYYY HH:mm') : 'N/A',
    },
    {
      title: 'SLA Status',
      dataIndex: 'slaDeadline',
      key: 'sla',
      width: 120,
      render: (_, record: Case) => {
        const sla = getSlaStatus(record.slaDeadline, record.slaBreached);
        return (
          <Tag color={sla.color} icon={sla.status === 'breached' ? <ExclamationCircleOutlined /> : null}>
            {sla.label}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: Case) => {
        const isClosedOrCancelled = record.status === 'CLOSED' || record.status === 'CANCELLED';
        
        // Build actions based on user permissions
        const actions = [
          {
            ...CommonActions.view,
            onClick: () => router.push(`/cases/${record.id}`),
          },
        ];

        // Add edit action if user has permission
        if (permissions.edit) {
          actions.push({
            ...CommonActions.edit,
            onClick: () => router.push(`/cases/${record.id}?mode=edit`),
          });
        }

        // Add close action if user has permission
        if (permissions.close && !isClosedOrCancelled) {
          actions.push({
            ...CommonActions.close,
            onClick: () => handleClose(record),
          });
        }
        
        return (
          <ActionDropdown
            items={actions}
            placement="bottomRight"
            size="small"
          />
        );
      },
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Statistics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="My Assigned Cases"
              value={casesStats?.data?.assigned || 0}
              icon={<UserOutlined />}
              color="#722ed1"
              loading={statsLoading}
              tooltip="Cases currently assigned to you"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="In Progress"
              value={casesStats?.data?.inProgress || 0}
              icon={<ClockCircleOutlined />}
              color="#1677ff"
              loading={statsLoading}
              tooltip="Cases you're actively working on"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="SLA at Risk"
              value={casesStats?.data?.slaAtRisk || 0}
              icon={<WarningOutlined />}
              color="#ffa940"
              loading={statsLoading}
              tooltip="Cases approaching SLA deadline"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="Completed This Week"
              value={casesStats?.data?.completedThisWeek || 0}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
              loading={statsLoading}
              tooltip="Cases you've resolved this week"
            />
          </Col>
        </Row>
      </motion.div>

      <PageContainer
        title="My Assigned Cases"
        subTitle="Cases currently assigned to you"
        extra={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            Refresh
          </Button>,
        ]}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ProTable<Case>
            actionRef={actionRef}
            columns={columns}
            request={async (params = {}, sort, filter) => {
              try {
                const queryParams: any = {
                  page: params.current ? params.current - 1 : 0,
                  size: params.pageSize || 10,
                  search: params.title || '',
                };

                // Filter to show only cases assigned to current user
                if (user?.id) {
                  queryParams.assignedToId = user.id;
                }

                // Handle sorting
                if (sort && Object.keys(sort).length > 0) {
                  const sortKey = Object.keys(sort)[0];
                  const sortOrder = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
                  queryParams.sort = `${sortKey},${sortOrder}`;
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
              defaultCollapsed: false,
              searchText: 'Search',
              resetText: 'Reset',
            }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`,
              defaultPageSize: 20,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1200 }}
            options={{
              reload: true,
              density: true,
              setting: true,
              fullScreen: true,
            }}
            headerTitle="Assigned Cases"
            toolBarRender={() => [
              <Button 
                key="export" 
                icon={<ExportOutlined />}
                onClick={() => message.info('Export functionality coming soon')}
              >
                Export
              </Button>,
            ]}
            size="small"
            bordered
          />
        </motion.div>

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
          width={500}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card size="small" style={{ backgroundColor: '#f9f9f9' }}>
              <Space direction="vertical" size={4}>
                <Text strong>Case Details:</Text>
                <Text>{selectedCase?.title}</Text>
                <Space>
                  <StatusIndicator 
                    type="severity" 
                    value={selectedCase?.severity || 'MEDIUM'} 
                    showText 
                    size="small"
                  />
                  <StatusIndicator 
                    type="status" 
                    value={selectedCase?.status || 'OPEN'} 
                    showText 
                    showIcon 
                    size="small"
                  />
                </Space>
              </Space>
            </Card>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Assign to:
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Select a user to assign this case"
                value={selectedUserId}
                onChange={setSelectedUserId}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={users?.data?.filter((user: User) => user && user.id != null).map((user: User) => ({
                  value: user.id,
                  label: `${user.fullName || user.name} (${user.email})`,
                  disabled: selectedCase?.assignedUsers?.some(au => au.id === user.id) || selectedCase?.assignedTo?.id === user.id,
                })) || []}
                notFoundContent="No available users"
              />
              {(selectedCase?.assignedUsers?.length || selectedCase?.assignedTo) && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Currently assigned to: {
                    selectedCase.assignedUsers?.length 
                      ? selectedCase.assignedUsers.map(u => u.name || u.fullName || u.username).join(', ')
                      : selectedCase.assignedTo?.name || selectedCase.assignedTo?.fullName || selectedCase.assignedTo?.username
                  }
                </Text>
              )}
            </div>
          </Space>
        </Modal>
      </PageContainer>
    </div>
  );
}