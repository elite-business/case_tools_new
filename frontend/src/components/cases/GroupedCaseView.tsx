'use client';

import React, { useMemo } from 'react';
import { Table, Card, Tag, Space, Badge, Collapse, Empty, Typography, Row, Col, Statistic } from 'antd';
import { 
  FlagOutlined, 
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Case, CaseStatus, CaseSeverity } from '@/lib/types';
import { GroupByOption } from './CaseGroupingControls';
import StatusIndicator from '@/components/ui-system/StatusIndicator';
import dayjs from 'dayjs';

const { Panel } = Collapse;
const { Text, Title } = Typography;

interface GroupedCaseViewProps {
  cases: Case[];
  groupBy: GroupByOption;
  showNestedTable?: boolean;
  onCaseClick?: (caseId: number) => void;
  loading?: boolean;
}

// Helper function to group cases
const groupCases = (cases: Case[], groupBy: GroupByOption) => {
  if (groupBy === 'none') return { 'All Cases': cases };

  const grouped: Record<string, Case[]> = {};

  cases.forEach(caseItem => {
    let key: string;
    
    switch (groupBy) {
      case 'category':
        key = caseItem.category || 'Uncategorized';
        break;
      case 'status':
        key = caseItem.status || 'Unknown';
        break;
      case 'priority':
        const priorityLabels = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low' };
        key = priorityLabels[caseItem.priority as keyof typeof priorityLabels] || 'Unknown';
        break;
      case 'severity':
        key = caseItem.severity || 'Unknown';
        break;
      case 'team':
        key = caseItem.assignedTeams?.[0]?.name || 'Unassigned';
        break;
      case 'user':
        key = caseItem.assignedUsers?.[0]?.name || caseItem.assignedUsers?.[0]?.fullName || 'Unassigned';
        break;
      case 'slaStatus':
        key = caseItem.slaBreached ? 'SLA Breached' : 'Within SLA';
        break;
      default:
        key = 'Other';
    }
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(caseItem);
  });

  return grouped;
};

// Get group icon based on grouping type
const getGroupIcon = (groupBy: GroupByOption, groupName: string) => {
  switch (groupBy) {
    case 'status':
      return <StatusIndicator type="status" value={groupName as CaseStatus} showText={false} />;
    case 'priority':
      return <FlagOutlined style={{ color: groupName === 'Urgent' ? '#ff4d4f' : groupName === 'High' ? '#fa8c16' : '#1677ff' }} />;
    case 'severity':
      return <ExclamationCircleOutlined style={{ color: groupName === 'CRITICAL' ? '#ff4d4f' : groupName === 'HIGH' ? '#fa8c16' : '#1677ff' }} />;
    case 'team':
      return <TeamOutlined />;
    case 'user':
      return <UserOutlined />;
    case 'slaStatus':
      return groupName === 'SLA Breached' ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    default:
      return null;
  }
};

// Nested table columns
const nestedTableColumns = [
  {
    title: 'Case #',
    dataIndex: 'caseNumber',
    key: 'caseNumber',
    width: 120,
    render: (text: string, record: Case) => (
      <a onClick={() => window.location.href = `/cases/${record.id}`}>
        {text}
      </a>
    ),
  },
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: CaseStatus) => <StatusIndicator type="status" value={status} showText />,
  },
  {
    title: 'Assigned To',
    key: 'assignedTo',
    width: 200,
    render: (_, record: Case) => (
      <Space size="small" wrap>
        {record.assignedUsers?.map(user => (
          <Tag key={user.id} icon={<UserOutlined />}>
            {user.name || user.fullName}
          </Tag>
        ))}
        {record.assignedTeams?.map(team => (
          <Tag key={team.id} icon={<TeamOutlined />} color="blue">
            {team.name}
          </Tag>
        ))}
        {!record.assignedUsers?.length && !record.assignedTeams?.length && (
          <Text type="secondary">Unassigned</Text>
        )}
      </Space>
    ),
  },
  {
    title: 'SLA',
    key: 'sla',
    width: 100,
    render: (_, record: Case) => {
      const hoursElapsed = dayjs().diff(dayjs(record.createdAt), 'hours');
      const isBreached = record.slaBreached || hoursElapsed > 24;
      return (
        <Tag color={isBreached ? 'error' : 'success'} icon={<ClockCircleOutlined />}>
          {hoursElapsed}h
        </Tag>
      );
    },
  },
  {
    title: 'Created',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
    render: (date: string) => dayjs(date).format('MMM D, YYYY'),
  },
];

