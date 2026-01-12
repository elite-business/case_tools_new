'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  PageContainer, 
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProCard,
} from '@ant-design/pro-components';
import { 
  Button, 
  Space, 
  message,
  Row,
  Col,
  Alert,
  Tag,
  Card,
  Select,
  Input,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  TagOutlined,
  UserOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { casesApi, usersApi, handleApiError } from '@/lib/api-client';
import { CreateCaseRequest, User, CaseSeverity, CasePriority } from '@/lib/types';

const severityColors: Record<CaseSeverity, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#ffa940',
  MEDIUM: '#fadb14',
  LOW: '#52c41a',
};

const priorityColors: Record<CasePriority, string> = {
  1: '#ff4d4f',
  2: '#ffa940',
  3: '#fadb14',
  4: '#52c41a',
};

const severityDescriptions: Record<CaseSeverity, string> = {
  CRITICAL: 'System is down or major business impact',
  HIGH: 'Significant functionality impaired',
  MEDIUM: 'Minor functionality impaired',
  LOW: 'Cosmetic or enhancement request',
};

const priorityDescriptions: Record<CasePriority, string> = {
  1: 'Requires immediate attention',
  2: 'Should be addressed soon',
  3: 'Normal priority',
  4: 'Can be addressed when resources allow',
};

const commonCategories = [
  'Technical Issue',
  'Service Request',
  'Bug Report',
  'Feature Request',
  'Network Issue',
  'Security Incident',
  'Performance Issue',
  'User Access',
  'Data Issue',
  'Configuration',
  'Integration',
  'Other'
];

const commonTags = [
  'urgent',
  'customer-impacting',
  'internal',
  'network',
  'security',
  'performance',
  'data-loss',
  'access-issue',
  'bug',
  'enhancement',
  'maintenance',
  'monitoring'
];

