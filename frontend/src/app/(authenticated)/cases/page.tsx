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
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  BulbFilled,
  TeamOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileFilled,
  UserOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { Case, CaseFilters, User, UserSummaryDto, CaseStatus, CaseSeverity, CasePriority, CasePriorityLabel } from '@/lib/types';
import { getPriorityLabel, getPriorityColor, getSeverityColor, getStatusColor, getSlaStatus, formatResolutionTime, getCategoryLabel, getPriorityValue } from '@/lib/utils/case-utils';
import FilterBar, { FilterConfig } from '@/components/ui-system/FilterBar';
import StatusIndicator from '@/components/ui-system/StatusIndicator';
import ActionDropdown, { CommonActions } from '@/components/ui-system/ActionDropdown';
import MetricsCard from '@/components/ui-system/MetricsCard';
import dayjs from 'dayjs';

const { confirm } = Modal;
const { Title, Text } = Typography;

export default function CasesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<CaseFilters>({});
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { label: 'Open', value: 'OPEN' },
        { label: 'Assigned', value: 'ASSIGNED' },
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
        { label: 'Pending Vendor', value: 'PENDING_VENDOR' },
        { label: 'Resolved', value: 'RESOLVED' },
        { label: 'Closed', value: 'CLOSED' },
        { label: 'Cancelled', value: 'CANCELLED' },
      ],
      width: 200,
    },
    {
      key: 'severity',
      label: 'Severity',
      type: 'multiselect',
      options: [
        { label: 'Critical', value: 'CRITICAL', color: '#ff4d4f' },
        { label: 'High', value: 'HIGH', color: '#ffa940' },
        { label: 'Medium', value: 'MEDIUM', color: '#fadb14' },
        { label: 'Low', value: 'LOW', color: '#52c41a' },
      ],
      width: 180,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'multiselect',
      options: [
        { label: 'Urgent', value: 1, color: '#ff4d4f' },
        { label: 'High', value: 2, color: '#ffa940' },
        { label: 'Medium', value: 3, color: '#fadb14' },
        { label: 'Low', value: 4, color: '#52c41a' },
      ],
      width: 180,
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      type: 'multiselect',
      options: users?.data?.map((user: User) => ({
        label: user.fullName,
        value: user.id,
      })) || [],
      searchable: true,
      width: 200,
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'daterange',
      width: 300,
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { label: 'Revenue Loss', value: 'REVENUE_LOSS' },
        { label: 'Network Issue', value: 'NETWORK_ISSUE' },
        { label: 'Quality Issue', value: 'QUALITY' },
        { label: 'Fraud Alert', value: 'FRAUD' },
        { label: 'Performance', value: 'PERFORMANCE' },
        { label: 'Custom', value: 'CUSTOM' },
      ],
      width: 180,
    },
  ];

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

  const handleBulkAction = async (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select cases to perform bulk action');
      return;
    }

    try {
      switch (action) {
        case 'assign':
          // Bulk assign logic
          message.info('Bulk assign functionality coming soon');
          break;
        case 'close':
          confirm({
            title: `Close ${selectedRowKeys.length} cases`,
            icon: <ExclamationCircleOutlined />,
            content: 'Are you sure you want to close the selected cases?',
            onOk: async () => {
              // Bulk close logic
              message.success(`${selectedRowKeys.length} cases closed successfully`);
              setSelectedRowKeys([]);
              actionRef.current?.reload();
            },
          });
          break;
        case 'export':
          message.info('Exporting selected cases...');
          break;
        default:
          message.info(`Bulk ${action} functionality coming soon`);
      }
    } catch (error) {
      message.error(handleApiError(error));
    }
  };

  const handleFilterChange = (newFilters: CaseFilters) => {
    setFilters(newFilters);
    actionRef.current?.reload();
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
        <StatusIndicator 
          type="severity" 
          value={severity} 
          showText 
          animated={severity === 'CRITICAL'}
        />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      filters: [
        { text: 'Urgent', value: 1 },
        { text: 'High', value: 2 },
        { text: 'Medium', value: 3 },
        { text: 'Low', value: 4 },
      ],
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
      width: 120,
      filters: [
        { text: 'Open', value: 'OPEN' },
        { text: 'Assigned', value: 'ASSIGNED' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Pending Customer', value: 'PENDING_CUSTOMER' },
        { text: 'Pending Vendor', value: 'PENDING_VENDOR' },
        { text: 'Resolved', value: 'RESOLVED' },
        { text: 'Closed', value: 'CLOSED' },
        { text: 'Cancelled', value: 'CANCELLED' },
      ],
      render: (status: CaseStatus) => (
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
          <span style={{ color: '#999', fontStyle: 'italic' }}>Unassigned</span>
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
      width: 120,
      render: (slaDeadline: string, record: Case) => {
        const sla = getSlaStatus(slaDeadline, record.slaBreached);
        return (
          <Tag color={sla.color} icon={sla.status === 'breached' ? <ExclamationCircleOutlined /> : null}>
            {sla.label}
          </Tag>
        );
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
      title: 'Updated Date',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      sorter: true,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: Case) => {
        const isClosedOrCancelled = record.status === 'CLOSED' || record.status === 'CANCELLED';
        
        return (
          <ActionDropdown
            items={[
              {
                ...CommonActions.view,
                onClick: () => router.push(`/cases/${record.id}`),
              },
              {
                ...CommonActions.edit,
                onClick: () => router.push(`/cases/${record.id}?mode=edit`),
                disabled: isClosedOrCancelled,
              },
              {
                ...CommonActions.assign,
                disabled: isClosedOrCancelled,
                onClick: () => {
                  setSelectedCase(record);
                  setAssignModalVisible(true);
                },
              },
              {
                ...CommonActions.divider,
              },
              {
                ...CommonActions.close,
                disabled: isClosedOrCancelled,
                onClick: () => handleClose(record),
                badge: record.severity === 'CRITICAL' ? '!' : undefined,
              },
            ]}
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
              title="Total Cases"
              value={casesStats?.data?.total || 0}
              icon={<FileFilled />}
              color="#1677ff"
              loading={statsLoading}
              onClick={() => setFilters({})}
              tooltip="Total number of cases in the system"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="Open Cases"
              value={casesStats?.data?.open || 0}
              icon={<ClockCircleOutlined />}
              color="#ffa940"
              loading={statsLoading}
              onClick={() => setFilters({ status: ['OPEN'] })}
              tooltip="Cases that are currently open"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="In Progress"
              value={casesStats?.data?.inProgress || 0}
              icon={<UserOutlined />}
              color="#722ed1"
              loading={statsLoading}
              onClick={() => setFilters({ status: ['IN_PROGRESS'] })}
              tooltip="Cases currently being worked on"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricsCard
              title="SLA Compliance"
              value={casesStats?.data?.slaCompliance || 0}
              suffix="%"
              icon={<CheckCircleOutlined />}
              color="#52c41a"
              loading={statsLoading}
              tooltip="Percentage of cases resolved within SLA"
              extra={
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Avg: {casesStats?.data?.averageResolutionTime || 0}h
                  </Text>
                </Space>
              }
            />
          </Col>
        </Row>
      </motion.div>

      {/* Enhanced Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: 24 }}
      >
        <FilterBar
          config={filterConfig}
          value={filters}
          onChange={handleFilterChange}
          onSearch={(search) => setFilters({ ...filters, search })}
          onClear={() => setFilters({})}
          showSearch
          searchPlaceholder="Search cases by title, ID, or description..."
          showPresets
          presets={[
            { name: 'Critical Open', filters: { severity: ['CRITICAL'], status: ['OPEN', 'ASSIGNED'] } },
            { name: 'My Assignments', filters: { assignedTo: [/* current user ID */] } },
            { name: 'This Week', filters: { dateRange: [dayjs().startOf('week').toISOString(), dayjs().toISOString()] } },
          ]}
        />
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedRowKeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              message={
                <Space>
                  <Text strong>{selectedRowKeys.length} cases selected</Text>
                  <Button size="small" icon={<UserAddOutlined />} onClick={() => handleBulkAction('assign')}>
                    Bulk Assign
                  </Button>
                  <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleBulkAction('close')}>
                    Bulk Close
                  </Button>
                  <Button size="small" icon={<ExportOutlined />} onClick={() => handleBulkAction('export')}>
                    Export
                  </Button>
                  <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>
                    Clear Selection
                  </Button>
                </Space>
              }
              type="info"
              showIcon
              closable
              onClose={() => setSelectedRowKeys([])}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PageContainer
        title={
          <Space>
            <span>Cases Management</span>
            {Object.keys(filters).length > 0 && (
              <Badge 
                count={Object.keys(filters).length} 
                style={{ backgroundColor: '#1677ff' }}
              />
            )}
          </Space>
        }
        subTitle="Manage and track all revenue assurance cases"
        extra={[
          <Button 
            key="filters" 
            icon={<FilterOutlined />} 
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? "primary" : "default"}
          >
            Filters
          </Button>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            Refresh
          </Button>,
          <Button 
            key="export" 
            icon={<ExportOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => handleBulkAction('export')}
          >
            Export {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
          </Button>,
          <Button 
            key="create" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => router.push('/cases/new')}
          >
            New Case
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
                  search: params.title || filters.search || '',
                };

                // Apply filters
                if (filters.status) queryParams.status = filters.status.join(',');
                if (filters.severity) queryParams.severity = filters.severity.join(',');
                if (filters.priority) queryParams.priority = filters.priority.join(',');
                if (filters.assignedTo) queryParams.assignedTo = filters.assignedTo.join(',');
                if (filters.category) queryParams.category = filters.category;
                if (filters.dateRange) {
                  queryParams.dateFrom = filters.dateRange[0];
                  queryParams.dateTo = filters.dateRange[1];
                }

                // Handle sorting
                if (sort && Object.keys(sort).length > 0) {
                  const sortKey = Object.keys(sort)[0];
                  const sortOrder = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
                  queryParams.sort = `${sortKey},${sortOrder}`;
                }

                // Handle column filters
                if (filter) {
                  if (filter.status) queryParams.status = filter.status.join(',');
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              preserveSelectedRowKeys: true,
              getCheckboxProps: (record: Case) => ({
                disabled: record.status === 'CLOSED' || record.status === 'CANCELLED',
                name: record.caseId,
              }),
            }}
            search={false} // We have our own search
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`,
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
            headerTitle={
              <Space>
                <span>Cases</span>
                {Object.keys(filters).length > 0 && (
                  <Badge 
                    count={`${Object.keys(filters).length} filters`} 
                    style={{ backgroundColor: '#1677ff' }}
                  />
                )}
              </Space>
            }
            toolBarRender={() => [
              <Tooltip key="quick-filters" title="Quick access to common case views">
                <Space.Compact>
                  <Button 
                    size="small"
                    type={JSON.stringify(filters) === JSON.stringify({status: ['OPEN']}) ? 'primary' : 'default'}
                    onClick={() => setFilters({status: ['OPEN']})}
                  >
                    Open
                  </Button>
                  <Button 
                    size="small"
                    type={JSON.stringify(filters) === JSON.stringify({status: ['IN_PROGRESS']}) ? 'primary' : 'default'}
                    onClick={() => setFilters({status: ['IN_PROGRESS']})}
                  >
                    Active
                  </Button>
                  <Button 
                    size="small"
                    type={JSON.stringify(filters) === JSON.stringify({severity: ['CRITICAL', 'HIGH']}) ? 'primary' : 'default'}
                    onClick={() => setFilters({severity: ['CRITICAL', 'HIGH']})}
                  >
                    High Priority
                  </Button>
                  <Button 
                    size="small"
                    type={JSON.stringify(filters) === JSON.stringify({status: ['RESOLVED']}) ? 'primary' : 'default'}
                    onClick={() => setFilters({status: ['RESOLVED']})}
                  >
                    Resolved
                  </Button>
                </Space.Compact>
              </Tooltip>
            ]}
            tableAlertRender={({ selectedRowKeys, selectedRows, onCleanSelected }) => {
              return selectedRowKeys && selectedRowKeys.length > 0 ? (
                <Space>
                  <span>
                    Selected {selectedRowKeys.length} cases
                    <Button type="link" size="small" onClick={onCleanSelected}>
                      Clear
                    </Button>
                  </span>
                </Space>
              ) : false;
            }}
            tableAlertOptionRender={({ selectedRowKeys, selectedRows, onCleanSelected }) => {
              return selectedRowKeys && selectedRowKeys.length > 0 ? (
                <Space size={16}>
                  <Button size="small" icon={<UserAddOutlined />} onClick={() => handleBulkAction('assign')}>
                    Bulk Assign
                  </Button>
                  <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleBulkAction('close')}>
                    Bulk Close
                  </Button>
                  <Button size="small" icon={<ExportOutlined />} onClick={() => handleBulkAction('export')}>
                    Export Selected
                  </Button>
                </Space>
              ) : false;
            }}
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
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={users?.data?.filter((user: User) => user && user.id != null).map((user: User) => ({
                  value: user.id,
                  label: `${user.fullName} (${user.email})`,
                  disabled: selectedCase?.assignedTo?.id === user.id,
                })) || []}
                notFoundContent="No available users"
              />
              {selectedCase?.assignedTo && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Currently assigned to: {selectedCase.assignedTo.fullName}
                </Text>
              )}
            </div>
          </Space>
        </Modal>
      </PageContainer>
    </div>
  );
}