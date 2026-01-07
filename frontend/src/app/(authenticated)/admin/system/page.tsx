'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Alert, 
  Table, 
  Form, 
  Input, 
  Switch, 
  Button, 
  Space, 
  message, 
  Badge,
  Tabs,
  Typography,
  Progress,
  Tag,
  Modal,
  InputNumber,
  Divider
} from 'antd';
import { 
  DatabaseOutlined, 
  MailOutlined, 
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  ApiOutlined,
  SaveOutlined,
  RestOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/lib/api-client';
import type { SystemHealth, SystemSettings, EmailSettings } from '@/lib/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SystemPage() {
  const [emailForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [logFilters, setLogFilters] = useState({
    level: undefined,
    component: undefined,
    search: '',
  });
  const queryClient = useQueryClient();

  // Fetch system health
  const { data: healthResponse, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch system settings
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemApi.getSettings(),
  });

  // Fetch email settings
  const { data: emailSettingsResponse, isLoading: emailLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => systemApi.getEmailSettings(),
  });

  // Fetch system logs
  const { data: logsResponse, isLoading: logsLoading } = useQuery({
    queryKey: ['system-logs', logFilters],
    queryFn: () => systemApi.getLogs(logFilters),
  });

  // Fetch system stats
  const { data: statsResponse } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => systemApi.getSystemStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const health: SystemHealth = healthResponse?.data || {
    database: { status: 'DOWN' },
    notifications: { status: 'DOWN' },
    overallStatus: 'UNHEALTHY',
    lastCheck: new Date().toISOString()
  };

  const settings: SystemSettings[] = Array.isArray(settingsResponse?.data) ? settingsResponse.data : [];
  const emailSettings: EmailSettings = emailSettingsResponse?.data || {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    username: '',
    useTls: true,
    fromAddress: '',
    fromName: 'CaseTools'
  };
  const logs = logsResponse?.data?.content || [];
  const stats = statsResponse?.data;

  useEffect(() => {
    if (emailSettings) {
      emailForm.setFieldsValue({
        enabled: emailSettings.enabled,
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        username: emailSettings.username,
        useTls: emailSettings.useTls,
        fromAddress: emailSettings.fromAddress,
        fromName: emailSettings.fromName,
      });
    }
  }, [emailSettings, emailForm]);

  // Update email settings mutation
  const updateEmailMutation = useMutation({
    mutationFn: (data: any) => systemApi.updateEmailSettings(data),
    onSuccess: () => {
      message.success('Email settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update email settings');
    },
  });

  // Test email connection mutation
  const testEmailMutation = useMutation({
    mutationFn: () => systemApi.testEmailConnection(),
    onSuccess: () => {
      message.success('Email connection test successful');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Email connection test failed');
    },
  });

  // Update system setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) => 
      systemApi.updateSetting(id, value),
    onSuccess: () => {
      message.success('Setting updated successfully');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update setting');
    },
  });

  const handleEmailSubmit = (values: any) => {
    updateEmailMutation.mutate(values);
  };

  const handleTestEmail = () => {
    testEmailMutation.mutate();
  };

  const handleSettingUpdate = (setting: SystemSettings, newValue: string) => {
    updateSettingMutation.mutate({ id: setting.id, value: newValue });
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'UP': return 'success';
      case 'DOWN': return 'error';
      case 'DEGRADED': return 'warning';
      default: return 'default';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'UP': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'DOWN': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'DEGRADED': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  const getOverallHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return '#52c41a';
      case 'DEGRADED': return '#faad14';
      case 'UNHEALTHY': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const settingsColumns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      filters: settings.length > 0 ? [...new Set(settings.map(s => s.category))].map(cat => ({
        text: cat,
        value: cat,
      })) : [],
      onFilter: (value: any, record: SystemSettings) => record.category === value,
    },
    {
      title: 'Setting',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: 'Value',
      key: 'value',
      render: (_, record: SystemSettings) => {
        if (record.type === 'BOOLEAN') {
          return (
            <Switch
              checked={record.value === 'true'}
              onChange={(checked) => handleSettingUpdate(record, checked.toString())}
              loading={updateSettingMutation.isPending}
            />
          );
        }
        return (
          <Input
            defaultValue={record.value}
            onBlur={(e) => {
              if (e.target.value !== record.value) {
                handleSettingUpdate(record, e.target.value);
              }
            }}
            onPressEnter={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.value !== record.value) {
                handleSettingUpdate(record, target.value);
              }
            }}
          />
        );
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Last Updated',
      key: 'updatedAt',
      render: (_, record: SystemSettings) => (
        <div>
          <div>{dayjs(record.updatedAt).format('MMM DD, YYYY HH:mm')}</div>
          <div className="text-xs text-gray-500">
            by {record.updatedBy?.fullName || record.updatedBy?.username}
          </div>
        </div>
      ),
    },
  ];

  const logColumns = [
    {
      title: 'Timestamp',
      key: 'timestamp',
      width: 180,
      render: (_, record: any) => (
        dayjs(record.timestamp).format('MMM DD, HH:mm:ss')
      ),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        let color = 'default';
        if (level === 'ERROR') color = 'red';
        else if (level === 'WARN') color = 'orange';
        else if (level === 'INFO') color = 'blue';
        return <Tag color={color}>{level}</Tag>;
      },
      filters: [
        { text: 'ERROR', value: 'ERROR' },
        { text: 'WARN', value: 'WARN' },
        { text: 'INFO', value: 'INFO' },
        { text: 'DEBUG', value: 'DEBUG' },
      ],
    },
    {
      title: 'Component',
      dataIndex: 'component',
      key: 'component',
      width: 120,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  return (
    <PageContainer
      header={{
        title: 'System Settings',
        subTitle: 'Monitor system health and configure application settings',
        extra: [
          <Button 
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['system-health'] });
              queryClient.invalidateQueries({ queryKey: ['system-stats'] });
            }}
          >
            Refresh Status
          </Button>
        ],
      }}
    >
      {/* System Health Overview */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Overall Health"
              value={health.overallStatus}
              valueStyle={{ color: getOverallHealthColor(health.overallStatus) }}
              prefix={getHealthStatusIcon(health.overallStatus)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Database"
              value={health.database?.status || 'UNKNOWN'}
              valueStyle={{ color: health.database?.status === 'UP' ? '#3f8600' : '#cf1322' }}
              prefix={<DatabaseOutlined />}
              suffix={health.database?.responseTime ? `(${health.database.responseTime}ms)` : ''}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Notifications"
              value={health.notifications?.status || 'UNKNOWN'}
              valueStyle={{ color: health.notifications?.status === 'UP' ? '#3f8600' : '#cf1322' }}
              prefix={<MailOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Last Check"
              value={dayjs(health.lastCheck).fromNow()}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
        </Row>

        {health.overallStatus !== 'HEALTHY' && (
          <Alert
            message={`System Health: ${health.overallStatus}`}
            description="One or more system components are experiencing issues. Please check the detailed status below."
            type={health.overallStatus === 'DEGRADED' ? 'warning' : 'error'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* System Statistics */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="CPU Usage"
                value={stats.cpuUsage}
                suffix="%"
                prefix={<CloudServerOutlined />}
              />
              <Progress percent={stats.cpuUsage} showInfo={false} size="small" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Memory Usage"
                value={stats.memoryUsage}
                suffix="%"
                prefix={<DatabaseOutlined />}
              />
              <Progress percent={stats.memoryUsage} showInfo={false} size="small" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Active Sessions"
                value={stats.activeSessions}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Uptime"
                value={stats.uptime}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Detailed Configuration */}
      <Card>
        <Tabs 
          defaultActiveKey="health"
          items={[
            {
              key: 'health',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Health Details
                </span>
              ),
              children: (
                <Row gutter={16}>
              <Col span={12}>
                <Card title="Database Connection" size="small">
                  <div className="flex items-center justify-between mb-2">
                    <span>Status:</span>
                    <Badge 
                      status={getHealthStatusColor(health.database?.status || 'DOWN')} 
                      text={health.database?.status || 'UNKNOWN'} 
                    />
                  </div>
                  {health.database?.responseTime && (
                    <div className="flex items-center justify-between mb-2">
                      <span>Response Time:</span>
                      <span>{health.database?.responseTime}ms</span>
                    </div>
                  )}
                  {health.database?.message && (
                    <div>
                      <Text type="secondary">{health.database?.message}</Text>
                    </div>
                  )}
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="Notification System" size="small">
                  <div className="flex items-center justify-between mb-2">
                    <span>Status:</span>
                    <Badge 
                      status={getHealthStatusColor(health.notifications?.status || 'DOWN')} 
                      text={health.notifications?.status || 'UNKNOWN'} 
                    />
                  </div>
                  {health.notifications?.message && (
                    <div>
                      <Text type="secondary">{health.notifications?.message}</Text>
                    </div>
                  )}
                </Card>
              </Col>

              {health.redis && (
                <Col span={12}>
                  <Card title="Redis Cache" size="small">
                    <div className="flex items-center justify-between mb-2">
                      <span>Status:</span>
                      <Badge 
                        status={getHealthStatusColor(health.redis.status)} 
                        text={health.redis.status} 
                      />
                    </div>
                    {health.redis.responseTime && (
                      <div className="flex items-center justify-between mb-2">
                        <span>Response Time:</span>
                        <span>{health.redis.responseTime}ms</span>
                      </div>
                    )}
                  </Card>
                </Col>
              )}

              {health.grafana && (
                <Col span={12}>
                  <Card title="Grafana Integration" size="small">
                    <div className="flex items-center justify-between mb-2">
                      <span>Status:</span>
                      <Badge 
                        status={getHealthStatusColor(health.grafana?.status || 'DOWN')} 
                        text={health.grafana?.status || 'UNKNOWN'} 
                      />
                    </div>
                  </Card>
                </Col>
              )}
            </Row>
              )
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined />
                  General Settings
                </span>
              ),
              children: (
            <Table
              columns={settingsColumns}
              dataSource={settings}
              loading={settingsLoading}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} settings`,
              }}
            />
              )
            },
            {
              key: 'email',
              label: (
                <span>
                  <MailOutlined />
                  Email Configuration
                </span>
              ),
              children: (
            <Row gutter={24}>
              <Col span={12}>
                <Card title="Email Settings" loading={emailLoading}>
                  <Form
                    form={emailForm}
                    layout="vertical"
                    onFinish={handleEmailSubmit}
                  >
                    <Form.Item name="enabled" valuePropName="checked">
                      <Switch
                        checkedChildren="Enabled"
                        unCheckedChildren="Disabled"
                      />
                    </Form.Item>

                    <Form.Item
                      label="SMTP Host"
                      name="smtpHost"
                      rules={[{ required: true, message: 'Please enter SMTP host' }]}
                    >
                      <Input placeholder="smtp.gmail.com" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="SMTP Port"
                          name="smtpPort"
                          rules={[{ required: true, message: 'Please enter SMTP port' }]}
                        >
                          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="useTls" valuePropName="checked">
                          <Switch
                            checkedChildren="Use TLS"
                            unCheckedChildren="No TLS"
                            style={{ marginTop: 30 }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      label="Username"
                      name="username"
                    >
                      <Input placeholder="username@example.com" />
                    </Form.Item>

                    <Form.Item
                      label="Password"
                      name="password"
                    >
                      <Input.Password placeholder="SMTP password" />
                    </Form.Item>

                    <Divider />

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="From Address"
                          name="fromAddress"
                          rules={[
                            { required: true, message: 'Please enter from address' },
                            { type: 'email', message: 'Please enter valid email' }
                          ]}
                        >
                          <Input placeholder="noreply@example.com" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="From Name"
                          name="fromName"
                          rules={[{ required: true, message: 'Please enter from name' }]}
                        >
                          <Input placeholder="CaseTools System" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={updateEmailMutation.isPending}
                        >
                          Save Settings
                        </Button>
                        <Button
                          icon={<RestOutlined />}
                          onClick={handleTestEmail}
                          loading={testEmailMutation.isPending}
                          disabled={!emailSettings.enabled}
                        >
                          Test Connection
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              <Col span={12}>
                <Card title="Email Status">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Email Notifications:</span>
                      <Badge 
                        status={emailSettings.enabled ? 'success' : 'default'} 
                        text={emailSettings.enabled ? 'Enabled' : 'Disabled'} 
                      />
                    </div>
                    
                    {emailSettings.enabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>SMTP Server:</span>
                          <span>{emailSettings.smtpHost}:{emailSettings.smtpPort}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>Security:</span>
                          <span>{emailSettings.useTls ? 'TLS/SSL' : 'None'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>From Address:</span>
                          <span>{emailSettings.fromAddress}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <Alert
                    message="Email Configuration"
                    description="Email notifications are used for alert notifications, user invitations, and system notifications."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </Card>
              </Col>
            </Row>
              )
            },
            {
              key: 'logs',
              label: (
                <span>
                  <FileTextOutlined />
                  System Logs
                </span>
              ),
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Input
                          placeholder="Search logs..."
                          value={logFilters.search}
                          onChange={(e) => setLogFilters(prev => ({
                            ...prev,
                            search: e.target.value
                          }))}
                          allowClear
                        />
                      </Col>
                      <Col span={4}>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            // Export logs functionality
                            message.info('Export functionality to be implemented');
                          }}
                        >
                          Export Logs
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  <Table
              columns={logColumns}
              dataSource={logs}
              loading={logsLoading}
              rowKey={(record, index) => index || 0}
              size="small"
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} log entries`,
              }}
              scroll={{ x: 1000 }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>
    </PageContainer>
  );
}