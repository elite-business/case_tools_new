'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, Permission } from '@/lib/rbac';
import { AdminOnly, useRolePermissions } from '@/components/auth/RoleGuard';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
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
  Badge
} from 'antd';
import { 
  UserAddOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api-client';
import type { User } from '@/lib/types';
import dayjs from 'dayjs';

interface CreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  password: string;
  isActive: boolean;
}

interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

const { Option } = Select;

export default function UsersPage() {
  const router = useRouter();
  const { hasPermission } = useRolePermissions();
  
  // Check permissions
  const permissions = {
    create: hasPermission(Permission.CREATE_USERS),
    edit: hasPermission(Permission.EDIT_USERS),
    delete: hasPermission(Permission.DELETE_USERS),
    view: hasPermission(Permission.VIEW_USERS),
  };
  
  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const queryClient = useQueryClient();
  
  // Redirect if no view permission
  if (!permissions.view) {
    router.push('/unauthorized');
    return null;
  }
  
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<boolean | undefined>();

  // Fetch users
  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users', { search: searchText, role: filterRole, status: filterStatus }],
    queryFn: () => usersApi.getAll({
      search: searchText || undefined,
      role: filterRole,
      status: filterStatus,
    }),
  });

  const users = usersResponse?.data?.content || [];
  const totalUsers = usersResponse?.data?.totalElements || 0;

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) => usersApi.create(userData),
    onSuccess: () => {
      message.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) => 
      usersApi.update(id, data),
    onSuccess: () => {
      message.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalVisible(false);
      setSelectedUser(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      message.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => 
      usersApi.resetPassword(id, newPassword),
    onSuccess: () => {
      message.success('Password reset successfully');
      setIsResetPasswordModalVisible(false);
      setSelectedUser(null);
      resetPasswordForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  const handleCreateUser = (values: CreateUserRequest) => {
    createUserMutation.mutate(values);
  };

  const handleUpdateUser = (values: UpdateUserRequest) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data: values });
    }
  };

  const handleDeleteUser = (id: number) => {
    deleteUserMutation.mutate(id);
  };

  const handleResetPassword = (values: { newPassword: string; confirmPassword: string }) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({
        id: selectedUser.id,
        newPassword: values.newPassword,
      });
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    });
    setIsEditModalVisible(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordModalVisible(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'red';
      case 'MANAGER': return 'blue';
      case 'ANALYST': return 'green';
      case 'VIEWER': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: User) => (
        <div>
          <div className="font-medium">{record.fullName || record.username || 'Unnamed User'}</div>
          <div className="text-sm text-gray-500">@{record.username || 'no-username'}</div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => email || 'No email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role || 'VIEWER')}>{role || 'VIEWER'}</Tag>
      ),
      filters: [
        { text: 'Admin', value: 'ADMIN' },
        { text: 'Manager', value: 'MANAGER' },
        { text: 'Analyst', value: 'ANALYST' },
        { text: 'Viewer', value: 'VIEWER' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department: string) => department || '-',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge 
          status={isActive !== false ? 'success' : 'error'} 
          text={isActive !== false ? 'Active' : 'Inactive'} 
        />
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: any, record: User) => record.isActive === value,
    },
    {
      title: 'Last Login',
      key: 'lastLogin',
      render: (_: any, record: User) => {
        if (!record.updatedAt) return '-';
        return (
          <div className="text-sm">
            {dayjs(record.updatedAt).format('MMM DD, YYYY HH:mm')}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => openResetPasswordModal(record)}
          >
            Reset Password
          </Button>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
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
  const activeUsers = users.filter((user: any) => user.isActive).length;
  const adminUsers = users.filter((user: any) => user.role === 'ADMIN').length;
  const recentUsers = users.filter((user: any) => 
    dayjs().diff(dayjs(user.createdAt), 'days') <= 7
  ).length;

  return (
    <PageContainer
      header={{
        title: 'User Management',
        subTitle: 'Manage system users and their permissions',
      }}
    >
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={activeUsers}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Administrators"
              value={adminUsers}
              valueStyle={{ color: '#cf1322' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="New This Week"
              value={recentUsers}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Filters and Actions */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Search users..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filter by role"
                value={filterRole}
                onChange={setFilterRole}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="ADMIN">Admin</Option>
                <Option value="MANAGER">Manager</Option>
                <Option value="ANALYST">Analyst</Option>
                <Option value="VIEWER">Viewer</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filter by status"
                value={filterStatus}
                onChange={setFilterStatus}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  Create User
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Users Table */}
        <Table
          columns={columns}
          dataSource={users}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: totalUsers,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} users`,
          }}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Create New User"
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
          onFinish={handleCreateUser}
          initialValues={{ isActive: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: 'Please enter username' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                ]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' },
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="ADMIN">Administrator</Option>
                  <Option value="MANAGER">Manager</Option>
                  <Option value="ANALYST">Analyst</Option>
                  <Option value="VIEWER">Viewer</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department">
                <Input placeholder="Enter department (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Enter password" />
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
                loading={createUserMutation.isPending}
              >
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: 'Please enter username' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                ]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' },
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="ADMIN">Administrator</Option>
                  <Option value="MANAGER">Manager</Option>
                  <Option value="ANALYST">Analyst</Option>
                  <Option value="VIEWER">Viewer</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department">
                <Input placeholder="Enter department (optional)" />
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
                  setSelectedUser(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateUserMutation.isPending}
              >
                Update User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password for ${selectedUser?.fullName}`}
        open={isResetPasswordModalVisible}
        onCancel={() => {
          setIsResetPasswordModalVisible(false);
          setSelectedUser(null);
          resetPasswordForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsResetPasswordModalVisible(false);
                  setSelectedUser(null);
                  resetPasswordForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetPasswordMutation.isPending}
              >
                Reset Password
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}