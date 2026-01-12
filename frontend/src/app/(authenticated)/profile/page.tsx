'use client';

import React, { useState, useEffect } from 'react';
import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Row,
  Col,
  Card,
  Avatar,
  Typography,
  Descriptions,
  Button,
  Space,
  Form,
  Input,
  Select,
  Switch,
  message,
  Alert,
  Divider,
  Tag,
  Upload,
  Modal,
  Tabs,
  List,
  Badge,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  LockOutlined,
  BellOutlined,
  SettingOutlined,
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TeamOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, usersApi, handleApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

interface NotificationSettings {
  emailAlerts: boolean;
  browserNotifications: boolean;
  smsAlerts: boolean;
  weeklyDigest: boolean;
  assignmentNotifications: boolean;
  statusChangeNotifications: boolean;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch user profile
  const { data: profileData } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => authApi.me(),
    enabled: !!user,
  });

  // Fetch user activity logs
  const { data: activityLogs } = useQuery({
    queryKey: ['user', 'activity'],
    queryFn: () => usersApi.getUserActivity?.(user?.id || 0) || Promise.resolve({ data: [] }),
    enabled: !!user?.id,
  });
  const activityItems = activityLogs?.data ?? [];

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => 
      authApi.changePassword(data.oldPassword, data.newPassword, data.confirmPassword),
    onSuccess: () => {
      message.success('Password changed successfully');
      passwordForm.resetFields();
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdateRequest) => 
      usersApi.update(user?.id || 0, data),
    onSuccess: () => {
      message.success('Profile updated successfully');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const userProfile = profileData?.data || user;

  useEffect(() => {
    if (userProfile && editing) {
      profileForm.setFieldsValue({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        department: userProfile.department,
        phone: userProfile.phone,
        bio: userProfile.bio,
        timezone: userProfile.timezone || 'America/New_York',
        language: userProfile.language || 'en',
      });
    }
  }, [userProfile, editing, profileForm]);

  const handleProfileSave = async () => {
    try {
      const values = await profileForm.validateFields();
      updateProfileMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePasswordChange = async () => {
    try {
      const values = await passwordForm.validateFields();
      changePasswordMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleNotificationSave = async () => {
    try {
      const values = await notificationForm.validateFields();
      // Update notification preferences
      message.success('Notification settings updated');
    } catch (error) {
      console.error('Validation failed:', error);
    }
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

  const profileActions = [
    <Button
      key="edit"
      icon={<EditOutlined />}
      onClick={() => setEditing(true)}
      disabled={editing}
    >
      Edit Profile
    </Button>,
  ];

  if (editing) {
    profileActions.splice(0, 1, 
      <Button key="cancel" onClick={() => setEditing(false)}>
        Cancel
      </Button>,
      <Button 
        key="save"
        type="primary"
        icon={<SaveOutlined />}
        loading={updateProfileMutation.isPending}
        onClick={handleProfileSave}
      >
        Save Changes
      </Button>
    );
  }

  return (
    <PageContainer
      title="User Profile"
      subTitle="Manage your account settings and preferences"
      extra={profileActions}
    >
      <Row gutter={[16, 16]}>
        {/* Profile Header */}
        <Col span={24}>
          <Card>
            <Row align="middle" gutter={24}>
              <Col>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    size={100} 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  {editing && (
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<CameraOutlined />}
                      size="small"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                      }}
                      onClick={() => message.info('Avatar upload to be implemented')}
                    />
                  )}
                </div>
              </Col>
              <Col flex={1}>
                <Space direction="vertical" size={0}>
                  <Title level={3} style={{ margin: 0 }}>
                    {userProfile?.firstName ? 
                      `${userProfile.firstName} ${userProfile.lastName}` : 
                      userProfile?.username
                    }
                  </Title>
                  <Space>
                    <Tag color={getRoleColor(userProfile?.role || '')}>{userProfile?.role}</Tag>
                    <Badge 
                      status={userProfile?.isActive ? 'success' : 'error'} 
                      text={userProfile?.isActive ? 'Active' : 'Inactive'} 
                    />
                  </Space>
                  <Text type="secondary">@{userProfile?.username}</Text>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" align="end">
                  <Text type="secondary">Member since</Text>
                  <Text strong>
                    {userProfile?.createdAt ? 
                      dayjs(userProfile.createdAt).format('MMMM YYYY') : 
                      'Unknown'
                    }
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Main Content */}
        <Col span={24}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="Profile Information" key="profile" icon={<UserOutlined />}>
                {editing ? (
                  <Form form={profileForm} layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          label="First Name" 
                          name="firstName"
                          rules={[{ required: true, message: 'First name is required' }]}
                        >
                          <Input placeholder="Enter first name" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          label="Last Name" 
                          name="lastName"
                          rules={[{ required: true, message: 'Last name is required' }]}
                        >
                          <Input placeholder="Enter last name" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          label="Email" 
                          name="email"
                          rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Invalid email format' }
                          ]}
                        >
                          <Input prefix={<MailOutlined />} placeholder="Enter email" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Phone" name="phone">
                          <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Department" name="department">
                          <Input prefix={<TeamOutlined />} placeholder="Enter department" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          label="Timezone" 
                          name="timezone"
                        >
                          <Select placeholder="Select timezone">
                            <Select.Option value="America/New_York">Eastern Time</Select.Option>
                            <Select.Option value="America/Chicago">Central Time</Select.Option>
                            <Select.Option value="America/Denver">Mountain Time</Select.Option>
                            <Select.Option value="America/Los_Angeles">Pacific Time</Select.Option>
                            <Select.Option value="Europe/London">GMT</Select.Option>
                            <Select.Option value="Europe/Paris">CET</Select.Option>
                            <Select.Option value="Asia/Tokyo">JST</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label="Bio" name="bio">
                      <Input.TextArea 
                        rows={4} 
                        placeholder="Tell us about yourself..."
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>
                  </Form>
                ) : (
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="Full Name">
                      {userProfile?.firstName ? 
                        `${userProfile.firstName} ${userProfile.lastName}` : 
                        'Not specified'
                      }
                    </Descriptions.Item>
                    <Descriptions.Item label="Username">
                      @{userProfile?.username}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email" span={2}>
                      <Space>
                        <MailOutlined />
                        {userProfile?.email}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {userProfile?.phone ? (
                        <Space>
                          <PhoneOutlined />
                          {userProfile.phone}
                        </Space>
                      ) : (
                        'Not specified'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Department">
                      {userProfile?.department ? (
                        <Space>
                          <TeamOutlined />
                          {userProfile.department}
                        </Space>
                      ) : (
                        'Not specified'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Role">
                      <Tag color={getRoleColor(userProfile?.role || '')}>{userProfile?.role}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Badge 
                        status={userProfile?.isActive ? 'success' : 'error'} 
                        text={userProfile?.isActive ? 'Active' : 'Inactive'} 
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Member Since">
                      <Space>
                        <CalendarOutlined />
                        {userProfile?.createdAt ? 
                          dayjs(userProfile.createdAt).format('MMMM D, YYYY') : 
                          'Unknown'
                        }
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Login">
                      <Space>
                        <CalendarOutlined />
                        {userProfile?.lastLogin ? 
                          dayjs(userProfile.lastLogin).format('MMMM D, YYYY [at] h:mm A') : 
                          'Never'
                        }
                      </Space>
                    </Descriptions.Item>
                    {userProfile?.bio && (
                      <Descriptions.Item label="Bio" span={2}>
                        <Paragraph>{userProfile.bio}</Paragraph>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                )}
              </TabPane>

              <TabPane tab="Security" key="security" icon={<LockOutlined />}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <ProCard title="Change Password" headerBordered>
                      <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
                        <Form.Item
                          label="Current Password"
                          name="oldPassword"
                          rules={[{ required: true, message: 'Current password is required' }]}
                        >
                          <Input.Password placeholder="Enter current password" />
                        </Form.Item>
                        
                        <Form.Item
                          label="New Password"
                          name="newPassword"
                          rules={[
                            { required: true, message: 'New password is required' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                            {
                              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                              message: 'Password must contain uppercase, lowercase, and number'
                            }
                          ]}
                        >
                          <Input.Password placeholder="Enter new password" />
                        </Form.Item>
                        
                        <Form.Item
                          label="Confirm New Password"
                          name="confirmPassword"
                          dependencies={['newPassword']}
                          rules={[
                            { required: true, message: 'Please confirm your password' },
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

                        <Form.Item>
                          <Button 
                            type="primary" 
                            htmlType="submit"
                            icon={<LockOutlined />}
                            loading={changePasswordMutation.isPending}
                            block
                          >
                            Change Password
                          </Button>
                        </Form.Item>
                      </Form>
                    </ProCard>
                  </Col>
                  
                  <Col span={12}>
                    <ProCard title="Security Information" headerBordered>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Alert
                          message="Password Security Tips"
                          description={
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              <li>Use a strong, unique password</li>
                              <li>Include uppercase, lowercase, numbers, and symbols</li>
                              <li>Avoid using personal information</li>
                              <li>Change your password regularly</li>
                            </ul>
                          }
                          type="info"
                          showIcon
                        />
                        
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Password Last Changed">
                            {userProfile?.updatedAt ? 
                              dayjs(userProfile.updatedAt).format('MMMM D, YYYY') : 
                              'Unknown'
                            }
                          </Descriptions.Item>
                          <Descriptions.Item label="Account Created">
                            {userProfile?.createdAt ? 
                              dayjs(userProfile.createdAt).format('MMMM D, YYYY') : 
                              'Unknown'
                            }
                          </Descriptions.Item>
                        </Descriptions>
                      </Space>
                    </ProCard>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="Notifications" key="notifications" icon={<BellOutlined />}>
                <ProCard title="Notification Preferences" headerBordered>
                  <Form 
                    form={notificationForm} 
                    layout="vertical" 
                    onFinish={handleNotificationSave}
                    initialValues={{
                      emailAlerts: true,
                      browserNotifications: true,
                      smsAlerts: false,
                      weeklyDigest: true,
                      assignmentNotifications: true,
                      statusChangeNotifications: true,
                    }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Form.Item label="Alert Notifications">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Form.Item name="emailAlerts" valuePropName="checked" style={{ marginBottom: 8 }}>
                              <Switch checkedChildren="Email Alerts" unCheckedChildren="No Email" />
                            </Form.Item>
                            <Form.Item name="browserNotifications" valuePropName="checked" style={{ marginBottom: 8 }}>
                              <Switch checkedChildren="Browser Notifications" unCheckedChildren="No Browser" />
                            </Form.Item>
                            <Form.Item name="smsAlerts" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Switch checkedChildren="SMS Alerts" unCheckedChildren="No SMS" />
                            </Form.Item>
                          </Space>
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item label="System Notifications">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Form.Item name="assignmentNotifications" valuePropName="checked" style={{ marginBottom: 8 }}>
                              <Switch checkedChildren="Assignment Updates" unCheckedChildren="No Assignments" />
                            </Form.Item>
                            <Form.Item name="statusChangeNotifications" valuePropName="checked" style={{ marginBottom: 8 }}>
                              <Switch checkedChildren="Status Changes" unCheckedChildren="No Status Updates" />
                            </Form.Item>
                            <Form.Item name="weeklyDigest" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Switch checkedChildren="Weekly Digest" unCheckedChildren="No Digest" />
                            </Form.Item>
                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider />

                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                        Save Notification Settings
                      </Button>
                    </Form.Item>
                  </Form>
                </ProCard>
              </TabPane>

              <TabPane tab="Activity Log" key="activity" icon={<SecurityScanOutlined />}>
                <ProCard title="Recent Activity" headerBordered>
                  {activityItems.length > 0 ? (
                    <List
                      dataSource={activityItems}
                      renderItem={(activity: any) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar icon={<CalendarOutlined />} />}
                            title={activity.action}
                            description={
                              <Space direction="vertical" size={0}>
                                <Text>{activity.description}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(activity.timestamp).format('MMMM D, YYYY [at] h:mm A')}
                                </Text>
                              </Space>
                            }
                          />
                          <Tag color="blue">{activity.type}</Tag>
                        </List.Item>
                      )}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: false,
                      }}
                    />
                  ) : (
                    <Alert
                      message="No Activity Found"
                      description="Your recent activity will appear here"
                      type="info"
                      showIcon
                    />
                  )}
                </ProCard>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
