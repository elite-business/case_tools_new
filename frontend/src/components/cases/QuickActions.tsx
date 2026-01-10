'use client';

import React, { useState } from 'react';
import { Button, Dropdown, Modal, Form, Input, Select, message, Space, Tooltip } from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  ArrowUpOutlined, 
  MergeOutlined, 
  MoreOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { confirm } = Modal;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Case, QuickActionRequest, QuickActionResponse } from '@/lib/types';
import { casesApi, handleApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface QuickActionsProps {
  case: Case;
  onSuccess?: () => void;
  onActionComplete?: (action: string, result: QuickActionResponse) => void;
  size?: 'small' | 'middle' | 'large';
  type?: 'buttons' | 'dropdown';
  disabled?: boolean;
  compact?: boolean; // For backward compatibility
}

interface ActionModalProps {
  visible: boolean;
  action: 'ACKNOWLEDGE' | 'FALSE_POSITIVE' | 'ESCALATE' | 'MERGE';
  case: Case;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading?: boolean;
}

const ActionModal: React.FC<ActionModalProps> = ({
  visible,
  action,
  case: caseData,
  onCancel,
  onSubmit,
  loading
}) => {
  const [form] = Form.useForm();

  const getModalConfig = () => {
    switch (action) {
      case 'ACKNOWLEDGE':
        return {
          title: 'Acknowledge Case',
          icon: <CheckOutlined style={{ color: '#52c41a' }} />,
          description: `Acknowledge case ${caseData.caseNumber} to indicate you are working on it.`,
          fields: [
            {
              name: 'notes',
              label: 'Notes (Optional)',
              required: false,
              component: <Input.TextArea rows={3} placeholder="Add any notes about acknowledgment..." />
            }
          ]
        };
      
      case 'FALSE_POSITIVE':
        return {
          title: 'Mark as False Positive',
          icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
          description: `Mark case ${caseData.caseNumber} as a false positive and close it.`,
          fields: [
            {
              name: 'reason',
              label: 'Reason',
              required: true,
              component: (
                <Select placeholder="Select reason for false positive">
                  <Select.Option value="duplicate_alert">Duplicate Alert</Select.Option>
                  <Select.Option value="test_data">Test Data</Select.Option>
                  <Select.Option value="configuration_error">Configuration Error</Select.Option>
                  <Select.Option value="data_quality_issue">Data Quality Issue</Select.Option>
                  <Select.Option value="threshold_too_sensitive">Threshold Too Sensitive</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              )
            },
            {
              name: 'notes',
              label: 'Additional Notes',
              required: false,
              component: <Input.TextArea rows={3} placeholder="Provide details about why this is a false positive..." />
            }
          ]
        };
      
      case 'ESCALATE':
        return {
          title: 'Escalate Case',
          icon: <ArrowUpOutlined style={{ color: '#faad14' }} />,
          description: `Escalate case ${caseData.caseNumber} to higher priority or management.`,
          fields: [
            {
              name: 'reason',
              label: 'Escalation Reason',
              required: true,
              component: (
                <Select placeholder="Select escalation reason">
                  <Select.Option value="sla_breach">SLA Breach</Select.Option>
                  <Select.Option value="high_impact">High Business Impact</Select.Option>
                  <Select.Option value="technical_complexity">Technical Complexity</Select.Option>
                  <Select.Option value="customer_escalation">Customer Escalation</Select.Option>
                  <Select.Option value="resource_needed">Additional Resources Needed</Select.Option>
                  <Select.Option value="management_attention">Management Attention Required</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              )
            },
            {
              name: 'notes',
              label: 'Escalation Details',
              required: true,
              component: <Input.TextArea rows={3} placeholder="Provide details about the escalation..." />
            }
          ]
        };
      
      case 'MERGE':
        return {
          title: 'Merge Cases',
          icon: <MergeOutlined style={{ color: '#1890ff' }} />,
          description: `Merge related cases into case ${caseData.caseNumber}.`,
          fields: [
            {
              name: 'secondaryCaseIds',
              label: 'Cases to Merge',
              required: true,
              component: (
                <Select 
                  mode="multiple"
                  placeholder="Select cases to merge into this case"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {/* TODO: Load available cases for merging */}
                </Select>
              )
            },
            {
              name: 'notes',
              label: 'Merge Notes',
              required: false,
              component: <Input.TextArea rows={3} placeholder="Add notes about the merge..." />
            }
          ]
        };
      
      default:
        return { title: '', icon: null, description: '', fields: [] };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      open={visible}
      title={
        <Space>
          {config.icon}
          {config.title}
        </Space>
      }
      onCancel={onCancel}
      confirmLoading={loading}
      onOk={() => {
        form.validateFields().then((values) => {
          onSubmit(values);
        });
      }}
      okText="Confirm"
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <p>{config.description}</p>
      </div>
      
      <Form form={form} layout="vertical">
        {config.fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `Please provide ${field.label.toLowerCase()}` }] : []}
          >
            {field.component}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export const QuickActions: React.FC<QuickActionsProps> = ({ 
  case: caseData, 
  onSuccess,
  onActionComplete,
  size = 'small',
  type = 'dropdown',
  disabled = false,
  compact = false // Keep for backward compatibility
}) => {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    action: 'ACKNOWLEDGE' | 'FALSE_POSITIVE' | 'ESCALATE' | 'MERGE' | null;
  }>({ visible: false, action: null });

  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Quick action mutation
  const quickActionMutation = useMutation({
    mutationFn: (request: QuickActionRequest) => casesApi.performQuickAction(request),
    onSuccess: (response, variables) => {
      const result = response.data as QuickActionResponse;
      message.success(result.message || `${variables.action} completed successfully`);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
      
      // Close modal
      setModalState({ visible: false, action: null });
      
      // Notify parent components
      if (onSuccess) {
        onSuccess();
      }
      if (onActionComplete) {
        onActionComplete(variables.action, result);
      }
    },
    onError: (error) => {
      console.error('Quick action error:', error);
      message.error('Failed to perform quick action');
    }
  });

  const handleAction = (action: 'ACKNOWLEDGE' | 'FALSE_POSITIVE' | 'ESCALATE' | 'MERGE') => {
    setModalState({ visible: true, action });
  };

  const handleModalSubmit = (values: any) => {
    if (!modalState.action || !user) return;

    const request: QuickActionRequest = {
      caseId: caseData.id,
      userId: user.id,
      action: modalState.action,
      notes: values.notes,
      reason: values.reason,
      secondaryCaseIds: values.secondaryCaseIds
    };

    quickActionMutation.mutate(request);
  };

  const handleModalCancel = () => {
    setModalState({ visible: false, action: null });
  };

  // Check if case is already acknowledged/closed
  const isAcknowledged = caseData.status === 'IN_PROGRESS' || caseData.status === 'ASSIGNED';
  const isClosed = caseData.status === 'CLOSED' || caseData.status === 'RESOLVED';

  const actions = [
    {
      key: 'acknowledge',
      label: 'Acknowledge',
      icon: <CheckOutlined />,
      disabled: disabled || isAcknowledged || isClosed,
      action: () => handleAction('ACKNOWLEDGE'),
      tooltip: isAcknowledged ? 'Case already acknowledged' : 'Acknowledge and start working on case'
    },
    {
      key: 'false-positive',
      label: 'False Positive',
      icon: <CloseOutlined />,
      disabled: disabled || isClosed,
      action: () => handleAction('FALSE_POSITIVE'),
      tooltip: 'Mark case as false positive and close it'
    },
    {
      key: 'escalate',
      label: 'Escalate',
      icon: <ArrowUpOutlined />,
      disabled: disabled || isClosed,
      action: () => handleAction('ESCALATE'),
      tooltip: 'Escalate case to higher priority'
    },
    {
      key: 'merge',
      label: 'Merge',
      icon: <MergeOutlined />,
      disabled: disabled || isClosed,
      action: () => handleAction('MERGE'),
      tooltip: 'Merge with other related cases'
    }
  ];

  if (type === 'dropdown' || compact) {
    // Compact view - show as dropdown
    const dropdownItems = actions.map(action => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      disabled: action.disabled,
      onClick: action.action
    }));

    return (
      <>
        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button 
            type="text" 
            size={size}
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>

        <ActionModal
          visible={modalState.visible}
          action={modalState.action!}
          case={caseData}
          onCancel={handleModalCancel}
          onSubmit={handleModalSubmit}
          loading={quickActionMutation.isPending}
        />
      </>
    );
  }

  // Full view - show individual buttons
  return (
    <>
      <Space size="small">
        {actions.map(action => (
          <Tooltip key={action.key} title={action.tooltip}>
            <Button
              type="text"
              size={size}
              icon={action.icon}
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                action.action();
              }}
            >
              {size !== 'small' && action.label}
            </Button>
          </Tooltip>
        ))}
      </Space>

      <ActionModal
        visible={modalState.visible}
        action={modalState.action!}
        case={caseData}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
        loading={quickActionMutation.isPending}
      />
    </>
  );
};

