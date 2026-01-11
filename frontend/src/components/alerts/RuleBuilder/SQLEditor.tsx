'use client';

import React, { useCallback, useRef } from 'react';
import { Card, Space, Typography, Button, Alert, Row, Col, Tag, Tooltip } from 'antd';
import { 
  DatabaseOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  CopyOutlined,
  RedoOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import MonacoEditor from '@monaco-editor/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { ValidateQueryRequest } from '@/lib/types';

const { Text, Paragraph } = Typography;

interface SQLEditorProps {
  className?: string;
}

const SQLEditor: React.FC<SQLEditorProps> = ({ className }) => {
  const {
    selectedSchema,
    selectedTable,
    columns,
    sqlQuery,
    queryValidation,
    isValidatingQuery,
    setSqlQuery,
    setQueryValidation,
    setIsValidatingQuery,
    generateSqlFromVisual,
  } = useAlertBuilderStore();

  const editorRef = useRef<any>(null);

  // Get suggestions for the current schema/table
  const { data: suggestionsData } = useQuery({
    queryKey: ['alert-suggestions', selectedSchema, selectedTable],
    queryFn: () => 
      selectedSchema && selectedTable 
        ? alertsApi.getSuggestions(selectedSchema, selectedTable)
        : Promise.resolve({ data: [] }),
    enabled: Boolean(selectedSchema && selectedTable),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query validation mutation
  const validateMutation = useMutation({
    mutationFn: (data: ValidateQueryRequest) => alertsApi.validateQuery(data),
    onMutate: () => {
      setIsValidatingQuery(true);
    },
    onSuccess: (response) => {
      setQueryValidation(response.data);
      setIsValidatingQuery(false);
    },
    onError: (error: any) => {
      setQueryValidation({
        isValid: false,
        error: error.response?.data?.message || 'Query validation failed',
        suggestions: [],
      });
      setIsValidatingQuery(false);
    },
  });

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;
    
    // Configure SQL autocomplete and validation
    editor.updateOptions({
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      wordBasedSuggestions: true,
    });
  }, []);

  const handleQueryChange = useCallback((value: string | undefined) => {
    setSqlQuery(value || '');
    
    // Clear previous validation when query changes
    if (queryValidation) {
      setQueryValidation(null);
    }
  }, [setSqlQuery, queryValidation, setQueryValidation]);

  const handleValidateQuery = () => {
    if (!sqlQuery.trim()) {
      return;
    }

    validateMutation.mutate({
      query: sqlQuery,
      schema: selectedSchema || undefined,
      table: selectedTable || undefined,
    });
  };

  const handleUseVisualQuery = () => {
    const visualQuery = generateSqlFromVisual();
    setSqlQuery(visualQuery);
    if (editorRef.current) {
      editorRef.current.setValue(visualQuery);
    }
  };

  const handleCopyQuery = async () => {
    if (sqlQuery) {
      try {
        await navigator.clipboard.writeText(sqlQuery);
        // You could show a toast notification here
      } catch (err) {
        console.error('Failed to copy query:', err);
      }
    }
  };

  const getSampleQueries = () => {
    if (!selectedSchema || !selectedTable) return [];
    
    return [
      {
        title: 'Count Records',
        query: `SELECT COUNT(*) as total_count FROM ${selectedSchema}.${selectedTable}`,
        description: 'Count total number of records'
      },
      {
        title: 'Recent Records',
        query: `SELECT * FROM ${selectedSchema}.${selectedTable} 
          WHERE created_at >= NOW() - INTERVAL '1 hour' 
          ORDER BY created_at DESC 
          LIMIT 100`,
        description: 'Get records from the last hour'
      },
      {
        title: 'Aggregated Data',
        query: `SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as records,
          SUM(amount) as total_amount
          FROM ${selectedSchema}.${selectedTable}
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY hour
          ORDER BY hour DESC`,
        description: 'Hourly aggregation for the last 24 hours'
      }
    ];
  };

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined className="text-purple-600" />
          <span>SQL Query Editor</span>
          {selectedSchema && selectedTable && (
            <Tag color="purple" className="text-xs">
              {selectedSchema}.{selectedTable}
            </Tag>
          )}
        </Space>
      }
      size="small" 
      className={className}
      extra={
        <Space>
          {sqlQuery && (
            <Button 
              size="small" 
              icon={<CopyOutlined />}
              onClick={handleCopyQuery}
              type="text"
              title="Copy Query"
            />
          )}
          <Button 
            size="small" 
            icon={<RedoOutlined />}
            onClick={handleUseVisualQuery}
            type="text"
            title="Use Visual Query"
          />
        </Space>
      }
    >
      <Space direction="vertical" className="w-full" size="large">
        
        {/* Editor */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Text strong>Write Your SQL Query</Text>
            <Space>
              <Button
                size="small"
                onClick={handleUseVisualQuery}
                disabled={!selectedSchema || !selectedTable}
              >
                Import from Visual Builder
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={handleValidateQuery}
                loading={isValidatingQuery}
                disabled={!sqlQuery.trim()}
              >
                Validate Query
              </Button>
            </Space>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <MonacoEditor
              height="350px"
              defaultLanguage="sql"
              theme="vs"
              value={sqlQuery}
              onChange={handleQueryChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                wordWrap: 'on',
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        </div>

        {/* Query Validation Results */}
        {queryValidation && (
          <div>
            {queryValidation.isValid ? (
              <Alert
                type="success"
                icon={<CheckCircleOutlined />}
                message="Query is Valid"
                description={
                  <div>
                    <Paragraph className="mb-2">
                      Your SQL query passed validation successfully.
                    </Paragraph>
                    {queryValidation.estimatedRows && (
                      <Text type="secondary" className="text-sm">
                        Estimated result rows: {queryValidation.estimatedRows.toLocaleString()}
                      </Text>
                    )}
                  </div>
                }
                className="bg-green-50"
                showIcon
              />
            ) : (
              <Alert
                type="error"
                icon={<ExclamationCircleOutlined />}
                message="Query Validation Failed"
                description={
                  <div>
                    <Paragraph className="mb-2 text-red-700">
                      {queryValidation.error}
                    </Paragraph>
                    {queryValidation.suggestions && queryValidation.suggestions.length > 0 && (
                      <div>
                        <Text strong className="text-sm">Suggestions:</Text>
                        <ul className="mt-1 text-sm">
                          {queryValidation.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-gray-600">
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                }
                showIcon
              />
            )}
          </div>
        )}

        {/* Sample Queries */}
        {!sqlQuery && selectedSchema && selectedTable && (
          <div>
            <Text strong className="block mb-3">Sample Queries</Text>
            <Row gutter={16}>
              {getSampleQueries().map((sample, index) => (
                <Col span={8} key={index}>
                  <Card 
                    size="small" 
                    className="cursor-pointer hover:border-purple-400 transition-colors"
                    onClick={() => setSqlQuery(sample.query)}
                  >
                    <div className="text-center">
                      <Text strong className="block text-sm">{sample.title}</Text>
                      <Text type="secondary" className="text-xs block mt-1">
                        {sample.description}
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Query Suggestions from API */}
        {suggestionsData?.data && suggestionsData.data.length > 0 && (
          <div>
            <Text strong className="block mb-3">
              <Space>
                <span>Smart Query Suggestions</span>
                <Tooltip title="These suggestions are based on common patterns for your selected table">
                  <InfoCircleOutlined className="text-gray-400" />
                </Tooltip>
              </Space>
            </Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestionsData.data.slice(0, 4).map((suggestion: any, index: number) => (
                <Card 
                  key={index}
                  size="small" 
                  className="cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                  onClick={() => setSqlQuery(suggestion.query)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Text strong className="text-sm">{suggestion.title}</Text>
                      <Tag color={suggestion.category === 'revenue' ? 'gold' : 'blue'} className="text-xs">
                        {suggestion.category === 'revenue' ? 'business' : suggestion.category}
                      </Tag>
                    </div>
                    <Text type="secondary" className="text-xs block">
                      {suggestion.description}
                    </Text>
                    {suggestion.difficulty && (
                      <Tag 
                        color={
                          suggestion.difficulty === 'basic' ? 'green' : 
                          suggestion.difficulty === 'intermediate' ? 'orange' : 'red'
                        }
                        className="mt-2 text-xs"
                      >
                        {suggestion.difficulty}
                      </Tag>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Columns Reference */}
        {columns.length > 0 && (
          <div>
            <Text strong className="block mb-3">Available Columns</Text>
            <div className="p-3 bg-gray-50 rounded border max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {columns.map((column, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Text code className="text-xs">{column.name}</Text>
                    <Tag size="small" className="text-xs">
                      {column.type.toLowerCase()}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedSchema || !selectedTable ? (
          <Alert
            type="info"
            message="Schema and Table Required"
            description="Please select a schema and table first to enable advanced SQL editor features."
            showIcon
          />
        ) : null}
      </Space>
    </Card>
  );
};

export default SQLEditor;
