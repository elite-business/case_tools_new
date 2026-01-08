'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Permission } from '@/lib/rbac';
import { RoleGuard, useRolePermissions } from '@/components/auth/RoleGuard';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  message, 
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Avatar,
  Descriptions,
  Progress
} from 'antd';
import { 
  TeamOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi, usersApi } from '@/lib/api-client';
import type { Team, User, CreateTeamRequest, UpdateTeamRequest, TeamMemberRequest } from '@/lib/types';

const { Option } = Select;

export default function TeamsPage() {
  const router = useRouter();
  const { hasPermission } = useRolePermissions();
  
  // Check permissions
  const permissions = {
    view: hasPermission(Permission.VIEW_TEAMS),
    create: hasPermission(Permission.CREATE_TEAMS),
    edit: hasPermission(Permission.EDIT_TEAMS),
    delete: hasPermission(Permission.DELETE_TEAMS),
    manageMembers: hasPermission(Permission.MANAGE_TEAM_MEMBERS),
  };
  
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();
  const queryClient = useQueryClient();
  
  // Redirect if no view permission
  if (!permissions.view) {
    router.push('/unauthorized');
    return null;
  }
  
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [isTeamDetailsVisible, setIsTeamDetailsVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchText, setSearchText] = useState('');

  // Fetch teams
  const { data: teamsResponse, isLoading } = useQuery({
    queryKey: ['teams', { search: searchText }],
    queryFn: () => teamsApi.getAll({ search: searchText || undefined }),
  });

  // Fetch all active users for team creation (no permission restriction)
  const { data: usersResponse } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => usersApi.getActiveUsers(),
  });

  const teams = teamsResponse?.data?.content || [];
  const availableUsers = usersResponse?.data || [];

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (teamData: CreateTeamRequest) => teamsApi.create(teamData),
    onSuccess: () => {
      message.success('Team created successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create team');
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamRequest }) => 
      teamsApi.update(id, data),
    onSuccess: () => {
      message.success('Team updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsEditModalVisible(false);
      setSelectedTeam(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update team');
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => teamsApi.delete(id),
    onSuccess: () => {
      message.success('Team deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete team');
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: number; userId: number; role?: string }) => 
      teamsApi.addMember(teamId, userId, role),
    onSuccess: () => {
      message.success('Member added successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsMemberModalVisible(false);
      memberForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to add member');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) => 
      teamsApi.removeMember(teamId, userId),
    onSuccess: () => {
      message.success('Member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to remove member');
    },
  });

  const handleCreateTeam = (values: any) => {
    const teamData: CreateTeamRequest = {
      name: values.name,
      description: values.description,
      leadId: values.leadId,
      memberIds: values.memberIds || [],
      department: values.department,
      isActive: values.isActive !== false,
    };
    createTeamMutation.mutate(teamData);
  };

  const handleUpdateTeam = (values: any) => {
    if (selectedTeam) {
      const updateData: UpdateTeamRequest = {
        name: values.name,
        description: values.description,
        leadId: values.leadId,
        department: values.department,
        isActive: values.isActive,
      };
      updateTeamMutation.mutate({ id: selectedTeam.id, data: updateData });
    }
  };

  const handleDeleteTeam = (id: number) => {
    deleteTeamMutation.mutate(id);
  };

  const handleAddMember = (values: any) => {
    if (selectedTeam) {
      addMemberMutation.mutate({
        teamId: selectedTeam.id,
        userId: values.userId,
        role: values.role,
      });
    }
  };

  const handleRemoveMember = (teamId: number, userId: number) => {
    removeMemberMutation.mutate({ teamId, userId });
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    form.setFieldsValue({
      name: team.name,
      description: team.description,
      leadId: team.lead?.id,
      department: team.department,
      isActive: team.isActive,
    });
    setIsEditModalVisible(true);
  };

  const openMemberModal = (team: Team) => {
    setSelectedTeam(team);
    setIsMemberModalVisible(true);
  };

  const openTeamDetails = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDetailsVisible(true);
  };

  const getTeamMembersExceptLead = (team: Team) => {
    return (team.members || []).filter(member => member.id !== team.lead?.id);
  };

  const columns = [
    {
      title: 'Team',
      key: 'team',
      render: (_, record: Team) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">{record.description || 'No description'}</div>
        </div>
      ),
    },
    {
      title: 'Team Lead',
      key: 'lead',
      render: (_, record: Team) => {
        if (!record.lead) {
          return <span className="text-gray-400">No lead assigned</span>;
        }
        return (
          <div className="flex items-center space-x-2">
            <Avatar size="small" icon={<UserAddOutlined />} />
            <div>
              <div className="text-sm font-medium">{record.lead.fullName}</div>
              <div className="text-xs text-gray-500">@{record.lead.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Members',
      key: 'members',
      render: (_, record: Team) => (
        <div>
          <div className="text-sm font-medium">{record.members?.length || 0} members</div>
          <Avatar.Group size="small" maxCount={4}>
            {(record.members || []).map(member => (
              <Avatar key={member.id} size="small">
                {member.fullName?.split(' ').map(n => n[0]).join('') || member.username?.[0] || '?'}
              </Avatar>
            ))}
          </Avatar.Group>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department: string) => department || '-',
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (_, record: Team) => {
        const performance = record.performance;
        if (!performance) {
          return <span className="text-gray-400">No data</span>;
        }
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Cases: {performance.resolvedCases}/{performance.totalCases}</span>
              <span>{performance.totalCases > 0 ? 
                Math.round((performance.resolvedCases / performance.totalCases) * 100) : 0}%</span>
            </div>
            <Progress 
              percent={performance.totalCases > 0 ? 
                Math.round((performance.resolvedCases / performance.totalCases) * 100) : 0}
              size="small" 
              showInfo={false}
            />
            <div className="text-xs text-gray-500">
              SLA: {Math.round(performance.slaCompliance)}%
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? 'Active' : 'Inactive'} 
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Team) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => openTeamDetails(record)}
          >
            Details
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => openMemberModal(record)}
          >
            Add Member
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Team"
            description="Are you sure you want to delete this team?"
            onConfirm={() => handleDeleteTeam(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Calculate statistics
  const totalTeams = teams.length;
  const activeTeams = teams.filter(team => team.isActive).length;
  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const avgTeamSize = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0;

  return (
    <PageContainer
      header={{
        title: 'Team Management',
        subTitle: 'Manage teams and their performance',
      }}
    >
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Teams"
              value={totalTeams}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Teams"
              value={activeTeams}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Members"
              value={totalMembers}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Team Size"
              value={avgTeamSize}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Filters and Actions */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Input
                placeholder="Search teams..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['teams'] })}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  Create Team
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Teams Table */}
        <Table
          columns={columns}
          dataSource={teams}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} teams`,
          }}
        />
      </Card>

      {/* Create Team Modal */}
      <Modal
        title="Create New Team"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTeam}
          initialValues={{ isActive: true }}
        >
          <Form.Item
            label="Team Name"
            name="name"
            rules={[{ required: true, message: 'Please enter team name' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="Enter team description (optional)" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Team Lead" name="leadId">
                <Select placeholder="Select team lead (optional)" allowClear>
                  {availableUsers.map((user: User) => (
                    <Option key={user.id} value={user.id}>
                      {user.fullName} (@{user.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department">
                <Input placeholder="Enter department (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Team Members" name="memberIds">
            <Select 
              mode="multiple" 
              placeholder="Select team members (optional)" 
              allowClear
            >
              {availableUsers.map((user: User) => (
                <Option key={user.id} value={user.id}>
                  {user.fullName} (@{user.username})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsCreateModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createTeamMutation.isPending}
              >
                Create Team
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        title="Edit Team"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedTeam(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateTeam}
        >
          <Form.Item
            label="Team Name"
            name="name"
            rules={[{ required: true, message: 'Please enter team name' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="Enter team description" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Team Lead" name="leadId">
                <Select placeholder="Select team lead" allowClear>
                  {availableUsers.map((user: User) => (
                    <Option key={user.id} value={user.id}>
                      {user.fullName} (@{user.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department">
                <Input placeholder="Enter department" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalVisible(false);
                  setSelectedTeam(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateTeamMutation.isPending}
              >
                Update Team
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        title={`Add Member to ${selectedTeam?.name}`}
        open={isMemberModalVisible}
        onCancel={() => {
          setIsMemberModalVisible(false);
          setSelectedTeam(null);
          memberForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={memberForm}
          layout="vertical"
          onFinish={handleAddMember}
        >
          <Form.Item
            label="User"
            name="userId"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select placeholder="Select user to add">
              {availableUsers
                .filter(user => !(selectedTeam?.members || []).some(member => member.id === user.id))
                .map((user: User) => (
                <Option key={user.id} value={user.id}>
                  {user.fullName} (@{user.username})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Role" name="role">
            <Select placeholder="Select role (optional)">
              <Option value="MEMBER">Member</Option>
              <Option value="LEAD">Lead</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsMemberModalVisible(false);
                  setSelectedTeam(null);
                  memberForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={addMemberMutation.isPending}
              >
                Add Member
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Team Details Modal */}
      <Modal
        title={`Team Details - ${selectedTeam?.name}`}
        open={isTeamDetailsVisible}
        onCancel={() => {
          setIsTeamDetailsVisible(false);
          setSelectedTeam(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsTeamDetailsVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedTeam && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Team Name">{selectedTeam.name}</Descriptions.Item>
              <Descriptions.Item label="Department">{selectedTeam.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={selectedTeam.isActive ? 'success' : 'error'} 
                  text={selectedTeam.isActive ? 'Active' : 'Inactive'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(selectedTeam.createdAt).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedTeam.description || 'No description provided'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>Team Members ({selectedTeam.members?.length || 0})</h4>
              <Table
                size="small"
                columns={[
                  {
                    title: 'Name',
                    render: (_, user: User) => (
                      <div className="flex items-center space-x-2">
                        <Avatar size="small">
                          {user.fullName?.split(' ').map(n => n[0]).join('') || user.username?.[0] || '?'}
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </div>
                        {user.id === selectedTeam.lead?.id && (
                          <Badge count="Lead" style={{ backgroundColor: '#52c41a' }} />
                        )}
                      </div>
                    ),
                  },
                  {
                    title: 'Email',
                    dataIndex: 'email',
                  },
                  {
                    title: 'Role',
                    dataIndex: 'role',
                  },
                  {
                    title: 'Actions',
                    render: (_, user: User) => (
                      <Popconfirm
                        title="Remove Member"
                        description="Are you sure you want to remove this member from the team?"
                        onConfirm={() => handleRemoveMember(selectedTeam.id, user.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<UserDeleteOutlined />}
                        >
                          Remove
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]}
                dataSource={selectedTeam.members || []}
                rowKey="id"
                pagination={false}
              />
            </div>

            {selectedTeam.performance && (
              <div style={{ marginTop: 24 }}>
                <h4>Performance Metrics</h4>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="Total Cases" value={selectedTeam.performance.totalCases} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Resolved Cases" value={selectedTeam.performance.resolvedCases} />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="Avg Resolution Time" 
                      value={selectedTeam.performance.avgResolutionTime} 
                      suffix="hrs"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="SLA Compliance" 
                      value={selectedTeam.performance.slaCompliance} 
                      suffix="%"
                    />
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}