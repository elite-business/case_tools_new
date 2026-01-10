'use client';

import React from 'react';
import { Select, Space, Switch, Radio, Segmented } from 'antd';
import { 
  GroupOutlined, 
  TeamOutlined, 
  UserOutlined,
  FlagOutlined,
  ExclamationCircleOutlined,
  TagOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  TableOutlined
} from '@ant-design/icons';

export type GroupByOption = 
  | 'none' 
  | 'category' 
  | 'status' 
  | 'priority' 
  | 'severity' 
  | 'team' 
  | 'user'
  | 'slaStatus';

export type ViewMode = 'table' | 'cards' | 'kanban';

interface CaseGroupingControlsProps {
  groupBy: GroupByOption;
  onGroupByChange: (value: GroupByOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  showNestedTable?: boolean;
  onNestedTableChange?: (checked: boolean) => void;
  userRole?: string;
  showAdvanced?: boolean;
  onAdvancedChange?: (checked: boolean) => void;
}

const groupOptions = [
  { label: 'No Grouping', value: 'none', icon: <UnorderedListOutlined /> },
  { label: 'Category', value: 'category', icon: <AppstoreOutlined /> },
  { label: 'Status', value: 'status', icon: <TagOutlined /> },
  { label: 'Priority', value: 'priority', icon: <FlagOutlined /> },
  { label: 'Severity', value: 'severity', icon: <ExclamationCircleOutlined /> },
];

const advancedGroupOptions = [
  { label: 'Team', value: 'team', icon: <TeamOutlined /> },
  { label: 'Assigned User', value: 'user', icon: <UserOutlined /> },
  { label: 'SLA Status', value: 'slaStatus', icon: <GroupOutlined /> },
];

const CaseGroupingControls: React.FC<CaseGroupingControlsProps> = ({
  groupBy,
  onGroupByChange,
  viewMode,
  onViewModeChange,
  showNestedTable = false,
  onNestedTableChange,
  userRole,
  showAdvanced = false,
  onAdvancedChange,
}) => {
  const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';

  const allGroupOptions = isManagerOrAdmin && showAdvanced 
    ? [...groupOptions, ...advancedGroupOptions]
    : groupOptions;

  return (
    <Space size="middle" wrap>
      {/* View Mode Selector */}
      <Segmented
        value={viewMode}
        onChange={onViewModeChange}
        options={[
          { label: 'Table', value: 'table', icon: <TableOutlined /> },
          { label: 'Cards', value: 'cards', icon: <AppstoreOutlined /> },
          { label: 'Kanban', value: 'kanban', icon: <GroupOutlined /> },
        ]}
      />

      {/* Group By Selector */}
      <Select
        value={groupBy}
        onChange={onGroupByChange}
        style={{ width: 200 }}
        placeholder="Group by..."
        options={allGroupOptions.map(opt => ({
          label: (
            <Space>
              {opt.icon}
              {opt.label}
            </Space>
          ),
          value: opt.value,
        }))}
      />

      {/* Advanced Options Toggle for Managers/Admins */}
      {isManagerOrAdmin && onAdvancedChange && (
        <Space>
          <Switch
            checked={showAdvanced}
            onChange={onAdvancedChange}
            checkedChildren="Advanced"
            unCheckedChildren="Basic"
          />
        </Space>
      )}

      {/* Nested Table Toggle (only for grouped views) */}
      {groupBy !== 'none' && viewMode === 'table' && onNestedTableChange && (
        <Space>
          <Switch
            checked={showNestedTable}
            onChange={onNestedTableChange}
            checkedChildren="Nested"
            unCheckedChildren="Flat"
          />
        </Space>
      )}
    </Space>
  );
};

export default CaseGroupingControls;