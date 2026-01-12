'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  PageContainer, 
  ProTable, 
  ProColumns,
  ActionType
} from '@ant-design/pro-components';
import { 
  Button, 
  Space, 
  Tag, 
  Dropdown, 
  Modal, 
  message,
  Badge,
  Tooltip,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Drawer,
  Descriptions,
  Avatar,
  Progress,
  Timeline
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  UserOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  CodeOutlined,
  BellOutlined,
  SyncOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { grafanaApi, ruleAssignmentApi } from '@/lib/api-client';
import dayjs from 'dayjs';
import RuleAssignmentModal from '@/components/grafana/RuleAssignmentModal';
import SqlQueryModal from '@/components/grafana/SqlQueryModal';
import { useRoleAccess } from '@/hooks/useRoleAccess';

const { confirm } = Modal;
const { Title, Text } = Typography;

interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  data?: any[];
  noDataState: string;
  execErrState: string;
  for: string;
  annotations?: Record<string, any>;
  labels?: Record<string, any>;
  folderUID: string;
  ruleGroup: string;
  intervalSeconds?: number;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  assigned?: boolean;
  assignedUsers?: any[];
  assignedTeams?: any[];
  state?:any;
}

export default function AlertRulesPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [sqlModalVisible, setSqlModalVisible] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<{ query: string; datasource?: string; title?: string }>({ query: '' });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { permissions } = useRoleAccess();
  const canManageAlerts = permissions.canManageAlerts;

  // Fetch alert rules statistics
  const { data: rulesStats, isLoading: statsLoading } = useQuery({
    queryKey: ['alert-rules', 'stats'],
    queryFn: async () => {
      const rules = await grafanaApi.getAlertRules();
      const totalRules = rules.data?.length || 0;
      const activeRules = rules.data?.filter((r: any) => r.noDataState !== 'NoData').length || 0;
      const assignedRules = rules.data?.filter((r: any) => r.assigned).length || 0;
      const criticalRules = rules.data?.filter((r: any) => 
        r.labels?.severity === 'critical' || r.annotations?.severity === 'critical'
      ).length || 0;
      
      return {
        total: totalRules,
        active: activeRules,
        assigned: assignedRules,
        critical: criticalRules
      };
    },
    refetchInterval: 30000,
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (uid: string) => grafanaApi.deleteAlertRule(uid),
    onSuccess: () => {
      message.success('Alert rule deleted successfully');
      actionRef.current?.reload();
    },
    onError: () => {
      message.error('Failed to delete alert rule');
    },
  });

  const handleDelete = (rule: AlertRule) => {
    confirm({
      title: 'Delete Alert Rule',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete the alert rule "${rule.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteRuleMutation.mutate(rule.uid),
    });
  };

  const handleBulkAction = async (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select alert rules to perform bulk action');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          confirm({
            title: `Delete ${selectedRowKeys.length} alert rules`,
            icon: <ExclamationCircleOutlined />,
            content: 'Are you sure you want to delete the selected alert rules?',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
              // Bulk delete logic
              for (const uid of selectedRowKeys) {
                await grafanaApi.deleteAlertRule(uid as string);
              }
              message.success(`${selectedRowKeys.length} alert rules deleted successfully`);
              setSelectedRowKeys([]);
              actionRef.current?.reload();
            },
          });
          break;
        case 'export':
          message.info('Exporting selected alert rules...');
          break;
        case 'disable':
          message.info('Disabling selected alert rules...');
          break;
        default:
          message.info(`Bulk ${action} functionality coming soon`);
      }
    } catch (error) {
      message.error('Failed to perform bulk action');
    }
  };

  const showSqlQuery = (rule: AlertRule) => {
    const query = rule.data?.[0]?.model?.rawSql || 
                  rule.data?.[0]?.model?.expr || 
                  'No query available';
    const datasource = rule.data?.[0]?.datasourceUid || 'Unknown';
    
    setSelectedQuery({ 
      query, 
      datasource,
      title: rule.title 
    });
    setSqlModalVisible(true);
  };

  const getSeverityColor = (rule: AlertRule) => {
    const severity = rule.labels?.severity || rule.annotations?.severity;
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'gold';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getSeverityIcon = (rule: AlertRule) => {
    const severity = rule.labels?.severity || rule.annotations?.severity;
    switch (severity) {
      case 'critical': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'high': return <WarningOutlined style={{ color: '#ffa940' }} />;
      case 'medium': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'low': return <ExclamationCircleOutlined style={{ color: '#52c41a' }} />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  const columns: ProColumns<AlertRule>[] = [
    {
      title: 'Rule Name',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left',
      width: 250,
      render: (_: any, record: AlertRule) => (
        <Space direction="vertical" size="small">
          <Button 
            type="link" 
            onClick={() => {
              setSelectedRule(record);
              setDetailsDrawerVisible(true);
            }}
            style={{ padding: 0 }}
          >
            {record.title || 'Unnamed Rule'}
          </Button>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              UID: {record.uid}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      render: (_: any, record: AlertRule) => {
        const severity = record.labels?.severity || record.annotations?.severity || 'unknown';
        return (
          <Tag color={getSeverityColor(record)} icon={getSeverityIcon(record)}>
            {severity.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'noDataState',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Alerting', value: 'Alerting' },
        { text: 'OK', value: 'OK' },
        { text: 'NoData', value: 'NoData' },
      ],
      render: (_: any, record: AlertRule) => {
        const state = record.state;
        let color = 'default';
        let icon = null;
        
        switch (state) {
          case 'Alerting':
            color = 'error';
            icon = <ExclamationCircleOutlined />;
            break;
          case 'OK':
            color = 'success';
            icon = <PlayCircleOutlined />;
            break;
          case 'NoData':
            color = 'default';
            icon = <PauseCircleOutlined />;
            break;
        }
        
        return (
          <Badge status={color === 'error' ? 'error' : color === 'success' ? 'success' : 'default'}>
            <Tag color={color} icon={icon}>
              {state}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: 'Assignment',
      key: 'assignment',
      width: 120,
      filters: [
        { text: 'Assigned', value: 'assigned' },
        { text: 'Unassigned', value: 'unassigned' },
      ],
      render: (_: any, record: AlertRule) => {
        const isAssigned = record.assigned || (record.assignedUsers?.length || 0) > 0 || (record.assignedTeams?.length || 0) > 0;
        const totalAssignees = (record.assignedUsers?.length || 0) + (record.assignedTeams?.length || 0);
        
        if (!isAssigned) {
          if (!canManageAlerts) {
            return <Tag color="default">Unassigned</Tag>;
          }
          return (
            <Button 
              size="small" 
              icon={<UserAddOutlined />}
              onClick={() => {
                setSelectedRule(record);
                setAssignmentModalVisible(true);
              }}
            >
              Assign
            </Button>
          );
        }
        
        return canManageAlerts ? (
          <Tooltip title={`${record.assignedUsers?.length || 0} users, ${record.assignedTeams?.length || 0} teams`}>
            <Button
              type="link"
              icon={<TeamOutlined />}
              onClick={() => {
                setSelectedRule(record);
                setAssignmentModalVisible(true);
              }}
            >
              {totalAssignees} assigned
            </Button>
          </Tooltip>
        ) : (
          <Tag color="blue">{totalAssignees} assigned</Tag>
        );
      },
    },
    {
      title: 'Query',
      key: 'query',
      width: 100,
      render: (_: any, record: AlertRule) => (
        <Tooltip title="View SQL Query">
          <Button
            size="small"
            icon={<DatabaseOutlined />}
            onClick={() => showSqlQuery(record)}
          >
            View SQL
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Folder',
      dataIndex: 'folderUID',
      key: 'folder',
      width: 120,
      filters: true,
      render: (folder: any) => (
        <Tag icon={<DatabaseOutlined />}>{folder || 'General'}</Tag>
      ),
    },
    {
      title: 'Group',
      dataIndex: 'ruleGroup',
      key: 'ruleGroup',
      width: 120,
      ellipsis: true,
      render: (group: any) => (
        <Tooltip title={group}>
          <span>{group}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Evaluation',
      dataIndex: 'for',
      key: 'for',
      width: 100,
      render: (forDuration: any) => (
        <Space size="small">
          <ClockCircleOutlined />
          <Text type="secondary">{forDuration || '5m'}</Text>
        </Space>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      sorter: true,
      render: (date: any) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: AlertRule) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => {
                  setSelectedRule(record);
                  setDetailsDrawerVisible(true);
                },
              },
              {
                key: 'sql',
                label: 'View Query',
                icon: <CodeOutlined />,
                onClick: () => showSqlQuery(record),
              },
              ...(canManageAlerts ? [
                {
                  key: 'edit',
                  label: 'Edit Rule',
                  icon: <EditOutlined />,
                  onClick: () => router.push(`/alerts/rules/${record.uid}/edit`),
                },
                {
                  key: 'assign',
                  label: 'Manage Assignment',
                  icon: <TeamOutlined />,
                  onClick: () => {
                    setSelectedRule(record);
                    setAssignmentModalVisible(true);
                  },
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDelete(record),
                },
              ] : []) as any,
            ],
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: 'Alert Rules Management',
        subTitle: 'Manage and monitor all Grafana alert rules',
      }}
    >
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Rules"
              value={rulesStats?.total || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Rules"
              value={rulesStats?.active || 0}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Assigned Rules"
              value={rulesStats?.assigned || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Critical Rules"
              value={rulesStats?.critical || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ProTable */}
      <ProTable<AlertRule>
        headerTitle="Alert Rules"
        actionRef={actionRef}
        rowKey="uid"
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<SyncOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          const response = await grafanaApi.getAlertRules();
          const rules = response.data || [];
          
          // Apply filters
          let filteredRules = [...rules];
          
          if (filter.severity) {
            filteredRules = filteredRules.filter(rule => {
              const severity = rule.labels?.severity || rule.annotations?.severity;
              return filter.severity?.includes(severity);
            });
          }
          
          if (filter.noDataState) {
            filteredRules = filteredRules.filter(rule => 
              filter.noDataState?.includes(rule.noDataState)
            );
          }
          
          if (filter.folderUID) {
            filteredRules = filteredRules.filter(rule => 
              filter.folderUID?.includes(rule.folderUID)
            );
          }
          
          if (params.title) {
            filteredRules = filteredRules.filter(rule =>
              rule.title.toLowerCase().includes(params.title.toLowerCase())
            );
          }
          
          // Apply sorting
          if (sort?.updatedAt) {
            filteredRules.sort((a, b) => {
              const dateA = new Date(a.updatedAt || 0).getTime();
              const dateB = new Date(b.updatedAt || 0).getTime();
              return sort.updatedAt === 'ascend' ? dateA - dateB : dateB - dateA;
            });
          }
          
          return {
            data: filteredRules,
            success: true,
            total: filteredRules.length,
          };
        }}
        columns={columns}
        rowSelection={canManageAlerts ? {
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        } : undefined}
        search={{
          labelWidth: 'auto',
          searchText: 'Search',
          resetText: 'Reset',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} rules`,
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          if (!canManageAlerts) return false;
          if (selectedRowKeys.length === 0) return false;
          return (
            <Alert
              message={
                <Space>
                  <span>{selectedRowKeys.length} rules selected</span>
                  <Button
                    size="small"
                    onClick={() => handleBulkAction('disable')}
                  >
                    Disable
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleBulkAction('export')}
                  >
                    Export
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete
                  </Button>
                </Space>
              }
              type="info"
              showIcon
              closable
              onClose={() => setSelectedRowKeys([])}
            />
          );
        }}
      />

      {/* Details Drawer */}
      <Drawer
        title={`Rule Details: ${selectedRule?.title}`}
        placement="right"
        width={640}
        open={detailsDrawerVisible}
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedRule(null);
        }}
        extra={
          canManageAlerts ? (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/alerts/rules/${selectedRule?.uid}/edit`)}
              >
                Edit
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={() => {
                  setDetailsDrawerVisible(false);
                  setAssignmentModalVisible(true);
                }}
              >
                Assign
              </Button>
            </Space>
          ) : null
        }
      >
        {selectedRule && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="General Information" column={1}>
              <Descriptions.Item label="UID">{selectedRule.uid}</Descriptions.Item>
              <Descriptions.Item label="Title">{selectedRule.title}</Descriptions.Item>
              <Descriptions.Item label="Folder">{selectedRule.folderUID || 'General'}</Descriptions.Item>
              <Descriptions.Item label="Rule Group">{selectedRule.ruleGroup}</Descriptions.Item>
              <Descriptions.Item label="Condition">{selectedRule.condition}</Descriptions.Item>
              <Descriptions.Item label="No Data State">{selectedRule.noDataState}</Descriptions.Item>
              <Descriptions.Item label="Error State">{selectedRule.execErrState}</Descriptions.Item>
              <Descriptions.Item label="For">{selectedRule.for || '5m'}</Descriptions.Item>
            </Descriptions>

            {selectedRule.annotations && (
              <Descriptions title="Annotations" column={1}>
                {Object.entries(selectedRule.annotations).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}

            {selectedRule.labels && (
              <Descriptions title="Labels" column={1}>
                {Object.entries(selectedRule.labels).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    <Tag>{String(value)}</Tag>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}

            <Card title="Query Details" extra={
              <Button
                size="small"
                icon={<CodeOutlined />}
                onClick={() => showSqlQuery(selectedRule)}
              >
                View Full Query
              </Button>
            }>
              <Text code>
                {selectedRule.data?.[0]?.model?.rawSql?.substring(0, 200) || 'No query available'}
                {(selectedRule.data?.[0]?.model?.rawSql?.length || 0) > 200 && '...'}
              </Text>
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Assignment Modal */}
      {selectedRule && canManageAlerts && (
        <RuleAssignmentModal
          visible={assignmentModalVisible}
          onClose={() => {
            setAssignmentModalVisible(false);
            actionRef.current?.reload();
          }}
          rule={selectedRule}
        />
      )}

      {/* SQL Query Modal */}
      <SqlQueryModal
        visible={sqlModalVisible}
        query={selectedQuery.query}
        title={selectedQuery.title}
        datasource={selectedQuery.datasource}
        onClose={() => setSqlModalVisible(false)}
      />
    </PageContainer>
  );
}
