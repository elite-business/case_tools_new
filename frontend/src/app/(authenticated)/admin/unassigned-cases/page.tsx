'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Select, 
  Modal, 
  Form, 
  Input, 
  message, 
  Row, 
  Col, 
  Statistic,
  Alert,
  Tooltip,
  Badge,
  AutoComplete,
  Descriptions
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  SelectOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { Case, User, Team, AssignCaseRequest } from '@/lib/types';
import { casesApi, usersApi, teamsApi, handleApiError } from '@/lib/api-client';

const { Title, Text } = Typography;
const { Option } = Select;

interface UnassignedCasesPageProps {}

interface AssignmentModalData {
  visible: boolean;
  selectedCases: Case[];
  isBulk: boolean;
}

export default function UnassignedCasesPage({}: UnassignedCasesPageProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  
  // State
  const [unassignedCases, setUnassignedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModalData>({
    visible: false,
    selectedCases: [],
    isBulk: false
  });
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filters, setFilters] = useState({
    severity: '',
    priority: '',
    search: ''
  });
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    slaBreached: 0
  });

  // Load data
  useEffect(() => {
    loadUnassignedCases();
    loadUsers();
    loadTeams();
  }, [filters]);

  const loadUnassignedCases = async () => {
    try {
      setLoading(true);
      // Get unassigned cases by filtering for cases with no assignee
      const response = await casesApi.getAll({
        assignedTo: 'null', // Filter for unassigned cases
        severity: filters.severity || undefined,
        priority: filters.priority ? parseInt(filters.priority) : undefined,
        search: filters.search || undefined,
        status: 'OPEN,ASSIGNED', // Only get cases that can be assigned
        sort: 'createdAt,desc'
      });
      
      const cases = response?.data?.content || [];
      setUnassignedCases(cases);
      
      // Calculate stats
      const total = cases.length;
      const critical = cases.filter((c:any) => c?.severity === 'CRITICAL').length;
      const high = cases.filter((c:any) => c?.severity === 'HIGH').length;
      const slaBreached = cases.filter((c:any) => c?.slaBreached === true).length;
      
      setStats({ total, critical, high, slaBreached });
    } catch (error) {
      message.error(handleApiError(error));
      console.error('Error loading unassigned cases:', error);
      // Set empty state on error
      setUnassignedCases([]);
      setStats({ total: 0, critical: 0, high: 0, slaBreached: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAvailableForAssignment();
      setUsers(response?.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      message.error(handleApiError(error));
      setUsers([]);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response?.data?.content || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      message.error(handleApiError(error));
      setTeams([]);
    }
  };

  const handleAssignCase = (caseItem: Case) => {
    setAssignmentModal({
      visible: true,
      selectedCases: [caseItem],
      isBulk: false
    });
  };

  const handleBulkAssign = () => {
    const selectedCases = unassignedCases.filter(c => 
      selectedRowKeys.includes(c.id)
    );
    
    if (selectedCases.length === 0) {
      message.warning('Please select cases to assign');
      return;
    }

    setAssignmentModal({
      visible: true,
      selectedCases,
      isBulk: true
    });
  };

  const handleAssignmentSubmit = async (values: any) => {
    try {
      setAssignmentLoading(true);
      
      for (const caseItem of assignmentModal.selectedCases) {
        const assignRequest: AssignCaseRequest = {
          userId: values.assignToUser,
          notes: values.notes || 'Assigned from unassigned queue'
        };
        
        await casesApi.assign(caseItem.id, values.assignToUser);
      }

      message.success(
        `Successfully assigned ${assignmentModal.selectedCases.length} case(s)`
      );
      
      // Reset and reload
      setAssignmentModal({ visible: false, selectedCases: [], isBulk: false });
      setSelectedRowKeys([]);
      form.resetFields();
      loadUnassignedCases();
      
    } catch (error) {
      message.error('Failed to assign cases');
      console.error('Assignment error:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'red';
      case 2: return 'orange';
      case 3: return 'blue';
      case 4: return 'green';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'blue';
      case 'LOW': return 'green';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'P1 - Urgent';
      case 2: return 'P2 - High';
      case 3: return 'P3 - Medium';
      case 4: return 'P4 - Low';
      default: return 'Unknown';
    }
  };

  // Table columns
  const columns: ColumnsType<Case> = [
    {
      title: 'Case Number',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
      fixed: 'left',
      width: 140,
      render: (text: string, record: Case) => (
        <Button 
          type="link" 
          onClick={() => router.push(`/cases/${record.id}`)}
          style={{ padding: 0 }}
        >
          {text || `#${record.id}`}
        </Button>
      )
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: {
        showTitle: false
      },
      render: (text: string) => (
        <Tooltip title={text || 'No title'}>
          <span>{text || 'No title'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority: number) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityLabel(priority)}
        </Tag>
      ),
      sorter: (a, b) => a.priority - b.priority
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      )
    },
    {
      title: 'SLA Status',
      key: 'slaStatus',
      width: 120,
      render: (_, record: Case) => {
        if (record?.slaBreached) {
          return <Tag color="red">BREACHED</Tag>;
        }
        
        if (!record?.slaDeadline) {
          return <Tag color="gray">NO SLA</Tag>;
        }
        
        const deadline = new Date(record.slaDeadline);
        const now = new Date();
        
        // Check for valid deadline
        if (isNaN(deadline.getTime())) {
          return <Tag color="gray">INVALID SLA</Tag>;
        }
        
        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursRemaining < 0) {
          return <Tag color="red">BREACHED</Tag>;
        } else if (hoursRemaining < 1) {
          return <Tag color="orange">DUE SOON</Tag>;
        }
        
        return <Tag color="green">ON TRACK</Tag>;
      }
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => {
        if (!date) return 'Unknown';
        const dateObj = new Date(date);
        return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString();
      },
      sorter: (a, b) => {
        const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record: Case) => (
        <Space>
          <Tooltip title="Assign Case">
            <Button
              icon={<UserOutlined />}
              size="small"
              onClick={() => handleAssignCase(record)}
            />
          </Tooltip>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/cases/${record.id}`)}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    onSelectAll: (selected: boolean, selectedRows: Case[], changeRows: Case[]) => {
      if (selected) {
        setSelectedRowKeys(unassignedCases.map(c => c.id));
      } else {
        setSelectedRowKeys([]);
      }
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            Unassigned Cases Queue
          </Title>
          <Text type="secondary">
            These cases require manual assignment to users or teams
          </Text>
        </Col>
      </Row>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="Total Unassigned" value={stats.total} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic 
              title="Critical Cases" 
              value={stats.critical} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic 
              title="High Priority" 
              value={stats.high}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic 
              title="SLA Breached" 
              value={stats.slaBreached}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert Banner */}
      {stats.total > 0 && (
        <Alert
          message={`${stats.total} unassigned cases require immediate attention`}
          description={
            stats.slaBreached > 0 
              ? `${stats.slaBreached} cases have breached SLA and need urgent assignment`
              : undefined
          }
          type={stats.slaBreached > 0 ? "error" : "warning"}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Filters and Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={18}>
          <Space wrap>
            <Select
              placeholder="Filter by Severity"
              style={{ width: 150 }}
              allowClear
              value={filters.severity || undefined}
              onChange={(value) => setFilters(prev => ({ ...prev, severity: value || '' }))}
            >
              <Option value="CRITICAL">Critical</Option>
              <Option value="HIGH">High</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="LOW">Low</Option>
            </Select>

            <Select
              placeholder="Filter by Priority"
              style={{ width: 150 }}
              allowClear
              value={filters.priority || undefined}
              onChange={(value) => setFilters(prev => ({ ...prev, priority: value || '' }))}
            >
              <Option value="1">P1 - Urgent</Option>
              <Option value="2">P2 - High</Option>
              <Option value="3">P3 - Medium</Option>
              <Option value="4">P4 - Low</Option>
            </Select>

            <Input.Search
              placeholder="Search cases..."
              style={{ width: 200 }}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onSearch={() => loadUnassignedCases()}
              allowClear
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={loadUnassignedCases}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
        <Col xs={24} lg={6}>
          <Space style={{ float: 'right' }}>
            <Badge count={selectedRowKeys.length} showZero>
              <Button
                icon={<SelectOutlined />}
                onClick={handleBulkAssign}
                disabled={selectedRowKeys.length === 0}
              >
                Bulk Assign
              </Button>
            </Badge>
          </Space>
        </Col>
      </Row>

      {/* Cases Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={unassignedCases}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 25,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} unassigned cases`
          }}
        />
      </Card>

      {/* Assignment Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            {assignmentModal.isBulk 
              ? `Assign ${assignmentModal.selectedCases.length} Cases`
              : 'Assign Case'
            }
          </Space>
        }
        open={assignmentModal.visible}
        onCancel={() => setAssignmentModal({ visible: false, selectedCases: [], isBulk: false })}
        onOk={() => form.submit()}
        confirmLoading={assignmentLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAssignmentSubmit}
        >
          {/* Case Details */}
          {!assignmentModal.isBulk && assignmentModal.selectedCases.length > 0 && (
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Case" span={3}>
                {assignmentModal.selectedCases[0]?.caseNumber || 'Unknown Case'}
              </Descriptions.Item>
              <Descriptions.Item label="Title" span={3}>
                {assignmentModal.selectedCases[0]?.title || 'No title'}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={getPriorityColor(assignmentModal.selectedCases[0]?.priority || 4)}>
                  {getPriorityLabel(assignmentModal.selectedCases[0]?.priority || 4)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Severity">
                <Tag color={getSeverityColor(assignmentModal.selectedCases[0]?.severity || 'LOW')}>
                  {assignmentModal.selectedCases[0]?.severity || 'LOW'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* Bulk Assignment Summary */}
          {assignmentModal.isBulk && (
            <Alert
              message={`Assigning ${assignmentModal.selectedCases.length} cases`}
              description="All selected cases will be assigned to the chosen user"
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Assignment Form */}
          <Form.Item
            name="assignToUser"
            label="Assign to User"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select
              placeholder="Select a user"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)
                  ?.toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {users.filter(user => user && user.id != null).map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <UserOutlined />
                    {user.fullName  || user.username || 'Unnamed User'} ({user.username || user.email || 'No ID'})
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Assignment Notes"
          >
            <Input.TextArea
              rows={3}
              placeholder="Optional notes about this assignment..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}