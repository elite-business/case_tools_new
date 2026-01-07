'use client';

import React, { useEffect } from 'react';
import { Select, Space, Typography, Card, Alert, Spin, Tag, Tooltip } from 'antd';
import { TableOutlined, InfoCircleOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { DatabaseTable } from '@/lib/types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface TableSelectorProps {
  className?: string;
}

const TableSelector: React.FC<TableSelectorProps> = ({ className }) => {
  const {
    selectedSchema,
    tables,
    selectedTable,
    setTables,
    setSelectedTable,
    setError,
    clearError,
  } = useAlertBuilderStore();

  const {
    data: tablesData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['alert-tables', selectedSchema],
    queryFn: () => selectedSchema ? alertsApi.getTables(selectedSchema) : Promise.resolve({ data: [] }),
    enabled: Boolean(selectedSchema),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (tablesData?.data) {
      setTables(tablesData.data);
    }
  }, [tablesData, setTables]);

  useEffect(() => {
    if (isError && error) {
      setError('table', 'Failed to load database tables');
    } else {
      clearError('table');
    }
  }, [isError, error, setError, clearError]);

  const handleTableChange = (value: string | undefined) => {
    setSelectedTable(value || null);
    clearError('table');
  };

  const getTableIcon = (tableName: string): string => {
    if (tableName.includes('cdr')) return '📞';
    if (tableName.includes('stat')) return '📊';
    if (tableName.includes('traffic')) return '🚦';
    if (tableName.includes('revenue')) return '💰';
    if (tableName.includes('alert')) return '🚨';
    if (tableName.includes('user')) return '👤';
    if (tableName.includes('case')) return '📋';
    return '📄';
  };

  const getTableCategory = (tableName: string): { label: string; color: string } => {
    if (tableName.includes('cdr') || tableName.includes('call')) {
      return { label: 'CDR Data', color: 'blue' };
    }
    if (tableName.includes('stat') || tableName.includes('traffic')) {
      return { label: 'Statistics', color: 'green' };
    }
    if (tableName.includes('revenue') || tableName.includes('billing')) {
      return { label: 'Revenue', color: 'gold' };
    }
    if (tableName.includes('alert') || tableName.includes('notification')) {
      return { label: 'Alerting', color: 'red' };
    }
    if (tableName.includes('user') || tableName.includes('admin')) {
      return { label: 'Management', color: 'purple' };
    }
    return { label: 'General', color: 'default' };
  };

  const formatRowCount = (count?: number): string => {
    if (!count) return 'Unknown';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${Math.round(count / 1000)}K`;
    if (count < 1000000000) return `${Math.round(count / 1000000)}M`;
    return `${Math.round(count / 1000000000)}B`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (!selectedSchema) {
    return (
      <Card title="Database Table" size="small" className={className}>
        <Alert
          type="info"
          message="Select a Schema First"
          description="Please select a database schema to view available tables."
          showIcon
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card title="Database Table" size="small" className={className}>
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <Spin />
          <Text type="secondary" className="text-sm">Loading tables from {selectedSchema}...</Text>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Database Table" size="small" className={className}>
        <Alert
          type="error"
          message="Failed to Load Tables"
          description={`Unable to retrieve tables from schema '${selectedSchema}'. Please check your connection and try again.`}
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
          <TableOutlined className="text-green-600" />
          <span>Database Table</span>
          {selectedSchema && (
            <Tag color="blue" className="text-xs">
              {selectedSchema}
            </Tag>
          )}
        </Space>
      } 
      size="small" 
      className={className}
      extra={
        tables.length > 0 && (
          <Text type="secondary" className="text-xs">
            {tables.length} tables found
          </Text>
        )
      }
    >
      <Space direction="vertical" className="w-full">
        <div>
          <Text strong className="block mb-2">Select Data Table</Text>
          <Select
            value={selectedTable}
            onChange={handleTableChange}
            placeholder="Choose a table from the schema"
            className="w-full"
            size="large"
            optionFilterProp="children"
            showSearch
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={tables.length === 0 ? "No tables found in this schema" : "No matching tables"}
          >
            {tables.filter((table: DatabaseTable) => table && table.table_name).map((table: DatabaseTable) => {
              const category = getTableCategory(table.table_name);
              return (
                <Option key={table.table_name} value={table.table_name}>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{table.table_name}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">{table.table_name}</span>
                        <Tag color={category.color} className="text-xs">
                          {category.label}
                        </Tag>
                      </div>
                      {table.description && (
                        <div className="text-xs text-gray-500 truncate max-w-md">
                          {table.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        {table.rowCount && (
                          <span className="text-xs text-gray-400 flex items-center">
                            <DatabaseOutlined className="mr-1" />
                            {formatRowCount(table.rowCount)} rows
                          </span>
                        )}
                        {table.lastUpdated && (
                          <span className="text-xs text-gray-400 flex items-center">
                            <ClockCircleOutlined className="mr-1" />
                            {formatDate(table.lastUpdated)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Option>
              );
            })}
          </Select>
        </div>

        {selectedTable && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <Text strong>Selected: {selectedTable}</Text>
                {(() => {
                  const table = tables.find(t => t.table_name === selectedTable);
                  if (table) {
                    return (
                      <Paragraph className="mb-0 mt-1 text-sm">
                        {table.description || `Table containing ${table.columns?.length || 'multiple'} columns`}
                        {table.rowCount && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Approximately {formatRowCount(table.rowCount)} records
                          </span>
                        )}
                      </Paragraph>
                    );
                  }
                  return null;
                })()}
              </div>
            }
            className="bg-green-50 border-green-200"
          />
        )}

        {!selectedTable && tables.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Text type="secondary" className="block text-center">
              Select a table to continue building your alert rule
            </Text>
            <div className="mt-3 grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {tables.filter((t) => t && t.table_name).slice(0, 5).map((table) => {
                const category = getTableCategory(table.table_name);
                return (
                  <button
                    key={table.table_name}
                    onClick={() => handleTableChange(table.table_name)}
                    className="text-left p-2 bg-white border border-gray-200 rounded hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{getTableIcon(table.table_name)}</span>
                      <span className="font-medium text-sm">{table.table_name}</span>
                      <Tag color={category.color} className="text-xs">
                        {category.label}
                      </Tag>
                    </div>
                    {table.rowCount && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatRowCount(table.rowCount)} rows
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <Alert
            type="warning"
            message="No Tables Found"
            description={`The schema '${selectedSchema}' appears to be empty or inaccessible.`}
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

export default TableSelector;