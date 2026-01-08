'use client';

import { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Select, 
  Space, 
  Button, 
  message,
  Divider,
  Typography,
  Tag,
  Alert,
  Descriptions,
  Badge,
  Radio,
  List,
  Avatar,
  Popconfirm
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  UserAddOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ruleAssignmentApi, usersApi, teamsApi } from '@/lib/api-client';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface RuleAssignmentModalProps {
  visible: boolean;
  rule: any;
  onClose: () => void;
}

export default function RuleAssignmentModal({ 
  visible, 
  rule, 
  onClose 
}: RuleAssignmentModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [currentUserIds, setCurrentUserIds] = useState<number[]>([]);
  const [currentTeamIds, setCurrentTeamIds] = useState<number[]>([]);

  // Fetch existing assignment for this rule
  const { data: assignmentData } = useQuery({
    queryKey: ['rule-assignment', rule?.uid],
    queryFn: () => ruleAssignmentApi.getRuleAssignmentByGrafanaUid(rule.uid),
    enabled: !!rule?.uid && visible,
  });

  // Fetch available users
  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 0, size: 100 }),
    enabled: visible,
  });

  // Fetch available teams
  const { data: teamsResponse } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll({ page: 0, size: 100 }),
    enabled: visible,
  });

  const users = usersResponse?.data?.content || [];
  const teams = teamsResponse?.data?.content || [];
  const existingAssignment = assignmentData?.data;

  useEffect(() => {
    if (existingAssignment && visible) {
      const userIds = existingAssignment.assignedUsers?.map((u: any) => u.id) || [];
      const teamIds = existingAssignment.assignedTeams?.map((t: any) => t.id) || [];
      
      setCurrentUserIds(userIds);
      setCurrentTeamIds(teamIds);
      
      form.setFieldsValue({
        userIds: userIds,
        teamIds: teamIds,
        severity: existingAssignment.severity || 'MEDIUM',
        category: existingAssignment.category || 'OPERATIONAL',
        assignmentStrategy: existingAssignment.assignmentStrategy || 'MANUAL',
      });
    } else if (visible) {
      setCurrentUserIds([]);
      setCurrentTeamIds([]);
      form.resetFields();
      // Set default values for new assignments
      form.setFieldsValue({
        severity: 'MEDIUM',
        category: 'OPERATIONAL',
        assignmentStrategy: 'MANUAL',
      });
    }
  }, [existingAssignment, visible, form]);

  // Assign rule mutation
  const assignMutation = useMutation({
    mutationFn: (data: any) => 
      ruleAssignmentApi.assignUsersAndTeams(rule.uid, data),
    onSuccess: () => {
      message.success('Rule assignment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['grafana-alert-rules'] });
      queryClient.invalidateQueries({ queryKey: ['rule-assignments'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update assignment');
    },
  });

  const handleRemoveUser = async (userId: number) => {
    try {
      // Update local state
      const updatedIds = currentUserIds.filter(id => id !== userId);
      setCurrentUserIds(updatedIds);
      form.setFieldValue('userIds', updatedIds);
      
      // If assignment exists, update on server
      if (existingAssignment) {
        await ruleAssignmentApi.removeAssignments(rule.uid || rule.grafanaUid, {
          userIds: [userId],
          teamIds: []
        });
        message.success('User removed from assignment');
        queryClient.invalidateQueries({ queryKey: ['rule-assignment', rule?.uid] });
      }
    } catch (error) {
      message.error('Failed to remove user');
      // Restore the user ID on error
      setCurrentUserIds([...currentUserIds, userId]);
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    try {
      // Update local state
      const updatedIds = currentTeamIds.filter(id => id !== teamId);
      setCurrentTeamIds(updatedIds);
      form.setFieldValue('teamIds', updatedIds);
      
      // If assignment exists, update on server
      if (existingAssignment) {
        await ruleAssignmentApi.removeAssignments(rule.uid || rule.grafanaUid, {
          userIds: [],
          teamIds: [teamId]
        });
        message.success('Team removed from assignment');
        queryClient.invalidateQueries({ queryKey: ['rule-assignment', rule?.uid] });
      }
    } catch (error) {
      message.error('Failed to remove team');
      // Restore the team ID on error
      setCurrentTeamIds([...currentTeamIds, teamId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Create or update assignment with severity and other settings
      await ruleAssignmentApi.createOrUpdateRuleAssignment(rule.uid || rule.grafanaUid, {
        ruleName: rule.title || rule.name,
        folderUid: rule.folderUID || rule.folderUid,
        folderName: rule.folderTitle || rule.folderName,
        description: rule.annotations?.description || `Assignment for ${rule.title || rule.name}`,
        datasourceUid: rule.data?.[0]?.datasourceUid || datasourceUid,
        severity: values.severity || 'MEDIUM',
        category: values.category || 'OPERATIONAL',
        assignmentStrategy: values.assignmentStrategy || 'MANUAL',
        autoAssignEnabled: true,
        active: true,
      });
      
      // Then assign users and teams
      await assignMutation.mutateAsync({
        userIds: values.userIds || [],
        teamIds: values.teamIds || [],
      });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Failed to submit assignment:', error);
    }
  };

  // Extract rule details
  const sqlQuery = rule?.data?.[0]?.model?.rawSql || rule?.data?.[0]?.model?.expr || null;
  const datasourceUid = rule?.data?.[0]?.datasourceUid || 'Unknown';
  const alertDuration = rule?.for_ || rule?.for || '1m';
  const annotations = rule?.annotations || {};

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          <span>Assign Rule: {rule?.title || rule?.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading || assignMutation.isPending}
          onClick={handleSubmit}
        >
          Save Assignment
        </Button>
      ]}
    >
      {/* Rule Details Section */}
      <Descriptions
        bordered
        size="small"
        column={1}
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>Rule Details</span>
          </Space>
        }
      >
        <Descriptions.Item label={<><ThunderboltOutlined /> Rule UID</>}>
          <Text code>{rule?.uid || 'N/A'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={<><DatabaseOutlined /> Query</>}>
          {sqlQuery ? (
            <div className="font-mono text-xs bg-gray-50 p-2 rounded" style={{ maxHeight: '100px', overflow: 'auto' }}>
              {sqlQuery}
            </div>
          ) : (
            <Text type="secondary">No query available</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={<><ClockCircleOutlined /> Alert Duration</>}>
          <Badge color="blue" text={`Alert after ${alertDuration}`} />
        </Descriptions.Item>
        {annotations.summary && (
          <Descriptions.Item label="Summary">
            <Text>{annotations.summary}</Text>
          </Descriptions.Item>
        )}
        {annotations.description && (
          <Descriptions.Item label="Description">
            <Text>{annotations.description}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      <Alert
        message="Configure Assignment"
        description="Set severity level and assign users/teams who will be notified when this alert triggers."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Currently Assigned Users and Teams */}
      {(currentUserIds.length > 0 || currentTeamIds.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <Divider orientation="left">Currently Assigned</Divider>
          
          {currentUserIds.length > 0 && (
            <>
              <Text strong>Assigned Users:</Text>
              <List
                size="small"
                style={{ marginTop: 8, marginBottom: 16 }}
                dataSource={currentUserIds}
                renderItem={(userId) => {
                  const user = users.find((u: any) => u.id === userId) || 
                               existingAssignment?.assignedUsers?.find((u: any) => u.id === userId);
                  return (
                    <List.Item
                      actions={[
                        <Popconfirm
                          title="Remove this user?"
                          description="This user will no longer receive notifications for this rule."
                          onConfirm={() => handleRemoveUser(userId)}
                          okText="Remove"
                          cancelText="Cancel"
                        >
                          <Button 
                            type="text" 
                            danger 
                            size="small" 
                            icon={<MinusCircleOutlined />}
                          >
                            Remove
                          </Button>
                        </Popconfirm>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} size="small" />}
                        title={user?.name || `User ${userId}`}
                        description={
                          <Space size="small">
                            {user?.email && <Text type="secondary">{user.email}</Text>}
                            {user?.role && <Tag color="blue">{user.role}</Tag>}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </>
          )}

          {currentTeamIds.length > 0 && (
            <>
              <Text strong>Assigned Teams:</Text>
              <List
                size="small"
                style={{ marginTop: 8, marginBottom: 16 }}
                dataSource={currentTeamIds}
                renderItem={(teamId) => {
                  const team = teams.find((t: any) => t.id === teamId) ||
                               existingAssignment?.assignedTeams?.find((t: any) => t.id === teamId);
                  return (
                    <List.Item
                      actions={[
                        <Popconfirm
                          title="Remove this team?"
                          description="All team members will no longer receive notifications for this rule."
                          onConfirm={() => handleRemoveTeam(teamId)}
                          okText="Remove"
                          cancelText="Cancel"
                        >
                          <Button 
                            type="text" 
                            danger 
                            size="small" 
                            icon={<MinusCircleOutlined />}
                          >
                            Remove
                          </Button>
                        </Popconfirm>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#52c41a' }} size="small" />}
                        title={team?.name || `Team ${teamId}`}
                        description={
                          <Space size="small">
                            {team?.memberCount && <Text type="secondary">{team.memberCount} members</Text>}
                            {team?.department && <Tag>{team.department}</Tag>}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </>
          )}
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="Severity Level"
          name="severity"
          initialValue="MEDIUM"
          rules={[{ required: true, message: 'Please select a severity level' }]}
        >
          <Radio.Group>
            <Radio.Button value="LOW">
              <Space>
                <Badge color="green" />
                <span>Low</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="MEDIUM">
              <Space>
                <Badge color="gold" />
                <span>Medium</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="HIGH">
              <Space>
                <Badge color="orange" />
                <span>High</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="CRITICAL">
              <Space>
                <Badge color="red" />
                <span>Critical</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Case Category"
          name="category"
          initialValue="OPERATIONAL"
        >
          <Select>
            <Option value="OPERATIONAL">Operational</Option>
            <Option value="SECURITY">Security</Option>
            <Option value="PERFORMANCE">Performance</Option>
            <Option value="COMPLIANCE">Compliance</Option>
            <Option value="BUSINESS">Business</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Assignment Strategy"
          name="assignmentStrategy"
          initialValue="MANUAL"
          help="How cases should be assigned when alerts trigger"
        >
          <Radio.Group>
            <Radio value="MANUAL">Manual - First available user</Radio>
            <Radio value="ROUND_ROBIN">Round Robin - Distribute evenly</Radio>
            <Radio value="LOAD_BASED">Load Based - Least busy user</Radio>
            <Radio value="TEAM_BASED">Team Based - Team lead first</Radio>
          </Radio.Group>
        </Form.Item>

        <Divider>Team & User Assignment</Divider>

        <Form.Item
          label={
            <Space>
              <UserOutlined />
              <span>Assign to Users</span>
            </Space>
          }
          name="userIds"
        >
          <Select
            mode="multiple"
            placeholder="Select users to assign"
            style={{ width: '100%' }}
            optionLabelProp="label"
            onChange={(values) => setCurrentUserIds(values)}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {users.map((user: any) => (
              <Option 
                key={user.id} 
                value={user.id}
                label={user.name}
              >
                <Space>
                  <UserOutlined />
                  <span>{user.name}</span>
                  <Tag color="blue">{user.role}</Tag>
                  {user.department && <Tag>{user.department}</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>OR</Divider>

        <Form.Item
          label={
            <Space>
              <TeamOutlined />
              <span>Assign to Teams</span>
            </Space>
          }
          name="teamIds"
        >
          <Select
            mode="multiple"
            placeholder="Select teams to assign"
            style={{ width: '100%' }}
            optionLabelProp="label"
            onChange={(values) => setCurrentTeamIds(values)}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {teams.map((team: any) => (
              <Option 
                key={team.id} 
                value={team.id}
                label={team.name}
              >
                <Space>
                  <TeamOutlined />
                  <span>{team.name}</span>
                  <Tag color="green">{team.memberCount} members</Tag>
                  {team.department && <Tag>{team.department}</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
          <Text type="secondary">
            <strong>Note:</strong> When an alert is triggered for this rule, all assigned users and team members will receive notifications. 
            Cases will be automatically created and assigned based on the assignment strategy configured.
          </Text>
        </div>
      </Form>

      {existingAssignment && (
        <div style={{ marginTop: 16 }}>
          <Divider>Current Assignment Configuration</Divider>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Severity">
              <Badge 
                color={
                  existingAssignment.severity === 'CRITICAL' ? 'red' : 
                  existingAssignment.severity === 'HIGH' ? 'orange' : 
                  existingAssignment.severity === 'MEDIUM' ? 'gold' : 'green'
                } 
                text={existingAssignment.severity || 'MEDIUM'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag>{existingAssignment.category || 'OPERATIONAL'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Users">
              <Text>{existingAssignment.assignedUserCount || 0} users</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Teams">
              <Text>{existingAssignment.assignedTeamCount || 0} teams</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Recipients">
              <Text strong>{existingAssignment.totalAssignedUsers || 0} users</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Strategy">
              <Text>{existingAssignment.assignmentStrategy || 'MANUAL'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Modal>
  );
}