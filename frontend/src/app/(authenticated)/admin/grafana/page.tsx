'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Switch, 
  Button, 
  Space, 
  message, 
  Alert,
  Divider,
  Badge,
  Table,
  Modal,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  InputNumber
} from 'antd';
import { 
  ApiOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DashboardOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { grafanaApi } from '@/lib/api-client';
import type { GrafanaSettings, GrafanaDashboard, GrafanaConnection } from '@/lib/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export default function GrafanaPage() {
  const [form] = Form.useForm();
  const [connectionForm] = Form.useForm();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [testModalVisible, setTestModalVisible] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Grafana settings
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['grafana-settings'],
    queryFn: () => grafanaApi.getSettings(),
  });

  // Fetch Grafana dashboards
  const { data: dashboardsResponse, isLoading: dashboardsLoading } = useQuery({
    queryKey: ['grafana-dashboards'],
    queryFn: () => grafanaApi.getDashboards(),
    enabled: settingsResponse?.data?.enabled,
  });

  // Fetch Grafana alert rules
  const { data: alertRulesResponse, isLoading: alertRulesLoading } = useQuery({
    queryKey: ['grafana-alert-rules'],
    queryFn: () => grafanaApi.getAlertRules(),
    enabled: settingsResponse?.data?.enabled,
  });

  // Fetch connection status
  const { data: statusResponse } = useQuery({
    queryKey: ['grafana-connection-status'],
    queryFn: () => grafanaApi.getConnectionStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const settings: GrafanaSettings = settingsResponse?.data || {
    enabled: false,
    url: '',
    apiKey: '',
    orgId: 1,
    syncEnabled: false,
    syncInterval: 300,
    connectionStatus: 'DISCONNECTED'
  };

  const dashboards: GrafanaDashboard[] = dashboardsResponse?.data || [];
  const alertRules = alertRulesResponse?.data || [];

  useEffect(() => {
    if (statusResponse?.data) {
      setConnectionStatus(statusResponse.data.connectionStatus);
    }
  }, [statusResponse]);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        enabled: settings.enabled,
        url: settings.url,
        apiKey: settings.apiKey,
        orgId: settings.orgId,
        defaultDashboard: settings.defaultDashboard,
        syncEnabled: settings.syncEnabled,
        syncInterval: settings.syncInterval,
      });
    }
  }, [settings, form]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => grafanaApi.updateSettings(data),
    onSuccess: () => {
      message.success('Grafana settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['grafana-settings'] });
      queryClient.invalidateQueries({ queryKey: ['grafana-connection-status'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (data: GrafanaConnection) => grafanaApi.testConnection(data),
    onSuccess: (response) => {
      message.success('Connection test successful');
      setConnectionStatus('CONNECTED');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Connection test failed');
      setConnectionStatus('ERROR');
    },
  });

  // Sync dashboards mutation
  const syncMutation = useMutation({
    mutationFn: () => grafanaApi.sync(),
    onSuccess: () => {
      message.success('Dashboard sync completed successfully');
      queryClient.invalidateQueries({ queryKey: ['grafana-dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['grafana-settings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Dashboard sync failed');
    },
  });

  // Sync single dashboard mutation
  const syncDashboardMutation = useMutation({
    mutationFn: (uid: string) => grafanaApi.syncDashboard(uid),
    onSuccess: () => {
      message.success('Dashboard synced successfully');
      queryClient.invalidateQueries({ queryKey: ['grafana-dashboards'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to sync dashboard');
    },
  });

  const handleSaveSettings = (values: any) => {
    updateSettingsMutation.mutate(values);
  };

  const handleTestConnection = () => {
    connectionForm.validateFields().then((values) => {
      setIsTestingConnection(true);
      testConnectionMutation.mutate(
        {
          url: values.url,
          apiKey: values.apiKey,
          orgId: values.orgId,
        },
        {
          onSettled: () => {
            setIsTestingConnection(false);
            setTestModalVisible(false);
            connectionForm.resetFields();
          },
        }
      );
    });
  };

  const handleSync = () => {
    Modal.confirm({
      title: 'Sync Dashboards',
      content: 'This will sync all dashboards from Grafana. This may take a few moments.',
      onOk: () => syncMutation.mutate(),
    });
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'success';
      case 'ERROR': return 'error';
      default: return 'default';
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED': return <CheckCircleOutlined />;
      case 'ERROR': return <CloseCircleOutlined />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  const dashboardColumns = [
    {
      title: 'Dashboard',
      key: 'dashboard',
      render: (_, record: GrafanaDashboard) => (
        <div>
          <div className="font-medium">{record.title}</div>
          <div className="text-sm text-gray-500">UID: {record.uid}</div>
        </div>
      ),
    },
    {
      title: 'Folder',
      key: 'folder',
      render: (_, record: GrafanaDashboard) => (
        record.folderTitle || 'General'
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_, record: GrafanaDashboard) => (
        <div>
          {record.tags.map(tag => (
            <Badge key={tag} count={tag} style={{ backgroundColor: '#108ee9', marginRight: 4 }} />
          ))}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: GrafanaDashboard) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DashboardOutlined />}
            onClick={() => window.open(record.url, '_blank')}
          >
            Open
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            loading={syncDashboardMutation.isPending}
            onClick={() => syncDashboardMutation.mutate(record.uid)}
          >
            Sync
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: 'Grafana Integration',
        subTitle: 'Configure Grafana connection and dashboard synchronization',
      }}
    >
      {/* Connection Status Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="Connection Status"
              value={connectionStatus}
              prefix={getConnectionStatusIcon(connectionStatus)}
              valueStyle={{ 
                color: connectionStatus === 'CONNECTED' ? '#3f8600' : 
                       connectionStatus === 'ERROR' ? '#cf1322' : '#d9d9d9' 
              }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Dashboards"
              value={dashboards.length}
              prefix={<DashboardOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Alert Rules"
              value={alertRules.length}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Last Sync"
              value={settings.lastSync ? dayjs(settings.lastSync).fromNow() : 'Never'}
              prefix={<SyncOutlined />}
            />
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'right' }}>
              <Space direction="vertical">
                <Button
                  type="primary"
                  icon={<ApiOutlined />}
                  onClick={() => setTestModalVisible(true)}
                  disabled={!settings.url || !settings.apiKey}
                >
                  Test Connection
                </Button>
                <Button
                  icon={<SyncOutlined />}
                  onClick={handleSync}
                  loading={syncMutation.isPending}
                  disabled={connectionStatus !== 'CONNECTED'}
                >
                  Sync Dashboards
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          {/* Configuration Card */}
          <Card 
            title={
              <Space>
                <SettingOutlined />
                <span>Connection Settings</span>
              </Space>
            }
            loading={settingsLoading}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveSettings}
              initialValues={settings}
            >
              <Form.Item name="enabled" valuePropName="checked">
                <Switch
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                  style={{ marginBottom: 16 }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>Grafana URL</span>
                    <Tooltip title="The base URL of your Grafana instance (e.g., https://grafana.example.com)">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="url"
                rules={[
                  { required: true, message: 'Please enter Grafana URL' },
                  { type: 'url', message: 'Please enter a valid URL' }
                ]}
              >
                <Input placeholder="https://grafana.example.com" />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>API Key</span>
                    <Tooltip title="Grafana API key with Admin or Editor permissions">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="apiKey"
                rules={[{ required: true, message: 'Please enter API key' }]}
              >
                <Input.Password placeholder="Enter Grafana API key" />
              </Form.Item>

              <Form.Item
                label="Organization ID"
                name="orgId"
                rules={[{ required: true, message: 'Please enter organization ID' }]}
              >
                <InputNumber placeholder="1" min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="Default Dashboard" name="defaultDashboard">
                <Input placeholder="Dashboard UID (optional)" />
              </Form.Item>

              <Divider>Synchronization Settings</Divider>

              <Form.Item name="syncEnabled" valuePropName="checked">
                <Switch
                  checkedChildren="Auto Sync Enabled"
                  unCheckedChildren="Auto Sync Disabled"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>Sync Interval (seconds)</span>
                    <Tooltip title="How often to automatically sync dashboards from Grafana">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="syncInterval"
                rules={[{ required: true, message: 'Please enter sync interval' }]}
              >
                <InputNumber min={60} max={3600} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateSettingsMutation.isPending}
                  block
                >
                  Save Settings
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          {/* Information Card */}
          <Card title="Setup Instructions" style={{ height: '100%' }}>
            <div>
              <Title level={5}>Getting Started</Title>
              <Paragraph>
                To integrate with Grafana, you'll need to create an API key and configure the connection settings.
              </Paragraph>

              <Title level={5}>Steps:</Title>
              <ol>
                <li>
                  <Text strong>Create API Key:</Text>
                  <br />
                  Go to Grafana → Configuration → API Keys → Add API Key
                </li>
                <li>
                  <Text strong>Set Permissions:</Text>
                  <br />
                  Ensure the API key has "Admin" or "Editor" role
                </li>
                <li>
                  <Text strong>Configure URL:</Text>
                  <br />
                  Enter your Grafana instance URL (including protocol)
                </li>
                <li>
                  <Text strong>Test Connection:</Text>
                  <br />
                  Use the "Test Connection" button to verify settings
                </li>
                <li>
                  <Text strong>Sync Dashboards:</Text>
                  <br />
                  Click "Sync Dashboards" to import your dashboards
                </li>
              </ol>

              <Alert
                message="Security Notice"
                description="API keys are stored encrypted and only accessible to admin users. Regular users will only see dashboard links."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />

              <Divider />

              <Title level={5}>Features:</Title>
              <ul>
                <li>Automatic dashboard synchronization</li>
                <li>Embedded dashboard viewing</li>
                <li>Alert integration with Grafana</li>
                <li>Real-time connection monitoring</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Dashboards Table */}
      {settings.enabled && (
        <Card
          title={
            <Space>
              <DashboardOutlined />
              <span>Synchronized Dashboards ({dashboards.length})</span>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['grafana-dashboards'] })}
              >
                Refresh
              </Button>
            </Space>
          }
          style={{ marginTop: 24 }}
        >
          <Table
            columns={dashboardColumns}
            dataSource={dashboards}
            loading={dashboardsLoading}
            rowKey="uid"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} dashboards`,
            }}
          />
        </Card>
      )}

      {/* Alert Rules Table */}
      {settings.enabled && (
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined />
              <span>Alert Rules ({alertRules.length})</span>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['grafana-alert-rules'] })}
              >
                Refresh
              </Button>
            </Space>
          }
          style={{ marginTop: 24 }}
        >
          <Table
            columns={[
              {
                title: 'Rule Name',
                key: 'name',
                render: (_, record: any) => (
                  <div>
                    <div className="font-medium">{record.name}</div>
                    <div className="text-sm text-gray-500">UID: {record.grafanaUid}</div>
                  </div>
                ),
              },
              {
                title: 'Description',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true,
                render: (text) => text || 'No description',
              },
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
              },
              {
                title: 'Severity',
                dataIndex: 'severity',
                key: 'severity',
                render: (severity) => (
                  <Badge 
                    color={severity === 'CRITICAL' ? 'red' : severity === 'HIGH' ? 'orange' : severity === 'MEDIUM' ? 'gold' : 'green'}
                    text={severity}
                  />
                ),
              },
              {
                title: 'Status',
                dataIndex: 'active',
                key: 'active',
                render: (active) => (
                  <Badge 
                    status={active ? 'success' : 'default'} 
                    text={active ? 'Active' : 'Inactive'} 
                  />
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                render: () => (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:9000';
                      window.open(`${grafanaUrl}/alerting/list`, '_blank');
                    }}
                  >
                    View in Grafana
                  </Button>
                ),
              },
            ]}
            dataSource={alertRules}
            loading={alertRulesLoading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} alert rules`,
            }}
          />
        </Card>
      )}

      {/* Test Connection Modal */}
      <Modal
        title="Test Grafana Connection"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTestModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="test" 
            type="primary" 
            loading={isTestingConnection}
            onClick={handleTestConnection}
          >
            Test Connection
          </Button>
        ]}
      >
        <Alert
          message="Test Connection Settings"
          description="Enter the connection details to test the Grafana API connectivity."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={connectionForm}
          layout="vertical"
        >
          <Form.Item
            label="Grafana URL"
            name="url"
            rules={[
              { required: true, message: 'Please enter Grafana URL' },
              { type: 'url', message: 'Please enter a valid URL' }
            ]}
          >
            <Input placeholder="https://grafana.example.com" />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="apiKey"
            rules={[{ required: true, message: 'Please enter API key' }]}
          >
            <Input.Password placeholder="Enter Grafana API key" />
          </Form.Item>

          <Form.Item
            label="Organization ID"
            name="orgId"
            initialValue={1}
            rules={[{ required: true, message: 'Please enter organization ID' }]}
          >
            <InputNumber placeholder="1" min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}