const GroupedCaseView: React.FC<GroupedCaseViewProps> = ({
  cases,
  groupBy,
  showNestedTable = true,
  onCaseClick,
  loading = false,
}) => {
  const groupedCases = useMemo(() => groupCases(cases, groupBy), [cases, groupBy]);
  const groupNames = Object.keys(groupedCases).sort();

  if (cases.length === 0 && !loading) {
    return (
      <Empty 
        description="No cases found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Calculate statistics for each group
  const getGroupStats = (groupCases: Case[]) => {
    const stats = {
      total: groupCases.length,
      open: groupCases.filter(c => c.status === 'OPEN').length,
      inProgress: groupCases.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
      resolved: groupCases.filter(c => c.status === 'RESOLVED').length,
      slaBreached: groupCases.filter(c => c.slaBreached).length,
    };
    return stats;
  };

  return (
    <div>
      {groupBy === 'none' ? (
        // Simple table view without grouping
        <Table
          dataSource={cases}
          columns={nestedTableColumns}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          onRow={(record) => ({
            onClick: () => onCaseClick?.(record.id),
            style: { cursor: 'pointer' },
          })}
        />
      ) : (
        // Grouped view
        <Collapse 
          defaultActiveKey={groupNames.slice(0, 3)} // Expand first 3 groups by default
          expandIconPosition="right"
        >
          {groupNames.map(groupName => {
            const groupCasesList = groupedCases[groupName];
            const stats = getGroupStats(groupCasesList);
            
            return (
              <Panel
                key={groupName}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                      {getGroupIcon(groupBy, groupName)}
                      <Text strong>{groupName}</Text>
                      <Badge count={stats.total} style={{ backgroundColor: '#1677ff' }} />
                    </Space>
                    <Space size="large" onClick={e => e.stopPropagation()}>
                      <Statistic 
                        value={stats.open} 
                        suffix={<Text type="secondary" style={{ fontSize: 12 }}>Open</Text>}
                        valueStyle={{ fontSize: 14 }}
                      />
                      <Statistic 
                        value={stats.inProgress} 
                        suffix={<Text type="secondary" style={{ fontSize: 12 }}>In Progress</Text>}
                        valueStyle={{ fontSize: 14, color: '#722ed1' }}
                      />
                      <Statistic 
                        value={stats.resolved} 
                        suffix={<Text type="secondary" style={{ fontSize: 12 }}>Resolved</Text>}
                        valueStyle={{ fontSize: 14, color: '#52c41a' }}
                      />
                      {stats.slaBreached > 0 && (
                        <Statistic 
                          value={stats.slaBreached} 
                          suffix={<Text type="secondary" style={{ fontSize: 12 }}>SLA Breach</Text>}
                          valueStyle={{ fontSize: 14, color: '#ff4d4f' }}
                        />
                      )}
                    </Space>
                  </div>
                }
                style={{ marginBottom: 16 }}
              >
                {showNestedTable ? (
                  <Table
                    dataSource={groupCasesList}
                    columns={nestedTableColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    onRow={(record) => ({
                      onClick: () => onCaseClick?.(record.id),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ) : (
                  // Card view for non-nested display
                  <Row gutter={[16, 16]}>
                    {groupCasesList.map(caseItem => (
                      <Col key={caseItem.id} xs={24} sm={12} lg={8} xl={6}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => onCaseClick?.(caseItem.id)}
                          title={
                            <Space>
                              <Text strong>{caseItem.caseNumber}</Text>
                              <StatusIndicator type="status" value={caseItem.status} size="small" />
                            </Space>
                          }
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text ellipsis>{caseItem.title}</Text>
                            <Space wrap>
                              <Tag color={caseItem.severity === 'CRITICAL' ? 'error' : 'default'}>
                                {caseItem.severity}
                              </Tag>
                              {caseItem.slaBreached && (
                                <Tag color="error" icon={<WarningOutlined />}>
                                  SLA Breach
                                </Tag>
                              )}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(caseItem.createdAt).fromNow()}
                            </Text>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Panel>
            );
          })}
        </Collapse>
      )}
    </div>
  );
};

export default GroupedCaseView;