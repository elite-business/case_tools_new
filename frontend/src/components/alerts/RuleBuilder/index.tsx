'use client';

import React, { useState } from 'react';
import {
  PageContainer,
  StepsForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDigit,
} from '@ant-design/pro-components';
import {
  Button,
  Space,
  Alert,
  Row,
  Col,
  Typography,
  Tag,
  message,
  Card,
  Table,
  Divider,
  Tooltip,
} from 'antd';
import {
  DatabaseOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { alertsApi, handleApiError } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { CreateAlertRuleRequest, TestQueryRequest } from '@/lib/types';

// Import our custom components
import SchemaSelector from './SchemaSelector';
import TableSelector from './TableSelector';
import ColumnSelector from './ColumnSelector';
import QueryBuilder from './QueryBuilder';
import SQLEditor from './SQLEditor';
import ContactPointSelector from './ContactPointSelector';
import FolderSelector from './FolderSelector';

const { Text, Paragraph } = Typography;

export default function AlertRuleBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const {
    // Query state
    selectedSchema,
    selectedTable,
    columns,
    queryMode,
    sqlQuery,
    testResults,
    isTestingQuery,
    testError,
    
    // Alert configuration
    alertName,
    alertDescription,
    severity,
    category,
    evaluationInterval,
    evaluationFor,
    thresholdOperator,
    thresholdValue,
    selectedContactPoints,
    selectedFolder,
    
    // Actions
    setQueryMode,
    setTestResults,
    setIsTestingQuery,
    setTestError,
    getCurrentQuery,
    validateCurrentQuery,
    reset,
  } = useAlertBuilderStore();

  // Test query mutation
  const testQueryMutation = useMutation({
    mutationFn: (data: TestQueryRequest) => alertsApi.testRule(data),
    onMutate: () => {
      setIsTestingQuery(true);
      setTestError(null);
    },
    onSuccess: (response) => {
      const { columns, rows } = response.data;
      const formattedData = rows.map((row: any[], index: number) => {
        const obj: any = { key: index };
        columns.forEach((col: string, colIndex: number) => {
          obj[col] = row[colIndex];
        });
        return obj;
      });
      setTestResults(formattedData);
      setIsTestingQuery(false);
      message.success(`Query executed successfully! ${rows.length} rows returned.`);
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      setTestError(errorMessage);
      setTestResults([]);
      setIsTestingQuery(false);
      message.error(errorMessage);
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data: CreateAlertRuleRequest) => alertsApi.createWithV1(data),
    onSuccess: () => {
      message.success('Alert rule created successfully in Grafana!');
      // Reset the store after successful creation
      setTimeout(() => {
        reset();
        setCurrentStep(0);
      }, 2000);
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const handleTestQuery = async () => {
    const query = getCurrentQuery();
    if (!query.trim()) {
      message.error('Please build or enter a SQL query to test');
      return;
    }

    testQueryMutation.mutate({
      query,
      limit: 100,
    });
  };

  const canProceedToNextStep = (step: number): boolean => {
    switch (step) {
      case 0: // Data Source Selection
        return Boolean(selectedSchema && selectedTable);
      case 1: // Query Building
        return Boolean(getCurrentQuery().trim());
      case 2: // Alert Configuration
        return Boolean(alertName && selectedContactPoints.length > 0);
      default:
        return true;
    }
  };

  const getStepValidationMessage = (step: number): string => {
    switch (step) {
      case 0:
        if (!selectedSchema) return 'Please select a database schema';
        if (!selectedTable) return 'Please select a database table';
        return '';
      case 1:
        if (!getCurrentQuery().trim()) return 'Please build or enter a SQL query';
        return '';
      case 2:
        if (!alertName) return 'Please enter an alert rule name';
        if (selectedContactPoints.length === 0) return 'Please select at least one notification channel';
        return '';
      default:
        return '';
    }
  };

  return (
    <PageContainer
      title="Alert Rule Builder"
      content="Create intelligent alert rules with visual query builder and Grafana integration"
      extra={[
        <Button key="reset" onClick={reset}>
          Reset All
        </Button>,
      ]}
    >
      <StepsForm
        current={currentStep}
        onCurrentChange={setCurrentStep}
        onFinish={async (values) => {
          try {
            const query = getCurrentQuery();
            const ruleData: CreateAlertRuleRequest = {
              name: alertName,
              description: alertDescription,
              query,
              severity,
              category,
              evaluationInterval,
              evaluationFor,
              thresholdOperator,
              thresholdValue,
              contactPoints: selectedContactPoints,
              folderId: selectedFolder,
              type: 'THRESHOLD',
            };
            
            await createRuleMutation.mutateAsync(ruleData);
            return true;
          } catch (error) {
            return false;
          }
        }}
        formProps={{
          validateMessages: {
            required: 'This field is required',
          },
        }}
        submitter={{
          render: (props) => {
            const currentStepValid = canProceedToNextStep(props.step || 0);
            const validationMessage = getStepValidationMessage(props.step || 0);
            
            return [
              <Button 
                key="prev" 
                onClick={() => props.onPre?.()}
                disabled={(props.step || 0) === 0}
              >
                Previous
              </Button>,
              !currentStepValid ? (
                <Tooltip title={validationMessage} key="next">
                  <span>
                    <Button
                      type="primary"
                      loading={createRuleMutation.isPending}
                      disabled={true}
                    >
                      {(props.step || 0) === 2 ? 'Create Alert Rule' : 'Next Step'}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  key="next"
                  type="primary"
                  onClick={() => props.onSubmit?.()}
                  loading={createRuleMutation.isPending}
                >
                  {(props.step || 0) === 2 ? 'Create Alert Rule' : 'Next Step'}
                </Button>
              ),
            ];
          },
        }}
      >
        {/* Step 1: Data Source Selection */}
        <StepsForm.StepForm
          name="datasource"
          title="Data Source"
          stepProps={{
            description: "Select database schema and table"
          }}
        >
          <Row gutter={24}>
            <Col span={8}>
              <SchemaSelector />
            </Col>
            <Col span={8}>
              <TableSelector />
            </Col>
            <Col span={8}>
              <ColumnSelector />
            </Col>
          </Row>

          {selectedSchema && selectedTable && (
            <Alert
              type="success"
              showIcon
              message="Data source configured successfully"
              description={`Ready to build queries on ${selectedSchema}.${selectedTable} with ${columns.length} available columns.`}
              className="mt-4"
            />
          )}
        </StepsForm.StepForm>

        {/* Step 2: Query Building */}
        <StepsForm.StepForm
          name="query"
          title="Build Query"
          stepProps={{
            description: "Create your alert query using visual builder or SQL editor"
          }}
        >
          <Card>
            <div className="mb-4">
              <Space>
                <Text strong>Query Mode:</Text>
                <Space.Compact>
                  <Button
                    type={queryMode === 'visual' ? 'primary' : 'default'}
                    onClick={() => setQueryMode('visual')}
                    icon={<FilterOutlined />}
                  >
                    Visual Builder
                  </Button>
                  <Button
                    type={queryMode === 'sql' ? 'primary' : 'default'}
                    onClick={() => setQueryMode('sql')}
                    icon={<DatabaseOutlined />}
                  >
                    SQL Editor
                  </Button>
                </Space.Compact>
              </Space>
            </div>

            {queryMode === 'visual' ? (
              <QueryBuilder />
            ) : (
              <SQLEditor />
            )}

            <Divider />

            {/* Query Testing */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Text strong>Test Your Query</Text>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleTestQuery}
                  loading={isTestingQuery}
                  disabled={!getCurrentQuery().trim()}
                >
                  Run Test
                </Button>
              </div>

              {/* Current Query Display */}
              {getCurrentQuery().trim() && (
                <Card size="small" className="mb-4">
                  <Text strong className="block mb-2">Current Query:</Text>
                  <div className="p-3 bg-gray-100 rounded border font-mono text-sm">
                    <Text code>{getCurrentQuery()}</Text>
                  </div>
                </Card>
              )}

              {/* Test Results */}
              {testResults.length > 0 && (
                <Card
                  title={
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      Query Test Results
                      <Tag color="green">{testResults.length} rows</Tag>
                    </Space>
                  }
                  size="small"
                  className="mb-4"
                >
                  <Table
                    dataSource={testResults}
                    columns={Object.keys(testResults[0]).filter(key => key !== 'key').map(key => ({
                      title: key.charAt(0).toUpperCase() + key.slice(1),
                      dataIndex: key,
                      key: key,
                      ellipsis: true,
                      width: 150,
                    }))}
                    size="small"
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      showQuickJumper: false,
                    }}
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              )}

              {/* Test Error */}
              {testError && (
                <Alert
                  message="Query Test Failed"
                  description={testError}
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  className="mb-4"
                />
              )}
            </div>
          </Card>
        </StepsForm.StepForm>

        {/* Step 3: Alert Configuration */}
        <StepsForm.StepForm
          name="alert"
          title="Alert Configuration"
          stepProps={{
            description: "Configure alert conditions and notifications"
          }}
        >
          <Row gutter={24}>
            {/* Basic Alert Settings */}
            <Col span={12}>
              <Card title="Alert Settings" size="small">
                <ProFormText
                  name="alertName"
                  label="Alert Rule Name"
                  rules={[{ required: true }]}
                  placeholder="Enter a descriptive name for this alert rule"
                  fieldProps={{
                    value: alertName,
                    onChange: (e) => useAlertBuilderStore.getState().setAlertName(e.target.value),
                  }}
                />
                
                <ProFormTextArea
                  name="alertDescription"
                  label="Description"
                  placeholder="Describe what this alert monitors and when it should trigger"
                  fieldProps={{
                    rows: 3,
                    value: alertDescription,
                    onChange: (e) => useAlertBuilderStore.getState().setAlertDescription(e.target.value),
                  }}
                />

                <ProFormSelect
                  name="severity"
                  label="Severity Level"
                  rules={[{ required: true }]}
                  options={[
                    { label: '🟢 Low - Informational alerts', value: 'LOW' },
                    { label: '🟡 Medium - Warning conditions', value: 'MEDIUM' },
                    { label: '🟠 High - Important issues', value: 'HIGH' },
                    { label: '🔴 Critical - Service affecting', value: 'CRITICAL' },
                  ]}
                  fieldProps={{
                    value: severity,
                    onChange: (value) => useAlertBuilderStore.getState().setSeverity(value),
                  }}
                />

                <ProFormSelect
                  name="category"
                  label="Category"
                  rules={[{ required: true }]}
                  options={[
                    { label: '💰 Revenue Assurance', value: 'revenue' },
                    { label: '📡 Network Performance', value: 'network' },
                    { label: '🛡️ Fraud Detection', value: 'fraud' },
                    { label: '⚡ Quality of Service', value: 'qos' },
                    { label: '📊 Data Quality', value: 'data_quality' },
                  ]}
                  fieldProps={{
                    value: category,
                    onChange: (value) => useAlertBuilderStore.getState().setCategory(value),
                  }}
                />
              </Card>
            </Col>

            {/* Alert Conditions */}
            <Col span={12}>
              <Card title="Alert Conditions" size="small">
                <ProFormSelect
                  name="thresholdOperator"
                  label="Alert When Value Is"
                  rules={[{ required: true }]}
                  options={[
                    { label: 'Above Threshold', value: 'above' },
                    { label: 'Below Threshold', value: 'below' },
                    { label: 'Outside Range', value: 'outside' },
                    { label: 'Within Range', value: 'within' },
                    { label: 'No Data Available', value: 'nodata' },
                  ]}
                  fieldProps={{
                    value: thresholdOperator,
                    onChange: (value) => useAlertBuilderStore.getState().setThresholdOperator(value),
                  }}
                />

                <ProFormDigit
                  name="thresholdValue"
                  label="Threshold Value"
                  rules={[{ required: thresholdOperator !== 'nodata' }]}
                  placeholder="Enter the threshold value"
                  fieldProps={{
                    precision: 2,
                    value: thresholdValue,
                    onChange: (value) => useAlertBuilderStore.getState().setThresholdValue(value),
                  }}
                />

                <ProFormText
                  name="evaluationInterval"
                  label="Evaluation Interval"
                  rules={[{ required: true }]}
                  placeholder="1m"
                  extra="How often to evaluate this rule (e.g., 1m, 5m, 1h)"
                  fieldProps={{
                    value: evaluationInterval,
                    onChange: (e) => useAlertBuilderStore.getState().setEvaluationInterval(e.target.value),
                  }}
                />

                <ProFormText
                  name="evaluationFor"
                  label="Alert After"
                  rules={[{ required: true }]}
                  placeholder="5m"
                  extra="How long the condition must be true before alerting"
                  fieldProps={{
                    value: evaluationFor,
                    onChange: (e) => useAlertBuilderStore.getState().setEvaluationFor(e.target.value),
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={24} className="mt-4">
            {/* Notification Configuration */}
            <Col span={12}>
              <ContactPointSelector />
            </Col>

            {/* Organization */}
            <Col span={12}>
              <FolderSelector />
            </Col>
          </Row>

          {/* Final Validation */}
          {alertName && selectedContactPoints.length > 0 && (
            <Alert
              type="success"
              showIcon
              message="Alert rule is ready to be created"
              description={
                <div>
                  <Paragraph className="mb-0">
                    <strong>{alertName}</strong> will monitor <Text code>{selectedSchema}.{selectedTable}</Text> and 
                    alert when conditions are met via {selectedContactPoints.length} notification channel{selectedContactPoints.length > 1 ? 's' : ''}.
                  </Paragraph>
                </div>
              }
              className="mt-4"
            />
          )}
        </StepsForm.StepForm>
      </StepsForm>
    </PageContainer>
  );
}