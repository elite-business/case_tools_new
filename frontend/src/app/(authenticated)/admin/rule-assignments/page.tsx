'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  Switch,
  message,
  Dropdown,
  Badge,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Alert,
  Divider,
  Avatar,
  List,
  Empty,
  Spin,
} from 'antd';
import {
  UserAddOutlined,
  TeamOutlined,
  SettingOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ruleAssignmentApi as ruleAssignmentsApi, usersApi, teamsApi, grafanaApi } from '@/lib/api-client';
import type { 
  RuleAssignment, 
  AssignRuleRequest,
  User,
  Team,
  RuleAssignmentSeverity,
  RuleAssignmentCategory,
  AssignmentStrategy 
} from '@/lib/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function RuleAssignmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [selectedRule, setSelectedRule] = useState<RuleAssignment | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [assignForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch rule assignments
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch } = useQuery({
    queryKey: ['rule-assignments', searchTerm, filterActive],
    queryFn: () => ruleAssignmentsApi.getRuleAssignments({
      search: searchTerm || undefined,
      active: filterActive,
      page: 0,
      size: 100,
    }),
  });

  // Fetch assignment statistics
  const { data: statsData } = useQuery({
    queryKey: ['rule-assignment-stats'],
    queryFn: () => ruleAssignmentsApi.getStatistics(),
  });

  // Fetch users and teams for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll(),
  });

  // Mutations
  const syncMutation = useMutation({
    mutationFn: () => ruleAssignmentsApi.syncFromGrafana(),
    onSuccess: (data:any) => {
      message.success(`Synced ${data.synced} rules from Grafana`);
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['rule-assignment-stats'] });
    },
    onError: (error: any) => {
      message.error(`Sync failed: ${error.message}`);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: AssignRuleRequest }) =>
      ruleAssignmentsApi.assignUsersAndTeams(uid, data),
    onSuccess: () => {
      message.success('Assignments updated successfully');
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
      setAssignModalVisible(false);
      assignForm.resetFields();
    },
    onError: (error: any) => {
      message.error(`Assignment failed: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) =>
      ruleAssignmentsApi.createOrUpdateRuleAssignment(uid, data),
    onSuccess: () => {
      message.success('Rule assignment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
      setEditModalVisible(false);
      editForm.resetFields();
    },
    onError: (error: any) => {
      message.error(`Update failed: ${error.message}`);
    },
  });

  const toggleStatusMutation = useMutation({
    // mutationFn: ({ uid, active }: { uid: string; active: boolean }) =>
    //   ruleAssignmentsApi.toggleRuleStatus(uid, active),
    onSuccess: () => {
      message.success('Rule status updated');
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
    },
    onError: (error: any) => {
      message.error(`Status update failed: ${error.message}`);
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: { userIds?: number[]; teamIds?: number[] } }) =>
      ruleAssignmentsApi.removeAssignments(uid, data),
    onSuccess: () => {
      message.success('Assignment removed');
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
    },
    onError: (error: any) => {
      message.error(`Removal failed: ${error.message}`);
    },
  });

  const handleAssignRule = (rule: RuleAssignment) => {
    setSelectedRule(rule);
    assignForm.setFieldsValue({
      userIds: rule.assignedUsers.map(u => u.id),
      teamIds: rule.assignedTeams.map(t => t.id),
      assignmentStrategy: rule.assignmentStrategy,
      autoAssignEnabled: rule.autoAssignEnabled,
    });
    setAssignModalVisible(true);
  };

  const handleEditRule = (rule: RuleAssignment) => {
    setSelectedRule(rule);
    editForm.setFieldsValue({
      description: rule.description,
      severity: rule.severity,
      category: rule.category,
      active: rule.active,
    });
    setEditModalVisible(true);
  };

  const handleAssignSubmit = async (values: AssignRuleRequest) => {
    if (selectedRule) {
      await assignMutation.mutateAsync({
        uid: selectedRule.grafanaRuleUid,
        data: values,
      });
    }
  };

  const handleEditSubmit = async (values: any) => {
    if (selectedRule) {
      await updateMutation.mutateAsync({
        uid: selectedRule.grafanaRuleUid,
        data: {
          ...values,
          grafanaRuleName: selectedRule.grafanaRuleName,
        },
      });
    }
  };

  const getSeverityColor = (severity: RuleAssignmentSeverity) => {
    const colors = {
      CRITICAL: 'red',
      HIGH: 'orange',
      MEDIUM: 'blue',
      LOW: 'green',
    };
    return colors[severity] || 'default';
  };

  const getCategoryIcon = (category: RuleAssignmentCategory) => {
    const icons = {
      REVENUE_LOSS: '💰',
      NETWORK_ISSUE: '🌐',
      QUALITY_ISSUE: '⚠️',
      FRAUD_ALERT: '🚨',
      OPERATIONAL: '⚙️',
      CUSTOM: '📋',
    };
    return icons[category] || '📋';
  };

  const getStrategyLabel = (strategy: AssignmentStrategy) => {
    const labels = {
      MANUAL: 'Manual',
      ROUND_ROBIN: 'Round Robin',
      LOAD_BASED: 'Load Based',
      TEAM_BASED: 'Team Based',
    };
    return labels[strategy] || strategy;
  };

  const columns = [
    {
      title: 'Rule Name',
      dataIndex: 'grafanaRuleName',
      key: 'ruleName',
      width: 250,
      render: (text: string, record: RuleAssignment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active: boolean, record: RuleAssignment) => (
        <Switch
          checked={active}
          onChange={(checked) => toggleStatusMutation.mutate({
            uid: record.grafanaRuleUid,
            active: checked,
          })}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: RuleAssignmentSeverity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (category: RuleAssignmentCategory) => (
        <Space>
          <span>{getCategoryIcon(category)}</span>
          <Text>{category.replace('_', ' ')}</Text>
        </Space>
      ),
    },
    {
      title: 'Assignment',
      key: 'assignment',
      width: 200,
      render: (_: any, record: RuleAssignment) => (
        <Space direction="vertical" size={4}>
          <Space>
            <Badge count={record.assignedUserCount} style={{ backgroundColor: '#52c41a' }}>
              <UserAddOutlined style={{ fontSize: 16 }} />
            </Badge>
            <Badge count={record.assignedTeamCount} style={{ backgroundColor: '#1890ff' }}>
              <TeamOutlined style={{ fontSize: 16 }} />
            </Badge>
          </Space>
          {record.autoAssignEnabled && (
            <Tag color="blue" style={{ fontSize: 11 }}>
              {getStrategyLabel(record.assignmentStrategy)}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      width: 250,
      render: (_: any, record: RuleAssignment) => (
        <Space direction="vertical" size={4}>
          {record.assignedUsers.length > 0 && (
            <Avatar.Group maxCount={3} size="small">
              {record.assignedUsers.map(user => (
                <Tooltip key={user.id} title={user.fullName}>
                  <Avatar style={{ backgroundColor: '#87d068' }}>
                    {user.fullName.charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          )}
          {record.assignedTeams.length > 0 && (
            <Space size={4}>
              {record.assignedTeams.map(team => (
                <Tag key={team.id} color="blue" style={{ fontSize: 11 }}>
                  {team.name}
                </Tag>
              ))}
            </Space>
          )}
          {record.assignedUsers.length === 0 && record.assignedTeams.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>Unassigned</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Statistics',
      key: 'stats',
      width: 150,
      render: (_: any, record: RuleAssignment) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>
            Cases: {record.openCaseCount || 0} open / {record.caseCount || 0} total
          </Text>
          {record.lastAlertAt && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Last: {dayjs(record.lastAlertAt).fromNow()}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: RuleAssignment) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'assign',
                label: 'Manage Assignments',
                icon: <UserAddOutlined />,
                onClick: () => handleAssignRule(record),
              },
              {
                key: 'edit',
                label: 'Edit Settings',
                icon: <EditOutlined />,
                onClick: () => handleEditRule(record),
              },
              { type: 'divider' },
              {
                key: 'view-grafana',
                label: 'View in Grafana',
                icon: <BellOutlined />,
                onClick: () => window.open(
                  `${process.env.NEXT_PUBLIC_GRAFANA_URL}/alerting/list`,
                  '_blank'
                ),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<SettingOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const assignments = assignmentsData?.content || [];
  const stats = statsData || {
    totalRules: 0,
    assignedRules: 0,
    unassignedRules: 0,
    activeRules: 0,
    totalUsers: 0,
    totalTeams: 0,
  };

  return (
    <PageContainer
      title="Grafana Rule Assignments"
      subTitle="Manage alert rule assignments to users and teams"
      extra={[
        <Button
          key="sync"
          icon={<SyncOutlined />}
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
        >
          Sync from Grafana
        </Button>,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>,
      ]}
    >
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Total Rules"
              value={stats.totalRules}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Assigned"
              value={stats.assignedRules}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Unassigned"
              value={stats.unassignedRules}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Active Rules"
              value={stats.activeRules}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Users"
              value={stats.totalUsers}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="Teams"
              value={stats.totalTeams}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Space size="middle" wrap>
          <Search
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={() => refetch()}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Filter by status"
            value={filterActive}
            onChange={setFilterActive}
            style={{ width: 150 }}
            allowClear
          >
            <Option value={true}>Active Only</Option>
            <Option value={false}>Inactive Only</Option>
          </Select>
        </Space>
      </Card>

      {/* Alert for unassigned rules */}
      {stats.unassignedRules > 0 && (
        <Alert
          message={`${stats.unassignedRules} rules are not assigned to any user or team`}
          description="Unassigned rules will not generate alerts for users. Click on a rule to assign it."
          type="warning"
          showIcon
          closable
          className="mb-4"
        />
      )}

      {/* Rules Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          loading={assignmentsLoading}
          pagination={{
            total: assignmentsData?.totalElements || 0,
            pageSize: assignmentsData?.size || 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} rules`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Assignment Modal */}
      <Modal
        title={`Manage Assignments: ${selectedRule?.grafanaRuleName}`}
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          assignForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userIds"
                label="Assigned Users"
              >
                <Select
                  mode="multiple"
                  placeholder="Select users"
                  optionFilterProp="children"
                  filterOption={(input, option: any) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {usersData?.data?.map((user: User) => (
                    <Option key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="teamIds"
                label="Assigned Teams"
              >
                <Select
                  mode="multiple"
                  placeholder="Select teams"
                  optionFilterProp="children"
                  filterOption={(input, option: any) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {teamsData?.data?.map((team: Team) => (
                    <Option key={team.id} value={team.id}>
                      {team.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignmentStrategy"
                label="Assignment Strategy"
              >
                <Select placeholder="Select strategy">
                  <Option value="MANUAL">Manual Assignment</Option>
                  <Option value="ROUND_ROBIN">Round Robin</Option>
                  <Option value="LOAD_BASED">Load Based</Option>
                  <Option value="TEAM_BASED">Team Based</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="autoAssignEnabled"
                label="Auto-Assignment"
                valuePropName="checked"
              >
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={assignMutation.isPending}>
                Update Assignments
              </Button>
              <Button onClick={() => setAssignModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Settings Modal */}
      <Modal
        title={`Edit Settings: ${selectedRule?.grafanaRuleName}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Enter rule description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="severity"
                label="Severity"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="CRITICAL">Critical</Option>
                  <Option value="HIGH">High</Option>
                  <Option value="MEDIUM">Medium</Option>
                  <Option value="LOW">Low</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="REVENUE_LOSS">Business Loss</Option>
                  <Option value="NETWORK_ISSUE">Network Issue</Option>
                  <Option value="QUALITY_ISSUE">Quality Issue</Option>
                  <Option value="FRAUD_ALERT">Fraud Alert</Option>
                  <Option value="OPERATIONAL">Operational</Option>
                  <Option value="CUSTOM">Custom</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="active"
            label="Status"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Settings
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
