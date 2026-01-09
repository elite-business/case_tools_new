'use client';

import React, { useState } from 'react';
import {
  Button,
  Dropdown,
  Modal,
  Form,
  Input,
  Space,
  message,
  Select,
  Tooltip,
  Badge,
  Typography,
  Alert,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  RiseOutlined,
  MergeOutlined,
  MoreOutlined,
  ExclamationOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/lib/api-client';
import { Case, QuickActionRequest, QuickActionResponse } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import type { MenuProps } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

interface QuickActionsProps {
  case: Case;
  onSuccess?: () => void;
  size?: 'small' | 'middle' | 'large';
  type?: 'dropdown' | 'buttons';
  disabled?: boolean;
  showLabels?: boolean;
}

interface QuickActionModalProps {
  visible: boolean;
  action: 'acknowledge' | 'false-positive' | 'escalate' | 'merge';
  case: Case;
  onCancel: () => void;
  onSuccess: () => void;
}

function QuickActionModal({ visible, action, case: caseItem, onCancel, onSuccess }: QuickActionModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // Fetch available cases for merging
  const { data: availableCases } = useQuery({
    queryKey: ['cases', 'available-for-merge', caseItem.id],
    queryFn: async () => {
      const response = await apiClient.get(`/cases?status=OPEN,ASSIGNED,IN_PROGRESS&excludeId=${caseItem.id}&category=${caseItem.category}&severity=${caseItem.severity}`);
      return response.data.content || [];
    },
    enabled: action === 'merge' && visible,
  });

  const handleSubmit = async (values: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const payload: QuickActionRequest = {
        caseId: caseItem.id,
        userId: user.id,
        action: action.toUpperCase().replace('-', '_') as any,
        notes: values.notes,
        reason: values.reason,
        secondaryCaseIds: values.secondaryCaseIds,
      };

      let endpoint = '';
      switch (action) {
        case 'acknowledge':
          endpoint = `/quick-actions/acknowledge/${caseItem.id}?userId=${user.id}&notes=${encodeURIComponent(values.notes || '')}`;
          break;
        case 'false-positive':
          endpoint = `/quick-actions/false-positive/${caseItem.id}?userId=${user.id}&reason=${encodeURIComponent(values.reason)}`;
          break;
        case 'escalate':
          endpoint = `/quick-actions/escalate/${caseItem.id}?userId=${user.id}&reason=${encodeURIComponent(values.reason)}`;
          break;
        case 'merge':
          endpoint = `/quick-actions/merge?primaryCaseId=${caseItem.id}&secondaryCaseIds=${values.secondaryCaseIds.join(',')}&userId=${user.id}`;
          break;
      }

      const response = await apiClient.post(endpoint);
      
      message.success(response.data.message || `Case ${action} completed successfully`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const getModalConfig = () => {
    switch (action) {
      case 'acknowledge':
        return {
          title: 'Acknowledge Case',
          icon: <CheckOutlined style={{ color: '#52c41a' }} />,
          confirmText: 'Acknowledge',
          fields: [
            <Form.Item key="notes" name="notes" label="Notes (Optional)">
              <TextArea rows={3} placeholder="Add any notes about acknowledging this case..." />
            </Form.Item>
          ]
        };
      
      case 'false-positive':
        return {
          title: 'Mark as False Positive',
          icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
          confirmText: 'Mark False Positive',
          fields: [
            <Form.Item key="reason" name="reason" label="Reason" rules={[{ required: true, message: 'Please provide a reason' }]}>
              <TextArea rows={3} placeholder="Explain why this is a false positive..." />
            </Form.Item>
          ]
        };
      
      case 'escalate':
        return {
          title: 'Escalate Case',
          icon: <RiseOutlined style={{ color: '#fa8c16' }} />,
          confirmText: 'Escalate',
          fields: [
            <Form.Item key="reason" name="reason" label="Escalation Reason" rules={[{ required: true, message: 'Please provide escalation reason' }]}>
              <TextArea rows={3} placeholder="Explain why this case needs escalation..." />
            </Form.Item>
          ]
        };
      
      case 'merge':
        return {
          title: 'Merge Cases',
          icon: <MergeOutlined style={{ color: '#722ed1' }} />,
          confirmText: 'Merge Cases',
          fields: [
            <Form.Item key="secondaryCaseIds" name="secondaryCaseIds" label="Cases to Merge" rules={[{ required: true, message: 'Please select cases to merge' }]}>
              <Select
                mode="multiple"
                placeholder="Select similar cases to merge into this one"
                loading={!availableCases}
                options={availableCases?.map((c: Case) => ({
                  value: c.id,
                  label: `${c.caseNumber} - ${c.title}`,
                  disabled: c.id === caseItem.id,
                }))}
                maxTagCount={3}
              />
            </Form.Item>
          ]
        };
      
      default:
        return { title: 'Quick Action', confirmText: 'Execute' };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      title={
        <Space>
          {config.icon}
          {config.title}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={config.confirmText}
      okButtonProps={{
        type: action === 'false-positive' ? 'primary' : 'primary',
        danger: action === 'false-positive',
      }}
      width={action === 'merge' ? 600 : 500}
    >
      <Alert
        message={
          action === 'acknowledge' ? 'This will mark the case as acknowledged by you.' :
          action === 'false-positive' ? 'This will close the case as a false positive. This action cannot be undone.' :
          action === 'escalate' ? 'This will increase the case priority and assign to escalation team.' :
          action === 'merge' ? 'This will merge selected cases into the current case. Secondary cases will be closed.' :
          'Execute quick action on case'
        }
        type={action === 'false-positive' ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Text strong>Case: {caseItem.caseNumber}</Text>
        <Text>{caseItem.title}</Text>
        <Space>
          <Badge status={caseItem.severity === 'CRITICAL' ? 'error' : caseItem.severity === 'HIGH' ? 'warning' : 'processing'} text={caseItem.severity} />
          <Badge color="blue" text={caseItem.status.replace('_', ' ')} />
        </Space>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {config.fields}
      </Form>
    </Modal>
  );
}

export default function QuickActions({ 
  case: caseItem, 
  onSuccess, 
  size = 'small', 
  type = 'dropdown',
  disabled = false,
  showLabels = false 
}: QuickActionsProps) {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    action: 'acknowledge' | 'false-positive' | 'escalate' | 'merge' | null;
  }>({
    visible: false,
    action: null,
  });

  const queryClient = useQueryClient();

  const handleActionClick = (action: 'acknowledge' | 'false-positive' | 'escalate' | 'merge') => {
    setModalState({ visible: true, action });
  };

  const handleModalClose = () => {
    setModalState({ visible: false, action: null });
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    onSuccess?.();
    handleModalClose();
  };

  const isClosedOrCancelled = caseItem.status === 'CLOSED' || caseItem.status === 'CANCELLED';
  const isResolved = caseItem.status === 'RESOLVED';
  
  const quickActionItems: MenuProps['items'] = [
    {
      key: 'acknowledge',
      icon: <CheckOutlined style={{ color: '#52c41a' }} />,
      label: 'Acknowledge Case',
      onClick: () => handleActionClick('acknowledge'),
      disabled: disabled || isClosedOrCancelled || isResolved,
    },
    {
      key: 'false-positive',
      icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      label: 'Mark False Positive',
      onClick: () => handleActionClick('false-positive'),
      disabled: disabled || isClosedOrCancelled || isResolved,
    },
    {
      key: 'escalate',
      icon: <RiseOutlined style={{ color: '#fa8c16' }} />,
      label: 'Escalate Case',
      onClick: () => handleActionClick('escalate'),
      disabled: disabled || isClosedOrCancelled || isResolved,
    },
    {
      type: 'divider',
    },
    {
      key: 'merge',
      icon: <MergeOutlined style={{ color: '#722ed1' }} />,
      label: 'Merge Similar Cases',
      onClick: () => handleActionClick('merge'),
      disabled: disabled || isClosedOrCancelled || isResolved,
    },
  ];

  if (type === 'buttons') {
    return (
      <Space size="small">
        <Tooltip title="Acknowledge Case">
          <Button
            size={size}
            icon={<CheckOutlined />}
            onClick={() => handleActionClick('acknowledge')}
            disabled={disabled || isClosedOrCancelled || isResolved}
            type="primary"
            ghost
          >
            {showLabels && 'Acknowledge'}
          </Button>
        </Tooltip>
        
        <Tooltip title="Mark as False Positive">
          <Button
            size={size}
            icon={<CloseOutlined />}
            onClick={() => handleActionClick('false-positive')}
            disabled={disabled || isClosedOrCancelled || isResolved}
            danger
            ghost
          >
            {showLabels && 'False Positive'}
          </Button>
        </Tooltip>
        
        <Tooltip title="Escalate Case">
          <Button
            size={size}
            icon={<RiseOutlined />}
            onClick={() => handleActionClick('escalate')}
            disabled={disabled || isClosedOrCancelled || isResolved}
            style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
            ghost
          >
            {showLabels && 'Escalate'}
          </Button>
        </Tooltip>
        
        <Tooltip title="Merge Similar Cases">
          <Button
            size={size}
            icon={<MergeOutlined />}
            onClick={() => handleActionClick('merge')}
            disabled={disabled || isClosedOrCancelled || isResolved}
            style={{ borderColor: '#722ed1', color: '#722ed1' }}
            ghost
          >
            {showLabels && 'Merge'}
          </Button>
        </Tooltip>

        <QuickActionModal
          visible={modalState.visible}
          action={modalState.action!}
          case={caseItem}
          onCancel={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      </Space>
    );
  }

  return (
    <>
      <Dropdown
        menu={{ items: quickActionItems }}
        trigger={['click']}
        placement="bottomRight"
        disabled={disabled}
      >
        <Button
          size={size}
          icon={<ThunderboltOutlined />}
          type="primary"
          ghost
          disabled={disabled}
        >
          Quick Actions
        </Button>
      </Dropdown>

      <QuickActionModal
        visible={modalState.visible}
        action={modalState.action!}
        case={caseItem}
        onCancel={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

// Export bulk quick actions component for multiple case selection
export function BulkQuickActions({ 
  selectedCases, 
  onSuccess,
  disabled = false 
}: {
  selectedCases: Case[];
  onSuccess?: () => void;
  disabled?: boolean;
}) {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    action: 'acknowledge' | 'false-positive' | 'escalate' | null;
  }>({
    visible: false,
    action: null,
  });

  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleBulkAction = async (action: string, values: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const promises = selectedCases.map(caseItem => {
        let endpoint = '';
        switch (action) {
          case 'acknowledge':
            endpoint = `/quick-actions/acknowledge/${caseItem.id}?userId=${user.id}&notes=${encodeURIComponent(values.notes || '')}`;
            break;
          case 'false-positive':
            endpoint = `/quick-actions/false-positive/${caseItem.id}?userId=${user.id}&reason=${encodeURIComponent(values.reason)}`;
            break;
          case 'escalate':
            endpoint = `/quick-actions/escalate/${caseItem.id}?userId=${user.id}&reason=${encodeURIComponent(values.reason)}`;
            break;
        }
        return apiClient.post(endpoint);
      });

      await Promise.all(promises);
      message.success(`${selectedCases.length} cases ${action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      onSuccess?.();
      setModalState({ visible: false, action: null });
    } catch (error) {
      message.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const bulkActionItems: MenuProps['items'] = [
    {
      key: 'bulk-acknowledge',
      icon: <CheckOutlined style={{ color: '#52c41a' }} />,
      label: `Acknowledge ${selectedCases.length} Cases`,
      onClick: () => setModalState({ visible: true, action: 'acknowledge' }),
      disabled: disabled || selectedCases.length === 0,
    },
    {
      key: 'bulk-false-positive',
      icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      label: `Mark ${selectedCases.length} as False Positive`,
      onClick: () => setModalState({ visible: true, action: 'false-positive' }),
      disabled: disabled || selectedCases.length === 0,
    },
    {
      key: 'bulk-escalate',
      icon: <RiseOutlined style={{ color: '#fa8c16' }} />,
      label: `Escalate ${selectedCases.length} Cases`,
      onClick: () => setModalState({ visible: true, action: 'escalate' }),
      disabled: disabled || selectedCases.length === 0,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: bulkActionItems }}
        trigger={['click']}
        placement="bottomLeft"
        disabled={disabled || selectedCases.length === 0}
      >
        <Button
          icon={<ThunderboltOutlined />}
          disabled={disabled || selectedCases.length === 0}
        >
          Bulk Quick Actions ({selectedCases.length})
        </Button>
      </Dropdown>

      <Modal
        title={`Bulk ${modalState.action} - ${selectedCases.length} Cases`}
        open={modalState.visible}
        onCancel={() => setModalState({ visible: false, action: null })}
        footer={[
          <Button key="cancel" onClick={() => setModalState({ visible: false, action: null })}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            danger={modalState.action === 'false-positive'}
            onClick={() => {
              // Handle form submission for bulk actions
              const values = modalState.action === 'acknowledge' 
                ? { notes: '' }
                : { reason: `Bulk ${modalState.action} by ${user?.username}` };
              handleBulkAction(modalState.action!, values);
            }}
          >
            {modalState.action === 'acknowledge' ? 'Acknowledge All' :
             modalState.action === 'false-positive' ? 'Mark All False Positive' :
             modalState.action === 'escalate' ? 'Escalate All' : 'Execute'}
          </Button>,
        ]}
      >
        <Alert
          message={`This will ${modalState.action} ${selectedCases.length} selected cases`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {selectedCases.map(caseItem => (
            <div key={caseItem.id} style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
              <Text strong>{caseItem.caseNumber}</Text> - {caseItem.title}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}