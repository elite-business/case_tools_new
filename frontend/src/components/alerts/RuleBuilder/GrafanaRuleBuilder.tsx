'use client';

import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
  Table,
  InputNumber,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { alertsApi, handleApiError } from '@/lib/api-client';
import '../../../styles/grafana-rule-builder.css';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface QueryResult {
  columns: string[];
  rows: any[][];
}

interface GrafanaRuleBuilderProps {
  className?: string;
}

const GrafanaRuleBuilder: React.FC<GrafanaRuleBuilderProps> = ({ className }) => {
  const [form] = Form.useForm();
  const [selectedSchema, setSelectedSchema] = useState<string>();
  const [selectedTable, setSelectedTable] = useState<string>();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // Fetch schemas
  const { data: schemas, isLoading: loadingSchemas } = useQuery({
    queryKey: ['alert-schemas'],
    queryFn: () => alertsApi.getSchemas(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch tables for selected schema
  const { data: tables, isLoading: loadingTables } = useQuery({
    queryKey: ['alert-tables', selectedSchema],
    queryFn: () => alertsApi.getTables(selectedSchema!),
    enabled: !!selectedSchema,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch columns for selected table
  const { data: columns, isLoading: loadingColumns } = useQuery({
    queryKey: ['alert-columns', selectedSchema, selectedTable],
    queryFn: () => alertsApi.getColumns(selectedSchema!, selectedTable!),
    enabled: !!(selectedSchema && selectedTable),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Grafana contact points
  const { data: contactPoints } = useQuery({
    queryKey: ['grafana-contact-points'],
    queryFn: () => alertsApi.getGrafanaContactPoints(),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Grafana folders
  const { data: folders, isLoading: loadingFolders } = useQuery({
    queryKey: ['grafana-folders'],
    queryFn: () => alertsApi.getGrafanaFolders(),
    staleTime: 10 * 60 * 1000,
  });

  // Test query mutation
  const testQueryMutation = useMutation({
    mutationFn: (query: string) => alertsApi.testRule({ query, limit: 100 }),
    onMutate: () => {
      setIsTestingQuery(true);
    },
    onSuccess: (response: any) => {
      const result: QueryResult = response.data;
      const formattedData = result.rows.map((row: any[], index: number) => {
        const obj: any = { key: index };
        result.columns.forEach((col: string, colIndex: number) => {
          obj[col] = row[colIndex];
        });
        return obj;
      });
      setTestResults(formattedData);
      setIsTestingQuery(false);
      message.success(`Query executed successfully! ${result.rows.length} rows returned.`);
    },
    onError: (error) => {
      setTestResults([]);
      setIsTestingQuery(false);
      message.error(handleApiError(error));
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data: any) => alertsApi.createWithV1(data),
    onSuccess: () => {
      message.success('Alert rule created successfully in Grafana!');
      form.resetFields();
      setSelectedSchema(undefined);
      setSelectedTable(undefined);
      setTestResults([]);
      setCustomQuery('');
    },
    onError: (error) => {
      message.error(handleApiError(error));
    },
  });

  const handleSchemaChange = (value: string) => {
    setSelectedSchema(value);
    setSelectedTable(undefined);
    form.setFieldsValue({ table: undefined });
  };

  const handleTableChange = (value: string) => {
    setSelectedTable(value);
    // Auto-generate basic query
    if (selectedSchema && value) {
      const basicQuery = `SELECT COUNT(*) as count FROM ${selectedSchema}.${value}`;
      setCustomQuery(basicQuery);
      form.setFieldsValue({ query: basicQuery });
    }
  };

  const handleTestQuery = () => {
    const query = form.getFieldValue('query') || customQuery;
    if (!query.trim()) {
      message.error('Please enter a SQL query to test');
      return;
    }
    testQueryMutation.mutate(query);
  };

  const handleSubmit = (values: any) => {
    const ruleData = {
      name: values.name,
      description: values.description,
      query: values.query || customQuery,
      severity: values.severity,
      category: values.category,
      evaluationInterval: values.evaluationInterval,
      evaluationFor: values.evaluationFor,
      thresholdOperator: values.thresholdOperator,
      thresholdValue: values.thresholdValue,
      contactPoints: values.contactPoints || [],
      folderUID: values.folder,
      type: 'THRESHOLD',
    };

    createRuleMutation.mutate(ruleData);
  };

  const generateTableColumns = () => {
    if (testResults.length === 0) return [];
    return Object.keys(testResults[0])
      .filter(key => key !== 'key')
      .map(key => ({
        title: key.charAt(0).toUpperCase() + key.slice(1),
        dataIndex: key,
        key: key,
        ellipsis: true,
        width: 150,
      }));
  };

  return (
    <div className={`grafana-rule-builder ${className || ''}`}>
      <div className="grafana-rule-header">
        <h1>Create Alert Rule</h1>
        <p className="subtitle">
          Create intelligent alert rules with Grafana integration
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          severity: 'MEDIUM',
          category: 'revenue',
          evaluationInterval: '1m',
          evaluationFor: '5m',
          thresholdOperator: 'above',
        }}
      >
        <div className="grafana-rule-sections">
          {/* Basic Configuration */}
          <div className="grafana-rule-section">
            <div className="grafana-rule-section-content">
              <h2 className="grafana-section-title">Basic Configuration</h2>
              
              <div className="grafana-form-grid grafana-form-grid--two-col">
                <div className="grafana-field">
                  <Form.Item
                    name="name"
                    label="Alert Rule Name"
                    rules={[{ required: true, message: 'Please enter alert name' }]}
                  >
                    <Input placeholder="Enter a descriptive name for this alert rule" />
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item name="description" label="Description">
                    <Input placeholder="Describe what this alert monitors" />
                  </Form.Item>
                </div>
              </div>
              
              <div className="grafana-form-grid grafana-form-grid--three-col">
                <div className="grafana-field">
                  <Form.Item
                    name="severity"
                    label="Severity Level"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="LOW">Low</Option>
                      <Option value="MEDIUM">Medium</Option>
                      <Option value="HIGH">High</Option>
                      <Option value="CRITICAL">Critical</Option>
                    </Select>
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="revenue">Revenue Assurance</Option>
                      <Option value="network">Network Performance</Option>
                      <Option value="fraud">Fraud Detection</Option>
                      <Option value="qos">Quality of Service</Option>
                      <Option value="data_quality">Data Quality</Option>
                    </Select>
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item name="folder" label="Grafana Folder">
                    <Select
                      placeholder="Select folder (optional)"
                      allowClear
                      loading={loadingFolders}
                      notFoundContent={loadingFolders ? "Loading..." : "No folders found"}
                    >
                      {((folders as any)?.data || []).filter((folder: any) => folder && (folder.id || folder.uid)).map((folder: any, index: number) => (
                        <Option key={`folder-${folder.uid || folder.id}-${index}`} value={folder.uid || folder.id}>
                          {folder.title || folder.name || 'Unnamed Folder'}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>

          {/* Query Configuration */}
          <div className="grafana-rule-section">
            <div className="grafana-rule-section-content">
              <h2 className="grafana-section-title">Query</h2>
              
              <div className="grafana-form-grid grafana-form-grid--three-col">
                <div className="grafana-field">
                  <Form.Item label="Database Schema">
                    <Select
                      value={selectedSchema}
                      onChange={handleSchemaChange}
                      placeholder="Select schema"
                      loading={loadingSchemas}
                      showSearch
                    >
                      {schemas?.data?.filter((schema: any) => schema && schema.schema_name).map((schema: any, index: number) => (
                        <Option key={`schema-${schema.schema_name}-${index}`} value={schema.schema_name}>
                          {schema.schema_name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item label="Table">
                    <Select
                      value={selectedTable}
                      onChange={handleTableChange}
                      placeholder="Select table"
                      loading={loadingTables}
                      disabled={!selectedSchema}
                      showSearch
                    >
                      {tables?.data?.filter((table: any) => table && table.table_name).map((table: any, index: number) => (
                        <Option key={`table-${table.table_name}-${index}`} value={table.table_name}>
                          <div>
                            <div>{table.table_name}</div>
                            {table.size && (
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                Size: {table.size}
                              </Text>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item label="Available Columns">
                    <Select
                      placeholder={selectedTable ? "Select columns to use" : "Select table first"}
                      disabled={!selectedTable}
                      loading={loadingColumns}
                      mode="multiple"
                      showSearch
                    >
                      {columns?.data?.filter((column: any) => column && column.column_name).map((column: any, index: number) => (
                        <Option key={`column-${column.column_name}-${index}`} value={column.column_name}>
                          {column.column_name} ({column.data_type})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </div>

              <div className="grafana-field">
                <Form.Item
                  name="query"
                  label="SQL Query"
                  rules={[{ required: true, message: 'Please enter SQL query' }]}
                >
                  <TextArea
                    rows={6}
                    placeholder="Enter your SQL query here..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    className="grafana-sql-editor"
                  />
                </Form.Item>
              </div>

              <div className="grafana-action-group" style={{ marginBottom: '16px' }}>
                <Button
                  type="primary"
                  onClick={handleTestQuery}
                  loading={isTestingQuery}
                >
                  Test Query
                </Button>
                {testResults.length > 0 && (
                  <Text style={{ color: 'var(--grafana-success)', fontSize: '13px' }}>
                    Query returned {testResults.length} rows
                  </Text>
                )}
              </div>

              {/* Test Results */}
              {testResults.length > 0 && (
                <div className="grafana-query-results">
                  <div className="grafana-query-results-header">
                    <h3 className="grafana-query-results-title">Query Results Preview</h3>
                    <span className="grafana-query-results-meta">{testResults.length} rows</span>
                  </div>
                  <Table
                    dataSource={testResults}
                    columns={generateTableColumns()}
                    size="small"
                    pagination={{ pageSize: 5, showSizeChanger: false }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Alert Conditions */}
          <div className="grafana-rule-section">
            <div className="grafana-rule-section-content">
              <h2 className="grafana-section-title">Alert Conditions</h2>
              
              <div className="grafana-form-grid grafana-form-grid--three-col">
                <div className="grafana-field">
                  <Form.Item
                    name="thresholdOperator"
                    label="Alert When Value Is"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="above">Above Threshold</Option>
                      <Option value="below">Below Threshold</Option>
                      <Option value="outside">Outside Range</Option>
                      <Option value="within">Within Range</Option>
                      <Option value="nodata">No Data Available</Option>
                    </Select>
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item
                    name="thresholdValue"
                    label="Threshold Value"
                    dependencies={['thresholdOperator']}
                    rules={[
                      ({ getFieldValue }) => ({
                        required: getFieldValue('thresholdOperator') !== 'nodata',
                        message: 'Please enter threshold value',
                      }),
                    ]}
                  >
                    <InputNumber
                      placeholder="Enter threshold value"
                      style={{ width: '100%' }}
                      precision={2}
                    />
                  </Form.Item>
                </div>
                <div className="grafana-field">
                  <Form.Item
                    name="evaluationInterval"
                    label="Evaluation Interval"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="1m" />
                  </Form.Item>
                  <p className="grafana-field-description">How often to check (e.g., 1m, 5m)</p>
                </div>
              </div>
              
              <div className="grafana-form-grid grafana-form-grid--two-col">
                <div className="grafana-field">
                  <Form.Item
                    name="evaluationFor"
                    label="Alert After Duration"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="5m" />
                  </Form.Item>
                  <p className="grafana-field-description">Condition must be true for this long</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="grafana-rule-section">
            <div className="grafana-rule-section-content">
              <h2 className="grafana-section-title">Notification Settings</h2>
              
              <div className="grafana-field">
                <Form.Item
                  name="contactPoints"
                  label="Notification Channels"
                  rules={[{ required: true, message: 'Please select at least one contact point' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select Grafana contact points"
                    loading={!contactPoints}
                  >
                    {contactPoints?.data?.filter((cp: any) => cp && cp.uid).map((cp: any, index: number) => (
                      <Option key={`cp-${cp.uid}-${index}`} value={cp.uid}>
                        {cp.name} ({cp.type})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="grafana-action-bar">
            <div></div>
            <div className="grafana-action-group">
              <Button
                onClick={() => {
                  form.resetFields();
                  setSelectedSchema(undefined);
                  setSelectedTable(undefined);
                  setTestResults([]);
                  setCustomQuery('');
                }}
              >
                Reset All
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createRuleMutation.isPending}
              >
                Create Alert Rule
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default GrafanaRuleBuilder;