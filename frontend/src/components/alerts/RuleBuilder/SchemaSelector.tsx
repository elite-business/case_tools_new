'use client';

import React, { useEffect } from 'react';
import { Select, Space, Typography, Card, Alert, Spin } from 'antd';
import { DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { DatabaseSchema } from '@/lib/types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface SchemaSelectorProps {
  className?: string;
}

const SchemaSelector: React.FC<SchemaSelectorProps> = ({ className }) => {
  const {
    schemas,
    selectedSchema,
    setSchemas,
    setSelectedSchema,
    setError,
    clearError,
  } = useAlertBuilderStore();

  const {
    data: schemasData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['alert-schemas'],
    queryFn: () => alertsApi.getSchemas(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  useEffect(() => {
    if (schemasData?.data) {
      setSchemas(schemasData.data);
    }
  }, [schemasData, setSchemas]);

  useEffect(() => {
    if (isError && error) {
      setError('schema', 'Failed to load database schemas');
    } else {
      clearError('schema');
    }
  }, [isError, error, setError, clearError]);

  const handleSchemaChange = (value: string | undefined) => {
    setSelectedSchema(value || null);
    clearError('schema');
  };

  const getSchemaDescription = (schemaName: string): string => {
    const descriptions: Record<string, string> = {
      'public': 'Main application data including users, cases, and alert rules',
      'stat': 'Statistical tables with aggregated telecom traffic data',
      'cdrs_archives': 'Historical CDR (Call Detail Records) data organized by date',
      'grafana': 'Grafana internal data and dashboard configurations'
    };
    return descriptions[schemaName] || 'Database schema containing various tables';
  };

  const getSchemaIcon = (schemaName: string): string => {
    const icons: Record<string, string> = {
      'public': '🏠',
      'stat': '📊',
      'cdrs_archives': '📚',
      'grafana': '📈'
    };
    return icons[schemaName] || '🗄️';
  };

  if (isLoading) {
    return (
      <Card title="Database Schema" size="small" className={className}>
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <Spin />
          <Text type="secondary" className="text-sm">Loading database schemas...</Text>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Database Schema" size="small" className={className}>
        <Alert
          type="error"
          message="Failed to Load Schemas"
          description="Unable to retrieve database schemas. Please check your connection and try again."
          showIcon
          action={
            <button 
              onClick={() => window.location.reload()}
              className="text-sm underline text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined className="text-blue-600" />
          <span>Database Schema</span>
        </Space>
      } 
      size="small" 
      className={className}
      extra={
        schemas.length > 0 && (
          <Text type="secondary" className="text-xs">
            {schemas.length} schemas available
          </Text>
        )
      }
    >
      <Space direction="vertical" className="w-full">
        <div>
          <Text strong className="block mb-2">Select Data Source Schema</Text>
          <Select
            value={selectedSchema}
            onChange={handleSchemaChange}
            placeholder="Choose a database schema"
            className="w-full"
            size="large"
            showSearch
            filterOption={(input, option) =>
              (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent="No schemas found"
          >
            {schemas.filter((schema: DatabaseSchema) => schema && schema.schema_name).map((schema: DatabaseSchema) => (
              <Option key={schema.schema_name} value={schema.schema_name}>
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getSchemaIcon(schema.schema_name)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{schema.schema_name}</div>
                    {/* <div className="text-xs text-gray-500 truncate max-w-md">
                      {getSchemaDescription(schema.schema_name)}
                    </div> */}
                  </div>
                  {schema.tables && (
                    <div className="text-xs text-gray-400">
                      {schema.tables.length} tables
                    </div>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {selectedSchema && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <Text strong>Selected: {selectedSchema}</Text>
                <Paragraph className="mb-0 mt-1 text-sm">
                  {getSchemaDescription(selectedSchema)}
                </Paragraph>
              </div>
            }
            className="bg-blue-50 border-blue-200"
          />
        )}

        {!selectedSchema && schemas.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Text type="secondary" className="block text-center">
              Select a schema to begin building your alert rule
            </Text>
            <div className="mt-2 flex justify-center space-x-4">
              {schemas.filter((s) => s && s.schema_name).slice(0, 3).map((schema) => (
                <button
                  key={schema.schema_name}
                  onClick={() => handleSchemaChange(schema.schema_name)}
                  className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {/* {getSchemaIcon(schema.schema_name)} {schema.schema_name} */}
                </button>
              ))}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default SchemaSelector;