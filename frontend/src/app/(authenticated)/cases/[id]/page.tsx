'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PageContainer, 
  ProCard,
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDateTimePicker,
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
  Descriptions,
  Timeline,
  Avatar,
  Form,
  Input,
  Card,
  Row,
  Col,
  Divider,
  Tooltip,
  Alert,
  Switch,
  Typography,
  Progress,
  Tabs,
  Steps,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TagOutlined,
  FlagOutlined,
  MoreOutlined,
  SendOutlined,
  LockOutlined,
  UnlockOutlined,
  HistoryOutlined,
  FileTextOutlined,
  TeamOutlined,
  BellOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { Case, CaseComment, CaseActivity, User, CaseStatus, CaseSeverity, CasePriority, UpdateCaseRequest, CloseCaseRequest } from '@/lib/types';
import StatusIndicator from '@/components/ui-system/StatusIndicator';
import ActionDropdown, { CommonActions } from '@/components/ui-system/ActionDropdown';
import QuickActions from '@/components/cases/QuickActions';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { confirm } = Modal;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;

// Status workflow configuration
const statusWorkflow: Record<CaseStatus, { next: CaseStatus[]; step: number; color: string }> = {
  OPEN: { next: ['ASSIGNED', 'CANCELLED'], step: 0, color: '#1677ff' },
  ASSIGNED: { next: ['IN_PROGRESS', 'PENDING_CUSTOMER', 'CANCELLED'], step: 1, color: '#ffa940' },
  IN_PROGRESS: { next: ['PENDING_CUSTOMER', 'PENDING_VENDOR', 'RESOLVED'], step: 2, color: '#722ed1' },
  PENDING_CUSTOMER: { next: ['IN_PROGRESS', 'RESOLVED'], step: 3, color: '#fadb14' },
  PENDING_VENDOR: { next: ['IN_PROGRESS', 'RESOLVED'], step: 3, color: '#fadb14' },
  RESOLVED: { next: ['CLOSED', 'IN_PROGRESS'], step: 4, color: '#52c41a' },
  CLOSED: { next: [], step: 5, color: '#999999' },
  CANCELLED: { next: ['OPEN'], step: 6, color: '#ff4d4f' },
};

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();
  
  const caseId = params.id as string;
  const isEditMode = searchParams.get('mode') === 'edit';
  
  const [editing, setEditing] = useState(isEditMode);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Fetch case details
  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['cases', caseId],
    queryFn: () => casesApi.getById(Number(caseId)),
    enabled: !!caseId,
  });

  // Fetch case comments (assuming API exists)
  const { data: commentsData } = useQuery({
    queryKey: ['cases', caseId, 'comments'],
    queryFn: () => casesApi.getComments?.(Number(caseId)) || Promise.resolve({ data: [] }),
    enabled: !!caseId,
  });

  // Fetch case activities (assuming API exists)
  const { data: activitiesData } = useQuery({
    queryKey: ['cases', caseId, 'activities'],
    queryFn: () => casesApi.getActivities?.(Number(caseId)) || Promise.resolve({ data: [] }),
    enabled: !!caseId,
  });

  // Fetch available users for assignment
  const { data: users } = useQuery({
    queryKey: ['users', 'available-for-assignment'],
    queryFn: () => usersApi.getAvailableForAssignment(),
  });

  // Update case mutation
  const updateCaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: UpdateCaseRequest }) => 
      casesApi.update(id, data),
    onSuccess: () => {
      message.success('Case updated successfully');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ id, content, isInternal }: { id: number, content: string, isInternal: boolean }) => 
      casesApi.addComment(id, content, isInternal),
    onSuccess: () => {
      message.success('Comment added successfully');
      commentForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['cases', caseId, 'activities'] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  // Assign case mutation
  const assignCaseMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number, userId: number }) => 
      casesApi.assign(id, userId),
    onSuccess: () => {
      message.success('Case assigned successfully');
      setAssignModalVisible(false);
      setSelectedUserId(undefined);
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  // Close case mutation
  const closeCaseMutation = useMutation({
    mutationFn: ({ id, resolution, closingNotes }: { id: number, resolution: string, closingNotes?: string }) => 
      casesApi.close(id, resolution, closingNotes),
    onSuccess: () => {
      message.success('Case closed successfully');
      setCloseModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] });
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const caseDetails: Case | null = caseData?.data || null;

  useEffect(() => {
    if (caseDetails && editing) {
      form.setFieldsValue({
        title: caseDetails.title,
        description: caseDetails.description,
        severity: caseDetails.severity,
        priority: caseDetails.priority,
        status: caseDetails.status,
        category: caseDetails.category,
        tags: caseDetails.tags?.join(', '),
      });
    }
  }, [caseDetails, editing, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updateData: UpdateCaseRequest = {
        title: values.title,
        description: values.description,
        severity: values.severity,
        priority: values.priority,
        status: values.status,
        category: values.category,
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()) : [],
      };

      updateCaseMutation.mutate({ id: Number(caseId), data: updateData });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;
    assignCaseMutation.mutate({ id: Number(caseId), userId: selectedUserId });
  };

  const handleAddComment = async () => {
    try {
      const values = await commentForm.validateFields();
      addCommentMutation.mutate({ 
        id: Number(caseId), 
        content: values.comment,
        isInternal: isInternalComment 
      });
    } catch (error) {
      console.error('Comment validation failed:', error);
    }
  };

  const handleCloseCase = async (values: any) => {
    closeCaseMutation.mutate({ 
      id: Number(caseId), 
      resolution: values.resolution,
      closingNotes: values.closingNotes 
    });
  };

  const handleStatusChange = async (newStatus: CaseStatus) => {
    updateCaseMutation.mutate({ 
      id: Number(caseId), 
      data: { status: newStatus } 
    });
  };

  if (isLoading) {
    return (
      <PageContainer title="Loading..." loading={true} />
    );
  }

  if (error || !caseDetails) {
    return (
      <PageContainer title="Error">
        <Alert 
          message="Case not found" 
          description="The case you're looking for doesn't exist or you don't have permission to view it."
          type="error"
          showIcon
          action={
            <Button onClick={() => router.push('/cases')}>
              Back to Cases
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const extraActions = [
    <Button 
      key="back"
      icon={<ArrowLeftOutlined />}
      onClick={() => router.back()}
    >
      Back
    </Button>,
  ];

  if (!editing) {
    extraActions.push(
      <QuickActions 
        key="quick-actions"
        case={caseDetails}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['case', caseId] });
          queryClient.invalidateQueries({ queryKey: ['cases'] });
        }}
        size="middle"
        type="dropdown"
        disabled={caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED'}
      />,
      <Button 
        key="edit"
        icon={<EditOutlined />}
        onClick={() => setEditing(true)}
        disabled={caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED'}
      >
        Edit
      </Button>
    );
  } else {
    extraActions.push(
      <Button key="cancel" onClick={() => setEditing(false)}>
        Cancel
      </Button>,
      <Button 
        key="save"
        type="primary"
        icon={<SaveOutlined />}
        loading={updateCaseMutation.isPending}
        onClick={handleSave}
      >
        Save
      </Button>
    );
  }

  const moreActions = [
    {
      key: 'assign',
      icon: <UserAddOutlined />,
      label: 'Assign',
      disabled: caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED',
      onClick: () => setAssignModalVisible(true),
    },
    {
      key: 'start',
      icon: <CheckCircleOutlined />,
      label: 'Start Work',
      disabled: caseDetails.status !== 'ASSIGNED',
      onClick: () => handleStatusChange('IN_PROGRESS'),
    },
    {
      key: 'resolve',
      icon: <CheckCircleOutlined />,
      label: 'Mark as Resolved',
      disabled: !['ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'PENDING_VENDOR'].includes(caseDetails.status),
      onClick: () => handleStatusChange('RESOLVED'),
    },
    {
      key: 'close',
      icon: <ExclamationCircleOutlined />,
      label: 'Close Case',
      disabled: caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED',
      onClick: () => setCloseModalVisible(true),
    },
  ];

  if (!editing) {
    extraActions.push(
      <Dropdown key="more" menu={{ items: moreActions }}>
        <Button icon={<MoreOutlined />}>
          More Actions
        </Button>
      </Dropdown>
    );
  }

  return (
    <PageContainer
      title={`Case ${caseDetails.caseNumber}`}
      subTitle={caseDetails.title}
      extra={extraActions}
      tags={[
        <StatusIndicator key="status" type="status" value={caseDetails.status} showText showIcon animated={caseDetails.status === 'IN_PROGRESS'} />,
        <StatusIndicator key="severity" type="severity" value={caseDetails.severity} showText animated={caseDetails.severity === 'CRITICAL'} />,
        <StatusIndicator key="priority" type="priority" value={caseDetails.priority.toString()} showText animated={caseDetails.priority === 1} />,
      ]}
      content={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Case Progress Indicator */}
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
            <Row align="middle" justify="space-between">
              <Col flex="auto">
                <Steps 
                  current={statusWorkflow[caseDetails.status]?.step || 0}
                  size="small"
                  items={[
                    { title: 'Open', description: 'Case created' },
                    { title: 'Assigned', description: 'Team member assigned' },
                    { title: 'In Progress', description: 'Work in progress' },
                    { title: 'Review', description: 'Under review' },
                    { title: 'Resolved', description: 'Solution implemented' },
                    { title: 'Closed', description: 'Case completed' },
                  ]}
                />
              </Col>
              <Col>
                <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    SLA Target: 24h
                  </Text>
                  <Progress 
                    percent={Math.min(100, (dayjs().diff(dayjs(caseDetails.createdAt), 'hours') / 24) * 100)}
                    size="small"
                    status={dayjs().diff(dayjs(caseDetails.createdAt), 'hours') > 24 ? 'exception' : 'active'}
                    showInfo={false}
                    strokeWidth={4}
                  />
                  <Text style={{ fontSize: 12 }}>
                    {dayjs().diff(dayjs(caseDetails.createdAt), 'hours')}h elapsed
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Enhanced Tabs Layout */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="small"
            items={[
              {
                key: 'details',
                label: (
                  <Space>
                    <FileTextOutlined />
                    <span>Details</span>
                  </Space>
                ),
              },
              {
                key: 'activity',
                label: (
                  <Space>
                    <HistoryOutlined />
                    <span>Activity</span>
                    <Badge count={activitiesData?.data?.length || 0} size="small" />
                  </Space>
                ),
              },
              {
                key: 'comments',
                label: (
                  <Space>
                    <MessageOutlined />
                    <span>Comments</span>
                    <Badge count={commentsData?.data?.length || 0} size="small" />
                  </Space>
                ),
              },
            ]}
          />
        </motion.div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'details' && (
            <Row gutter={[16, 16]}>
              {/* Case Details */}
              <Col xs={24} lg={16}>
                <Card
                  title={
                    <Space>
                      <FileTextOutlined />
                      <span>Case Information</span>
                      {editing && <Badge status="processing" text="Editing" />}
                    </Space>
                  }
                  extra={
                    !editing && (
                      <ActionDropdown
                        items={[
                          {
                            key: 'edit',
                            label: 'Edit Case',
                            icon: <EditOutlined />,
                            onClick: () => setEditing(true),
                            disabled: caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED',
                          },
                          {
                            key: 'assign',
                            label: 'Assign Case',
                            icon: <UserAddOutlined />,
                            onClick: () => setAssignModalVisible(true),
                            disabled: caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED',
                          },
                          CommonActions.divider,
                          {
                            key: 'resolve',
                            label: 'Mark as Resolved',
                            icon: <CheckCircleOutlined />,
                            onClick: () => handleStatusChange('RESOLVED'),
                            disabled: !['ASSIGNED', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'PENDING_VENDOR'].includes(caseDetails.status),
                          },
                          {
                            key: 'close',
                            label: 'Close Case',
                            icon: <CheckCircleOutlined />,
                            onClick: () => setCloseModalVisible(true),
                            disabled: caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED',
                            danger: true,
                          },
                        ]}
                      />
                    )
                  }
                  size="small"
                >
            {editing ? (
              <Form form={form} layout="vertical">
                <ProFormText 
                  name="title" 
                  label="Title" 
                  rules={[{ required: true, message: 'Title is required' }]}
                />
                
                <ProFormTextArea 
                  name="description" 
                  label="Description"
                  fieldProps={{ rows: 6 }}
                  rules={[{ required: true, message: 'Description is required' }]}
                />

                <Row gutter={16}>
                  <Col span={8}>
                    <ProFormSelect
                      name="severity"
                      label="Severity"
                      options={[
                        { label: 'Low', value: 'LOW' },
                        { label: 'Medium', value: 'MEDIUM' },
                        { label: 'High', value: 'HIGH' },
                        { label: 'Critical', value: 'CRITICAL' },
                      ]}
                      rules={[{ required: true }]}
                    />
                  </Col>
                  <Col span={8}>
                    <ProFormSelect
                      name="priority"
                      label="Priority"
                      options={[
                        { label: 'Low', value: 'LOW' },
                        { label: 'Medium', value: 'MEDIUM' },
                        { label: 'High', value: 'HIGH' },
                        { label: 'Urgent', value: 'URGENT' },
                      ]}
                      rules={[{ required: true }]}
                    />
                  </Col>
                  <Col span={8}>
                    <ProFormSelect
                      name="status"
                      label="Status"
                      options={[
                        { label: 'Open', value: 'OPEN' },
                        { label: 'Assigned', value: 'ASSIGNED' },
                        { label: 'In Progress', value: 'IN_PROGRESS' },
                        { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
                        { label: 'Pending Vendor', value: 'PENDING_VENDOR' },
                        { label: 'Resolved', value: 'RESOLVED' },
                        { label: 'Closed', value: 'CLOSED' },
                        { label: 'Cancelled', value: 'CANCELLED' },
                      ]}
                      rules={[{ required: true }]}
                    />
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <ProFormText name="category" label="Category" />
                  </Col>
                  <Col span={12}>
                    <ProFormText 
                      name="tags" 
                      label="Tags (comma-separated)"
                      placeholder="e.g., urgent, network, customer-impacting"
                    />
                  </Col>
                </Row>
              </Form>
            ) : (
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Title" span={2}>
                  {caseDetails.title}
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {caseDetails.description}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <StatusIndicator
                    type="severity"
                    value={caseDetails.severity}
                    showText
                    animated={caseDetails.severity === 'CRITICAL'}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Priority">
                  <StatusIndicator
                    type="priority"
                    value={caseDetails.priority.toString()}
                    showText
                    animated={caseDetails.priority === 1}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <StatusIndicator
                    type="status"
                    value={caseDetails.status}
                    showText
                    showIcon
                    animated={caseDetails.status === 'IN_PROGRESS'}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  {caseDetails.category || 'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Assigned To">
                  {caseDetails.assignedUsers && caseDetails.assignedUsers.length > 0 ? (
                    <Space direction="vertical" size="small">
                      {caseDetails.assignedUsers.map(user => (
                        <Space key={user.id}>
                          <Avatar size="small" icon={<UserOutlined />} />
                          {user.name || user.fullName || user.username}
                          {user.email && <span style={{ color: '#999', fontSize: 12 }}>({user.email})</span>}
                        </Space>
                      ))}
                    </Space>
                  ) : caseDetails.assignedTo ? (
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} />
                      {caseDetails.assignedTo.name || caseDetails.assignedTo.fullName || caseDetails.assignedTo.username}
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>Unassigned</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Created By">
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    {caseDetails.createdBy?.fullName || 'Unknown'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {dayjs(caseDetails.createdAt).format('MMMM D, YYYY [at] h:mm A')}
                </Descriptions.Item>
                <Descriptions.Item label="Last Updated">
                  {dayjs(caseDetails.updatedAt).format('MMMM D, YYYY [at] h:mm A')}
                </Descriptions.Item>
                {caseDetails.closedAt && (
                  <Descriptions.Item label="Closed">
                    {dayjs(caseDetails.closedAt).format('MMMM D, YYYY [at] h:mm A')}
                  </Descriptions.Item>
                )}
                {caseDetails.tags && caseDetails.tags.length > 0 && (
                  <Descriptions.Item label="Tags" span={2}>
                    <Space wrap>
                      {caseDetails.tags.map(tag => (
                        <Tag key={tag} icon={<TagOutlined />}>{tag}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
                {caseDetails.resolution && (
                  <Descriptions.Item label="Resolution" span={2}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {caseDetails.resolution}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
                </Card>
              </Col>

              {/* Quick Actions & Assignment */}
              <Col xs={24} lg={8}>
                <Card
                  title={
                    <Space>
                      <TeamOutlined />
                      <span>Assignment & Actions</span>
                    </Space>
                  }
                  size="small"
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {/* Current Assignment */}
                    <div>
                      <Text strong>Assigned To:</Text>
                      <br />
                      {caseDetails.assignedUsers && caseDetails.assignedUsers.length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                          {caseDetails.assignedUsers.map((user, index) => (
                            <Space key={user.id} style={{ display: 'block', marginBottom: index < caseDetails.assignedUsers!.length - 1 ? 8 : 0 }}>
                              <Avatar size="small" icon={<UserOutlined />} />
                              <div>
                                <div>{user.name || user.fullName || user.username}</div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {user.email}
                                </Text>
                              </div>
                            </Space>
                          ))}
                        </div>
                      ) : caseDetails.assignedTo ? (
                        <Space style={{ marginTop: 8 }}>
                          <Avatar size="small" icon={<UserOutlined />} />
                          <div>
                            <div>{caseDetails.assignedTo.name || caseDetails.assignedTo.fullName || caseDetails.assignedTo.username}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {caseDetails.assignedTo.email}
                            </Text>
                          </div>
                        </Space>
                      ) : (
                        <Alert
                          message="Unassigned"
                          description="This case needs to be assigned to a team member"
                          type="warning"
                          style={{ marginTop: 8 }}
                          action={
                            <Button 
                              size="small" 
                              type="primary"
                              onClick={() => setAssignModalVisible(true)}
                            >
                              Assign
                            </Button>
                          }
                        />
                      )}
                    </div>

                    {/* Quick Status Changes */}
                    <div>
                      <Text strong>Quick Actions:</Text>
                      <br />
                      <Space wrap style={{ marginTop: 8 }}>
                        {statusWorkflow[caseDetails.status]?.next.map(nextStatus => (
                          <Button
                            key={nextStatus}
                            size="small"
                            onClick={() => handleStatusChange(nextStatus)}
                            disabled={caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED'}
                          >
                            <StatusIndicator
                              type="status"
                              value={nextStatus}
                              showText
                              size="small"
                            />
                          </Button>
                        ))}
                      </Space>
                    </div>

                    {/* SLA Information */}
                    <div>
                      <Text strong>SLA Status:</Text>
                      <br />
                      <div style={{ marginTop: 8 }}>
                        <Progress
                          percent={Math.min(100, (dayjs().diff(dayjs(caseDetails.createdAt), 'hours') / 24) * 100)}
                          status={dayjs().diff(dayjs(caseDetails.createdAt), 'hours') > 24 ? 'exception' : 'active'}
                          format={(percent) => `${Math.round((percent || 0) / 100 * 24)}h`}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Target: 24 hours | Elapsed: {dayjs().diff(dayjs(caseDetails.createdAt), 'hours')} hours
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card
              title={
                <Space>
                  <HistoryOutlined />
                  <span>Case Activity Timeline</span>
                </Space>
              }
            >
              <Timeline mode="left">
                <Timeline.Item 
                  color="blue"
                  dot={<ClockCircleOutlined />}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <strong>Case Created</strong>
                    <br />
                    <small>by {caseDetails.createdBy?.fullName}</small>
                    <br />
                    <small>{dayjs(caseDetails.createdAt).fromNow()}</small>
                  </motion.div>
                </Timeline.Item>

                {activitiesData?.data?.map((activity: CaseActivity, index) => (
                  <Timeline.Item 
                    key={activity.id}
                    color={activity.activityType === 'COMMENT_ADDED' ? 'green' : 
                           activity.activityType === 'STATUS_CHANGED' ? 'orange' : 'blue'}
                    dot={activity.activityType === 'COMMENT_ADDED' ? <MessageOutlined /> :
                         activity.activityType === 'STATUS_CHANGED' ? <ExclamationCircleOutlined /> :
                         activity.activityType === 'ASSIGNED' ? <UserAddOutlined /> : 
                         <ClockCircleOutlined />}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * (index + 2) }}
                    >
                      <strong>{activity.description}</strong>
                      {activity.oldValue && activity.newValue && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            From: {activity.oldValue} → To: {activity.newValue}
                          </Text>
                        </div>
                      )}
                      <br />
                      <small>by {activity.user?.name || activity.user?.fullName || activity.user?.username}</small>
                      <br />
                      <small>{dayjs(activity.createdAt).fromNow()}</small>
                    </motion.div>
                  </Timeline.Item>
                ))}

                {caseDetails.status === 'CLOSED' && (
                  <Timeline.Item 
                    color="gray"
                    dot={<CheckCircleOutlined />}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <strong>Case Closed</strong>
                      <br />
                      <small>{dayjs(caseDetails.closedAt).fromNow()}</small>
                    </motion.div>
                  </Timeline.Item>
                )}
              </Timeline>

              {(!activitiesData?.data || activitiesData.data.length === 0) && (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                  <HistoryOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <br />
                  No activity recorded yet
                </div>
              )}
            </Card>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <Card
                title={
                  <Space>
                    <MessageOutlined />
                    <span>Comments</span>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                {/* Add Comment Form */}
                <Form form={commentForm} onFinish={handleAddComment}>
                  <Form.Item
                    name="comment"
                    rules={[{ required: true, message: 'Please enter a comment' }]}
                  >
                    <TextArea 
                      rows={4} 
                      placeholder="Add a comment to this case..."
                      disabled={caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED'}
                      style={{ resize: 'none' }}
                    />
                  </Form.Item>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <Text type="secondary">Internal comment:</Text>
                        <Switch
                          checked={isInternalComment}
                          onChange={setIsInternalComment}
                          checkedChildren={<LockOutlined />}
                          unCheckedChildren={<UnlockOutlined />}
                          size="small"
                        />
                        {isInternalComment && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Only visible to team members
                          </Text>
                        )}
                      </Space>
                    </Col>
                    <Col>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        icon={<SendOutlined />}
                        loading={addCommentMutation.isPending}
                        disabled={caseDetails.status === 'CLOSED' || caseDetails.status === 'CANCELLED'}
                        size="small"
                      >
                        Add Comment
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card>

              {/* Comments List */}
              <div>
                {commentsData?.data?.map((comment: CaseComment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card
                      size="small"
                      style={{ 
                        marginBottom: 12, 
                        borderLeft: comment.isInternal ? '4px solid #faad14' : '4px solid #1677ff' 
                      }}
                    >
                      <Space align="start" style={{ width: '100%' }}>
                        <Avatar icon={<UserOutlined />} size="small" />
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: 8 }}>
                            <Space>
                              <Text strong style={{ fontSize: 14 }}>
                                {comment.user?.name || comment.user?.fullName || comment.user?.username || comment.author?.fullName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(comment.createdAt).fromNow()}
                              </Text>
                              {comment.isInternal && (
                                <Tag color="orange">
                                  <LockOutlined style={{ fontSize: 10 }} /> Internal
                                </Tag>
                              )}
                            </Space>
                          </div>
                          <div style={{ 
                            whiteSpace: 'pre-wrap', 
                            lineHeight: '1.5',
                            fontSize: 14 
                          }}>
                            {comment.comment || comment.content}
                          </div>
                        </div>
                      </Space>
                    </Card>
                  </motion.div>
                ))}

                {(!commentsData?.data || commentsData.data.length === 0) && (
                  <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                    <MessageOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                    <br />
                    No comments yet. Be the first to add a comment!
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Assign Modal */}
      <Modal
        title="Assign Case"
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedUserId(undefined);
        }}
        okButtonProps={{ 
          disabled: !selectedUserId,
          loading: assignCaseMutation.isPending,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Case:</strong> {caseDetails.title}
          </div>
          <div>
            <strong>Current Assignee:</strong> {
              caseDetails.assignedUsers && caseDetails.assignedUsers.length > 0 
                ? caseDetails.assignedUsers.map(u => u.name || u.fullName || u.username).join(', ')
                : caseDetails.assignedTo?.name || caseDetails.assignedTo?.fullName || caseDetails.assignedTo?.username || 'Unassigned'
            }
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
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users?.data?.filter((user: User) => user && user.id != null).map((user: User) => ({
                value: user.id,
                label: `${user.fullName} (${user.email})`,
              })) || []}
            />
          </div>
        </Space>
      </Modal>

      {/* Close Case Modal */}
      <Modal
        title="Close Case"
        open={closeModalVisible}
        footer={null}
        onCancel={() => setCloseModalVisible(false)}
        width={600}
      >
        <ProForm
          onFinish={handleCloseCase}
          submitter={{
            searchConfig: {
              submitText: 'Close Case',
            },
            render: (props, doms) => [
              <Button key="cancel" onClick={() => setCloseModalVisible(false)}>
                Cancel
              </Button>,
              <Button
                key="submit"
                type="primary"
                danger
                loading={closeCaseMutation.isPending}
                onClick={() => props.form?.submit?.()}
              >
                Close Case
              </Button>,
            ],
          }}
        >
          <ProFormTextArea
            name="resolution"
            label="Resolution"
            placeholder="Describe how this case was resolved..."
            rules={[{ required: true, message: 'Resolution is required' }]}
            fieldProps={{ rows: 4 }}
          />
          
          <ProFormTextArea
            name="closingNotes"
            label="Closing Notes (Optional)"
            placeholder="Any additional notes about closing this case..."
            fieldProps={{ rows: 3 }}
          />
        </ProForm>
      </Modal>
    </PageContainer>
  );
}