export default function NewCasePage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // Fetch available users for assignment
  const { data: users } = useQuery({
    queryKey: ['users', 'available-for-assignment'],
    queryFn: () => usersApi.getAvailableForAssignment(),
  });

  // Create case mutation
  const createCaseMutation = useMutation({
    mutationFn: (data: CreateCaseRequest) => casesApi.create(data),
    onSuccess: (response) => {
      message.success('Case created successfully');
      const newCase = response.data;
      router.push(`/cases/${newCase.id}`);
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const handleSubmit = async (values: any) => {
    const caseData: CreateCaseRequest = {
      title: values.title,
      description: values.description,
      severity: values.severity,
      priority: values.priority,
      category: values.category,
      tags: selectedTags,
      assignedToUserId: values.assignedToUserId,
    };

    createCaseMutation.mutate(caseData);
  };

  const handleAddTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags([...selectedTags, customTag]);
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleQuickAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <PageContainer
      title="Create New Case"
      subTitle="Submit a new case for tracking and resolution"
      onBack={() => router.back()}
      extra={[
        <Button 
          key="cancel"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/cases')}
        >
          Cancel
        </Button>,
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ProCard title="Case Information" headerBordered>
            <ProForm
              onFinish={handleSubmit}
              submitter={{
                searchConfig: {
                  resetText: 'Reset',
                  submitText: 'Create Case',
                },
                render: (props, doms) => [
                  <Button key="reset" onClick={() => props.form?.resetFields?.()}>
                    Reset
                  </Button>,
                  <Button
                    key="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={createCaseMutation.isPending}
                    onClick={() => props.form?.submit?.()}
                  >
                    Create Case
                  </Button>,
                ],
              }}
              layout="vertical"
            >
              <ProFormText 
                name="title" 
                label="Case Title"
                placeholder="Brief description of the issue or request"
                rules={[
                  { required: true, message: 'Title is required' },
                  { min: 10, message: 'Title must be at least 10 characters' },
                  { max: 200, message: 'Title must not exceed 200 characters' }
                ]}
                extra="Provide a clear, concise title that describes the main issue or request"
              />
              
              <ProFormTextArea 
                name="description" 
                label="Description"
                placeholder="Detailed description of the issue, including steps to reproduce, expected behavior, and any relevant context"
                fieldProps={{ 
                  rows: 8,
                  showCount: true,
                  maxLength: 2000,
                }}
                rules={[
                  { required: true, message: 'Description is required' },
                  { min: 20, message: 'Description must be at least 20 characters' }
                ]}
                extra="Include as much relevant detail as possible to help with faster resolution"
              />

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <ProFormSelect
                    name="severity"
                    label="Severity"
                    placeholder="Select severity level"
                    options={Object.entries(severityDescriptions).map(([value, description]) => ({
                      label: (
                        <div>
                          <Tag color={severityColors[value as CaseSeverity]} style={{ marginRight: 8 }}>
                            {value}
                          </Tag>
                          {description}
                        </div>
                      ),
                      value,
                    }))}
                    rules={[{ required: true, message: 'Severity is required' }]}
                    extra="How severely does this issue impact business operations?"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <ProFormSelect
                    name="priority"
                    label="Priority"
                    placeholder="Select priority level"
                    options={Object.entries(priorityDescriptions).map(([value, description]) => ({
                      label: (
                        <div>
                          <Tag style={{ marginRight: 8 }}>
                            {value}
                          </Tag>
                          {description}
                        </div>
                      ),
                      value,
                    }))}
                    rules={[{ required: true, message: 'Priority is required' }]}
                    extra="How urgently does this need to be addressed?"
                  />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <ProFormSelect
                    name="category"
                    label="Category"
                    placeholder="Select a category"
                    options={commonCategories.map(category => ({
                      label: category,
                      value: category,
                    }))}
                    rules={[{ required: true, message: 'Category is required' }]}
                    extra="What type of issue or request is this?"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <ProFormSelect
                    name="assignedToUserId"
                    label="Assign To (Optional)"
                    placeholder="Select user to assign this case to"
                    options={users?.data?.filter((user: User) => user && user.id != null).map((user: User) => ({
                      value: user.id,
                      label: `${user.fullName} (${user.email})`,
                    })) || []}
                    extra="Leave blank to assign later"
                    fieldProps={{
                      showSearch: true,
                      allowClear: true,
                      filterOption: (input: string, option?: { label?: string }) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                    }}
                  />
                </Col>
              </Row>

              {/* Tags Section */}
              <div>
                <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>
                  Tags (Optional)
                </label>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Space wrap>
                      {selectedTags.map(tag => (
                        <Tag
                          key={tag}
                          closable
                          onClose={() => handleRemoveTag(tag)}
                          color="blue"
                        >
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Add Custom Tag */}
                <div style={{ marginBottom: 12 }}>
                  <Input.Group compact>
                    <Input
                      style={{ width: 'calc(100% - 100px)' }}
                      placeholder="Add custom tag"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onPressEnter={handleAddTag}
                    />
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={handleAddTag}
                      disabled={!customTag || selectedTags.includes(customTag)}
                    >
                      Add
                    </Button>
                  </Input.Group>
                </div>

                {/* Quick Add Common Tags */}
                <div>
                  <div style={{ marginBottom: 8, color: '#666', fontSize: '12px' }}>
                    Quick add common tags:
                  </div>
                  <Space wrap>
                    {commonTags
                      .filter(tag => !selectedTags.includes(tag))
                      .map(tag => (
                        <Tag
                          key={tag}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleQuickAddTag(tag)}
                        >
                          <PlusOutlined style={{ fontSize: '10px' }} /> {tag}
                        </Tag>
                      ))
                    }
                  </Space>
                </div>
              </div>
            </ProForm>
          </ProCard>
        </Col>

        <Col xs={24} lg={8}>
          {/* Guidelines */}
          <ProCard title="Guidelines" headerBordered style={{ marginBottom: 16 }}>
            <Alert
              message="Tips for creating effective cases"
              description={
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li>Use clear, descriptive titles</li>
                  <li>Provide step-by-step reproduction steps</li>
                  <li>Include error messages or screenshots if applicable</li>
                  <li>Specify the expected vs actual behavior</li>
                  <li>Add relevant tags for better organization</li>
                </ul>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          </ProCard>

          {/* Severity & Priority Guide */}
          <ProCard title="Severity & Priority Guide" headerBordered>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Severity Levels:</h4>
              {Object.entries(severityDescriptions).map(([level, description]) => (
                <div key={level} style={{ marginBottom: 8 }}>
                  <Tag color={severityColors[level as CaseSeverity]} style={{ minWidth: 80 }}>
                    {level}
                  </Tag>
                  <span style={{ fontSize: '12px' }}>{description}</span>
                </div>
              ))}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div>
              <h4 style={{ marginBottom: 8 }}>Priority Levels:</h4>
              {(Object.entries(priorityDescriptions) as unknown as [CasePriority, string][]).map(([level, description]) => (
                <div key={level} style={{ marginBottom: 8 }}>
                  <Tag color={priorityColors[level]} style={{ minWidth: 80 }}>
                    {level}
                  </Tag>
                  <span style={{ fontSize: '12px' }}>{description}</span>
                </div>
              ))}
            </div>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
