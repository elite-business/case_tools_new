'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { 
  Button, 
  Space, 
  message, 
  Row, 
  Col, 
  Statistic, 
  Card,
  Select,
  DatePicker,
  Input,
  Tag,
  Dropdown,
  Tooltip,
  Segmented,
  Switch
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  TeamOutlined,
  UserOutlined,
  DashboardOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { casesApi } from '@/lib/api-client';
import { Case, CaseFilters, CaseStatus, CaseSeverity } from '@/lib/types';
import CaseGroupingControls, { GroupByOption, ViewMode } from '@/components/cases/CaseGroupingControls';
import GroupedCaseView from '@/components/cases/GroupedCaseView';
import { useAuthStore } from '@/store/auth-store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Search } = Input;

export default function CasesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<CaseFilters>({});
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showNestedTable, setShowNestedTable] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMyTeamOnly, setShowMyTeamOnly] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<CaseStatus[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<CaseSeverity[]>([]);

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAnalystOrViewer = user?.role === 'ANALYST' || user?.role === 'VIEWER';

  useEffect(() => {
    if (isManagerOrAdmin) {
      setShowAdvanced(true);
    }
  }, [isManagerOrAdmin]);

  // Default to "My Cases" view for Analyst/Viewer roles
  useEffect(() => {
    if (isAnalystOrViewer) {
      setFilters(prev => ({ ...prev, assignedTo: user?.id ? [user.id] : [] }));
      setShowMyTeamOnly(true);
    }
  }, [isAnalystOrViewer, user]);

  // Fetch cases with filters
  const { data: casesData, isLoading, refetch } = useQuery({
    queryKey: ['cases', 'enhanced', filters],
    queryFn: () => {
      const queryParams: any = {
        ...filters,
        status: selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined,
        severity: selectedSeverities.length > 0 ? selectedSeverities.join(',') : undefined,
      };

      if (filters.assignedTo && filters.assignedTo.length > 0) {
        queryParams.assignedToId = filters.assignedTo[0];
        delete queryParams.assignedTo;
      }

      if (!isManagerOrAdmin && user?.id) {
        queryParams.assignedToId = user.id;
        queryParams.includeTeamCases = true;
      } else if (showMyTeamOnly && user?.id) {
        queryParams.assignedToId = user.id;
        queryParams.includeTeamCases = true;
      }

      return casesApi.getAll(queryParams);
    },
  });

  // Fetch case statistics
  const { data: statsData } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesApi.getStats?.() || Promise.resolve({
      data: {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        overdue: 0,
        breachedSla: 0,
      }
    }),
  });

  const cases = casesData?.data?.content || [];
  const stats = statsData?.data;
  const derivedStats = {
    total: cases.length,
    open: cases.filter((item: Case) => item.status === 'OPEN').length,
    inProgress: cases.filter((item: Case) => ['ASSIGNED', 'IN_PROGRESS'].includes(item.status)).length,
    resolved: cases.filter((item: Case) => item.status === 'RESOLVED').length,
    closed: cases.filter((item: Case) => item.status === 'CLOSED').length,
    overdue: cases.filter((item: Case) => item.slaBreached).length,
    breachedSla: cases.filter((item: Case) => item.slaBreached).length,
  };
  const displayStats = stats && stats.total > 0 ? stats : derivedStats;

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        dateFrom: dates[0]?.startOf('day').toISOString(),
        dateTo: dates[1]?.endOf('day').toISOString(),
      }));
    } else {
      setFilters(prev => {
        const { dateFrom, dateTo, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleExport = () => {
    message.info('Exporting cases...');
    // Implement export functionality
  };

  const handleBulkAction = (action: string) => {
    message.info(`Bulk action: ${action}`);
    // Implement bulk actions
  };

  return (
    <PageContainer
      header={{
        title: 'Enhanced Case Management',
        breadcrumb: {
          items: [
            { title: 'Home', path: '/' },
            { title: 'Cases', path: '/cases' },
            { title: 'Enhanced View' },
          ],
        },
      }}
      extra={[
        isManagerOrAdmin && (
          <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/cases/new')}
          disabled={!isManagerOrAdmin}
        >
          Create Case
        </Button>
        ),
        isManagerOrAdmin && (
          <Dropdown
          key="bulk"
          disabled={!isManagerOrAdmin}
          menu={{
            items: [
              { key: 'assign', label: 'Bulk Assign' },
              { key: 'close', label: 'Bulk Close' },
              { key: 'export', label: 'Export Selected' },
            ],
            onClick: ({ key }) => handleBulkAction(key),
          }}
        >
          <Button>Bulk Actions</Button>
        </Dropdown>
        ),
        <Tooltip key="export" title="Export to CSV">
          <Button icon={<ExportOutlined />} onClick={handleExport} />
        </Tooltip>,
        <Tooltip key="refresh" title="Refresh">
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
        </Tooltip>,
      ]}
      content={
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Statistics Cards */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Cases"
                  value={displayStats.total || 0}
                  prefix={<DashboardOutlined />}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Open Cases"
                  value={displayStats.open || 0}
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="In Progress"
                  value={displayStats.inProgress || 0}
                  prefix={<SyncOutlined spin />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="SLA Breached"
                  value={displayStats.breachedSla || 0}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: displayStats.breachedSla > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Filters and Controls */}
          <ProCard>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Quick Filters */}
              <Row gutter={[16, 16]} align="middle">
                <Col flex="auto">
                  <Space wrap>
                    {isManagerOrAdmin && (
                      <Segmented
                        value={showMyTeamOnly ? 'team' : 'all'}
                        onChange={(value) => {
                          setShowMyTeamOnly(value === 'team');
                          if (value === 'team' && user?.id) {
                            setFilters(prev => ({ ...prev, assignedTo: [user.id] }));
                          } else {
                            setFilters(prev => {
                              const { assignedTo, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        options={[
                          { label: 'All Cases', value: 'all', icon: <DashboardOutlined /> },
                          { label: 'My Team', value: 'team', icon: <TeamOutlined /> },
                        ]}
                      />
                    )}
                    
                    <Select
                      mode="multiple"
                      placeholder="Status"
                      style={{ minWidth: 150 }}
                      value={selectedStatuses}
                      onChange={setSelectedStatuses}
                      options={[
                        { label: 'Open', value: 'OPEN' },
                        { label: 'Assigned', value: 'ASSIGNED' },
                        { label: 'In Progress', value: 'IN_PROGRESS' },
                        { label: 'Resolved', value: 'RESOLVED' },
                        { label: 'Closed', value: 'CLOSED' },
                      ]}
                      allowClear
                    />

                    <Select
                      mode="multiple"
                      placeholder="Severity"
                      style={{ minWidth: 150 }}
                      value={selectedSeverities}
                      onChange={setSelectedSeverities}
                      options={[
                        { label: 'Critical', value: 'CRITICAL', style: { color: '#ff4d4f' } },
                        { label: 'High', value: 'HIGH', style: { color: '#fa8c16' } },
                        { label: 'Medium', value: 'MEDIUM', style: { color: '#fadb14' } },
                        { label: 'Low', value: 'LOW', style: { color: '#52c41a' } },
                      ]}
                      allowClear
                    />

                    <RangePicker 
                      onChange={handleDateRangeChange}
                      format="YYYY-MM-DD"
                    />

                    <Search
                      placeholder="Search cases..."
                      onSearch={handleSearch}
                      style={{ width: 250 }}
                      allowClear
                    />
                  </Space>
                </Col>
              </Row>

              {/* Grouping Controls */}
              <CaseGroupingControls
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showNestedTable={showNestedTable}
                onNestedTableChange={setShowNestedTable}
                userRole={user?.role}
                showAdvanced={showAdvanced}
                onAdvancedChange={setShowAdvanced}
              />
            </Space>
          </ProCard>
        </Space>
      }
    >
      {/* Grouped Case View */}
      <GroupedCaseView
        cases={cases}
        groupBy={groupBy}
        viewMode={viewMode}
        showNestedTable={showNestedTable}
        onCaseClick={(id) => router.push(`/cases/${id}`)}
        loading={isLoading}
      />
    </PageContainer>
  );
}