// BulkQuickActions component for handling multiple selected cases
interface BulkQuickActionsProps {
  selectedCases: Case[];
  onSuccess?: () => void;
  disabled?: boolean;
}

export const BulkQuickActions: React.FC<BulkQuickActionsProps> = ({
  selectedCases,
  onSuccess,
  disabled = false
}) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const bulkAssignMutation = useMutation({
    mutationFn: ({ caseIds, userId, notes }: { caseIds: number[], userId: number, notes?: string }) => 
      casesApi.bulkAssign(caseIds, userId, notes),
    onSuccess: () => {
      message.success(`Successfully assigned ${selectedCases.length} cases`);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Bulk assign error:', error);
      message.error('Failed to assign cases');
    }
  });

  const bulkCloseMutation = useMutation({
    mutationFn: ({ caseIds, resolution, notes }: { caseIds: number[], resolution: string, notes?: string }) => 
      casesApi.bulkClose(caseIds, resolution, notes),
    onSuccess: () => {
      message.success(`Successfully closed ${selectedCases.length} cases`);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Bulk close error:', error);
      message.error('Failed to close cases');
    }
  });

  const handleBulkAssign = () => {
    if (!user || selectedCases.length === 0) return;
    
    const caseIds = selectedCases.map(c => c.id);
    bulkAssignMutation.mutate({ 
      caseIds, 
      userId: user.id, 
      notes: `Bulk assigned ${selectedCases.length} cases` 
    });
  };

  const handleBulkClose = () => {
    if (selectedCases.length === 0) return;
    
    confirm({
      title: `Close ${selectedCases.length} cases?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to close all selected cases as resolved?',
      onOk: () => {
        const caseIds = selectedCases.map(c => c.id);
        bulkCloseMutation.mutate({ 
          caseIds, 
          resolution: 'Bulk closed as resolved',
          notes: `Bulk closed ${selectedCases.length} cases`
        });
      }
    });
  };

  if (selectedCases.length === 0) {
    return null;
  }

  return (
    <Space>
      <span style={{ fontSize: 12, color: '#666' }}>
        {selectedCases.length} selected
      </span>
      <Button
        size="small"
        icon={<UserAddOutlined />}
        onClick={handleBulkAssign}
        loading={bulkAssignMutation.isPending}
        disabled={disabled}
      >
        Assign to Me
      </Button>
      <Button
        size="small"
        icon={<CheckCircleOutlined />}
        onClick={handleBulkClose}
        loading={bulkCloseMutation.isPending}
        disabled={disabled}
      >
        Close All
      </Button>
    </Space>
  );
};

export default QuickActions;