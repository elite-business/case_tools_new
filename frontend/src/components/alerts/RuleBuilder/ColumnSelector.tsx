'use client';

import React, { useEffect } from 'react';
import { Select, Space, Typography, Card, Alert, Spin, Tag, Tooltip, Button } from 'antd';
import { 
  ColumnHeightOutlined, 
  InfoCircleOutlined, 
  KeyOutlined, 
  LinkOutlined,
  CheckOutlined,
  ClearOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { DatabaseColumn } from '@/lib/types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ColumnSelectorProps {
  className?: string;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ className }) => {
  const {
    selectedSchema,
    selectedTable,
    columns,
    selectedColumns,
    setColumns,
    setSelectedColumns,
    setError,
    clearError,
  } = useAlertBuilderStore();

  const {
    data: columnsData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['alert-columns', selectedSchema, selectedTable],
    queryFn: () => 
      selectedSchema && selectedTable 
        ? alertsApi.getColumns(selectedSchema, selectedTable)
        : Promise.resolve({ data: [] }),
    enabled: Boolean(selectedSchema && selectedTable),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (columnsData?.data) {
      setColumns(columnsData.data);
    }
  }, [columnsData, setColumns]);

  useEffect(() => {
    if (isError && error) {
      setError('columns', 'Failed to load table columns');
    } else {
      clearError('columns');
    }
  }, [isError, error, setError, clearError]);

  const handleColumnsChange = (values: string[]) => {
    setSelectedColumns(values);
    clearError('columns');
  };

  const handleSelectAll = () => {
    if (columns && columns.length > 0) {
      setSelectedColumns(columns.map(col => col.column_name));
    }
  };

  const handleClearAll = () => {
    setSelectedColumns([]);
  };

  const handleSelectNumericColumns = () => {
    if (columns && columns.length > 0) {
      const numericColumns = columns
        .filter(col => col.type_info?.is_numeric === true)
        .map(col => col.column_name);
      setSelectedColumns(numericColumns);
    }
  };

  const getColumnTypeIcon = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return '📝';
    }
    if (lowerType.includes('numeric') || lowerType.includes('int') || lowerType.includes('number') || lowerType.includes('decimal') || lowerType.includes('float')) {
      return '🔢';
    }
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return '📅';
    }
    if (lowerType.includes('bool')) {
      return '✅';
    }
    if (lowerType.includes('json') || lowerType.includes('xml')) {
      return '📄';
    }
    return '📊';
  };

  const getColumnTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return 'blue';
    }
    if (lowerType.includes('int') || lowerType.includes('number') || lowerType.includes('decimal') || lowerType.includes('float')) {
      return 'green';
    }
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return 'purple';
    }
    if (lowerType.includes('bool')) {
      return 'orange';
    }
    return 'default';
  };

  const getColumnBadges = (column: DatabaseColumn) => {
    const badges = [];
    if (column.is_primary_key) {
      badges.push(
        <Tooltip key="pk" title="Primary Key">
          <Tag color="gold" size="small" icon={<KeyOutlined />}>PK</Tag>
        </Tooltip>
      );
    }
    if (column.is_foreign_key) {
      badges.push(
        <Tooltip key="fk" title="Foreign Key">
          <Tag color="cyan" size="small" icon={<LinkOutlined />}>FK</Tag>
        </Tooltip>
      );
    }
    if (column.is_nullable === 'NO') {
      badges.push(
        <Tooltip key="notnull" title="Not Null">
          <Tag color="red" size="small">NOT NULL</Tag>
        </Tooltip>
      );
    }
    return badges;
  };

  if (!selectedSchema || !selectedTable) {
    return (
      <Card title="Table Columns" size="small" className={className}>
        <Alert
          type="info"
          message="Select Schema and Table First"
          description="Please select a database schema and table to view available columns."
          showIcon
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card title="Table Columns" size="small" className={className}>
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <Spin />
          <Text type="secondary" className="text-sm">Loading columns from {selectedSchema}.{selectedTable}...</Text>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Table Columns" size="small" className={className}>
        <Alert
          type="error"
          message="Failed to Load Columns"
          description={`Unable to retrieve columns from table '${selectedSchema}.${selectedTable}'. Please check your connection and try again.`}
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
          <ColumnHeightOutlined className="text-purple-600" />
          <span>Table Columns</span>
          <Tag color="blue" className="text-xs">
            {selectedSchema}.{selectedTable}
          </Tag>
        </Space>
      } 
      size="small" 
      className={className}
      extra={
        columns && columns.length > 0 && (
          <Text type="secondary" className="text-xs">
            {columns.length} columns found
          </Text>
        )
      }
    >
      <Space direction="vertical" className="w-full">
        {columns && columns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Text strong className="text-sm">Quick Select:</Text>
            <Button 
              size="small" 
              icon={<CheckOutlined />}
              onClick={handleSelectAll}
              type="text"
              className="text-xs"
            >
              All
            </Button>
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              type="text"
              className="text-xs"
            >
              Clear
            </Button>
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={handleSelectNumericColumns}
              type="text"
              className="text-xs"
            >
              Numeric Only
            </Button>
          </div>
        )}

        <div>
          <Text strong className="block mb-2">
            Select Columns for Query 
            {selectedColumns.length > 0 && (
              <Text type="secondary" className="text-xs ml-2">
                ({selectedColumns.length} selected)
              </Text>
            )}
          </Text>
          <Select
            mode="multiple"
            value={selectedColumns}
            onChange={handleColumnsChange}
            placeholder="Choose columns to include in your query"
            className="w-full"
            size="large"
            optionFilterProp="children"
            showSearch
            maxTagCount={3}
            maxTagTextLength={15}
            filterOption={(input, option) => {
              const columnName = option?.value as string;
              return columnName?.toLowerCase().includes(input.toLowerCase());
            }}
            notFoundContent={!columns || columns.length === 0 ? "No columns found in this table" : "No matching columns"}
          >
            {columns && columns.filter((column: DatabaseColumn) => column && column.column_name).map((column: DatabaseColumn) => (
              <Option key={column.column_name} value={column.column_name}>
                <div className="flex items-center space-x-2">
                  <span className="text-base">{getColumnTypeIcon(column.data_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{column.column_name}</span>
                      <Tag color={getColumnTypeColor(column.data_type)} className="text-xs">
                        {column.data_type.toUpperCase()}
                      </Tag>
                      <div className="flex space-x-1">
                        {getColumnBadges(column)}
                      </div>
                    </div>
                    {column.comment && (
                      <div className="text-xs text-gray-500 truncate max-w-sm">
                        {column.comment}
                      </div>
                    )}
                    {column.column_default && (
                      <div className="text-xs text-gray-400">
                        Default: {column.column_default}
                      </div>
                    )}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {selectedColumns.length > 0 && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <Text strong>
                  {selectedColumns.length} Column{selectedColumns.length !== 1 ? 's' : ''} Selected
                </Text>
                <Paragraph className="mb-0 mt-1 text-sm">
                  Selected: {selectedColumns.join(', ')}
                </Paragraph>
              </div>
            }
            className="bg-purple-50 border-purple-200"
          />
        )}

        {selectedColumns.length === 0 && columns && columns.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Text type="secondary" className="block text-center mb-3">
              Select columns to include in your alert query, or leave empty to select all columns (*)
            </Text>
            
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {columns && columns.filter((c) => c && c.column_name).slice(0, 8).map((column) => (
                <button
                  key={column.column_name}
                  onClick={() => handleColumnsChange([...selectedColumns, column.column_name])}
                  className="text-left p-2 bg-white border border-gray-200 rounded hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>{getColumnTypeIcon(column.data_type)}</span>
                    <span className="font-medium text-sm">{column.column_name}</span>
                    <Tag color={getColumnTypeColor(column.data_type)} className="text-xs">
                      {column.data_type.toUpperCase()}
                    </Tag>
                    <div className="flex space-x-1">
                      {getColumnBadges(column)}
                    </div>
                  </div>
                  {column.comment && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {column.comment}
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {columns.length > 8 && (
              <div className="mt-2 text-center">
                <Text type="secondary" className="text-xs">
                  + {columns.length - 8} more columns available
                </Text>
              </div>
            )}
          </div>
        )}

        {(!columns || columns.length === 0) && (
          <Alert
            type="warning"
            message="No Columns Found"
            description={`The table '${selectedTable}' appears to have no accessible columns.`}
            showIcon
          />
        )}

        {/* Column Summary */}
        {columns && columns.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" className="text-xs block mb-2">Column Summary:</Text>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Total Columns:</span>
                <span className="font-medium ml-1">{columns.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Primary Keys:</span>
                <span className="font-medium ml-1">{columns.filter(c => c.is_primary_key).length}</span>
              </div>
              <div>
                <span className="text-gray-600">Numeric:</span>
                <span className="font-medium ml-1">
                  {columns.filter(c => c.type_info?.is_numeric === true).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date/Time:</span>
                <span className="font-medium ml-1">
                  {columns.filter(c => c.type_info?.is_date === true).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default ColumnSelector;