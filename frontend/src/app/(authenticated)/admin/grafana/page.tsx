'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  message, 
  Badge,
  Table,
  Modal,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Tag
} from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DashboardOutlined,
  ReloadOutlined,
  UserAddOutlined,
  TeamOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { grafanaApi } from '@/lib/api-client';
import type { GrafanaSettings, GrafanaDashboard } from '@/lib/types';
import RuleAssignmentModal from '@/components/grafana/RuleAssignmentModal';
import SqlQueryModal from '@/components/grafana/SqlQueryModal';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function GrafanaPage() {
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [sqlModalVisible, setSqlModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [selectedQuery, setSelectedQuery] = useState<{ query: string; datasource?: string; title?: string }>({ query: '' });
  const queryClient = useQueryClient();

  // Fetch Grafana settings
  const { data: settingsResponse } = useQuery({
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
    refetchInterval: 60000, // Refresh every 30 seconds
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

  const handleSync = () => {
    Modal.confirm({
      title: 'Sync Dashboards',
      content: 'This will sync all dashboards from Grafana. This may take a few moments.',
      onOk: () => syncMutation.mutate(),
    });
  };

  const handleAssignRule = (rule: any) => {
    setSelectedRule(rule);
    setAssignmentModalVisible(true);
  };

  const handleShowQuery = (query: string, datasource?: string, title?: string) => {
    setSelectedQuery({ query, datasource, title });
    setSqlModalVisible(true);
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
      render: (_: any, record: GrafanaDashboard) => (
        <div>
          <div className="font-medium">{record.title}</div>
          <div className="text-sm text-gray-500">UID: {record.uid}</div>
        </div>
      ),
    },
    {
      title: 'Folder',
      key: 'folder',
      render: (_:any, record: GrafanaDashboard) => (
        record.folderTitle || 'General'
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_:any, record: GrafanaDashboard) => (
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
      render: (_ : any, record: GrafanaDashboard) => (
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
                width: 250,
                render: (_, record: any) => (
                  <div>
                    <div className="font-medium">{record.title || record.name}</div>
                    <div className="text-xs text-gray-500">UID: {record.uid || record.grafanaUid}</div>
                    {record.ruleGroup && (
                      <Tag color="blue" className="mt-1">{record.ruleGroup}</Tag>
                    )}
                  </div>
                ),
              },
              {
                title: 'Query Details',
                key: 'query',
                width: 350,
                render: (_, record: any) => {
                  // Extract SQL query from the data array
                  const sqlQuery = record.data?.[0]?.model?.rawSql || 
                                  record.data?.[0]?.model?.rawQuery ||
                                  record.data?.[0]?.model?.expr ||
                                  'No query available';
                  const datasource = record.data?.[0]?.datasourceUid || record.data?.[0]?.datasource || 'Unknown';
                  const isLongQuery = sqlQuery.length > 100;
                  
                  return (
                    <div>
                      <div className="text-xs font-mono bg-gray-50 p-2 rounded mb-1" style={{ 
                        maxHeight: '60px', 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {isLongQuery ? `${sqlQuery.substring(0, 100)}...` : sqlQuery}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-500">
                          Datasource: {datasource}
                        </div>
                        {sqlQuery !== 'No query available' && (
                          <Button
                            type="link"
                            size="small"
                            icon={<DatabaseOutlined />}
                            onClick={() => handleShowQuery(sqlQuery, datasource, record.title || record.name)}
                            style={{ padding: '0 4px' }}
                          >
                            Show Query
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                title: 'Alert Condition',
                key: 'condition',
                width: 200,
                render: (_, record: any) => (
                  <div>
                    <div className="text-sm">
                      For: {record.for_ || record.for || '1m'}
                    </div>
                    {record.annotations?.summary && (
                      <Tooltip title={record.annotations.summary}>
                        <div className="text-xs text-gray-500 truncate" style={{ maxWidth: '180px' }}>
                          {record.annotations.summary}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                ),
              },
              {
                title: 'State',
                key: 'state',
                width: 120,
                render: (_, record: any) => (
                  <Space direction="vertical" size="small">
                    <Badge 
                      status={record.isPaused === false ? 'success' : 'default'} 
                      text={record.isPaused === false ? 'Active' : 'Paused'} 
                    />
                    {record.noDataState && (
                      <span className="text-xs text-gray-500">
                        No Data: {record.noDataState}
                      </span>
                    )}
                  </Space>
                ),
              },
              {
                title: 'Assigned To',
                key: 'assigned',
                render: (_, record: any) => {
                  // You would fetch the actual assignment data here
                  return (
                    <Space size="small">
                      {record.assignedUsers?.length > 0 && (
                        <Tooltip title={`${record.assignedUsers.length} users assigned`}>
                          <Badge count={record.assignedUsers.length} style={{ backgroundColor: '#52c41a' }}>
                            <UserAddOutlined />
                          </Badge>
                        </Tooltip>
                      )}
                      {record.assignedTeams?.length > 0 && (
                        <Tooltip title={`${record.assignedTeams.length} teams assigned`}>
                          <Badge count={record.assignedTeams.length} style={{ backgroundColor: '#1890ff' }}>
                            <TeamOutlined />
                          </Badge>
                        </Tooltip>
                      )}
                      {!record.assignedUsers?.length && !record.assignedTeams?.length && (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </Space>
                  );
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<UserAddOutlined />}
                      onClick={() => handleAssignRule(record)}
                    >
                      Assign
                    </Button>
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
                  </Space>
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

      {/* Rule Assignment Modal */}
      <RuleAssignmentModal
        visible={assignmentModalVisible}
        rule={selectedRule}
        onClose={() => {
          setAssignmentModalVisible(false);
          setSelectedRule(null);
        }}
      />

      {/* SQL Query Modal */}
      <SqlQueryModal
        visible={sqlModalVisible}
        query={selectedQuery.query}
        datasource={selectedQuery.datasource}
        title={selectedQuery.title}
        onClose={() => {
          setSqlModalVisible(false);
          setSelectedQuery({ query: '' });
        }}
      />
    </PageContainer>
  );
}
