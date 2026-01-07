'use client';

import React from 'react';
import { Card, Space, Typography, Button, Select, Input, InputNumber, Row, Col, Tag, Divider } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  FilterOutlined, 
  FunctionOutlined,
  SortAscendingOutlined,
  NumberOutlined
} from '@ant-design/icons';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { AlertCondition } from '@/lib/types';

const { Text } = Typography;
const { Option } = Select;

interface QueryBuilderProps {
  className?: string;
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({ className }) => {
  const {
    columns,
    visualConditions,
    aggregationFunction,
    groupByFields,
    orderByFields,
    limitRows,
    setVisualConditions,
    addVisualCondition,
    removeVisualCondition,
    updateVisualCondition,
    setAggregationFunction,
    setGroupByFields,
    setOrderByFields,
    setLimitRows,
  } = useAlertBuilderStore();

  const operators = [
    { label: 'Equals', value: '=' },
    { label: 'Not Equals', value: '!=' },
    { label: 'Greater Than', value: '>' },
    { label: 'Less Than', value: '<' },
    { label: 'Greater or Equal', value: '>=' },
    { label: 'Less or Equal', value: '<=' },
    { label: 'Like', value: 'LIKE' },
    { label: 'Not Like', value: 'NOT LIKE' },
    { label: 'In', value: 'IN' },
    { label: 'Not In', value: 'NOT IN' },
    { label: 'Is Null', value: 'IS NULL' },
    { label: 'Is Not Null', value: 'IS NOT NULL' },
    { label: 'Between', value: 'BETWEEN' },
  ];

  const aggregations = [
    { label: 'Count', value: 'COUNT' },
    { label: 'Sum', value: 'SUM' },
    { label: 'Average', value: 'AVG' },
    { label: 'Maximum', value: 'MAX' },
    { label: 'Minimum', value: 'MIN' },
    { label: 'Count Distinct', value: 'COUNT(DISTINCT' },
  ];

  const getColumnOptions = () => {
    return columns.map(col => ({
      label: `${col.column_name} (${col.data_type})`,
      value: col.column_name,
    }));
  };

  const getNumericColumns = () => {
    return columns.filter(col => 
      col.type_info?.is_numeric === true
    );
  };

  const handleConditionChange = (index: number, field: keyof AlertCondition, value: any) => {
    updateVisualCondition(index, { [field]: value });
  };

  const isValueRequired = (operator: string): boolean => {
    return !['IS NULL', 'IS NOT NULL'].includes(operator);
  };

  const renderConditionValue = (condition: AlertCondition, index: number) => {
    if (!isValueRequired(condition.operator)) {
      return null;
    }

    if (condition.operator === 'BETWEEN') {
      return (
        <Row gutter={8}>
          <Col span={12}>
            <Input
              placeholder="Min value"
              value={condition.value}
              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
              size="small"
            />
          </Col>
          <Col span={12}>
            <Input
              placeholder="Max value"
              value={condition.upperValue || ''}
              onChange={(e) => handleConditionChange(index, 'upperValue', e.target.value)}
              size="small"
            />
          </Col>
        </Row>
      );
    }

    if (['IN', 'NOT IN'].includes(condition.operator)) {
      return (
        <Input
          placeholder="value1, value2, value3"
          value={condition.value}
          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
          size="small"
        />
      );
    }

    // Determine if this should be a numeric input
    const selectedColumn = columns.find(col => col.column_name === condition.field);
    const isNumericColumn = selectedColumn && selectedColumn.type_info?.is_numeric === true;

    if (isNumericColumn && !['LIKE', 'NOT LIKE'].includes(condition.operator)) {
      return (
        <InputNumber
          placeholder="Enter value"
          value={condition.value as number}
          onChange={(value) => handleConditionChange(index, 'value', value)}
          size="small"
          style={{ width: '100%' }}
        />
      );
    }

    return (
      <Input
        placeholder="Enter value"
        value={condition.value}
        onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
        size="small"
      />
    );
  };

  return (
    <Card 
      title={
        <Space>
          <FilterOutlined className="text-blue-600" />
          <span>Visual Query Builder</span>
        </Space>
      }
      size="small" 
      className={className}
    >
      <Space direction="vertical" className="w-full" size="large">
        
        {/* WHERE Conditions */}
        <div>
          <Text strong className="block mb-3">Filter Conditions (WHERE)</Text>
          <Space direction="vertical" className="w-full">
            {visualConditions.map((condition, index) => (
              <Card key={index} size="small" className="bg-gray-50">
                <Row gutter={12} align="middle">
                  {/* Logic Operator (AND/OR) */}
                  {index > 0 && (
                    <Col span={3}>
                      <Select
                        value={condition.logic}
                        onChange={(value) => handleConditionChange(index, 'logic', value)}
                        size="small"
                        style={{ width: '100%' }}
                      >
                        <Option value="AND">
                          <Tag color="blue">AND</Tag>
                        </Option>
                        <Option value="OR">
                          <Tag color="orange">OR</Tag>
                        </Option>
                      </Select>
                    </Col>
                  )}

                  {/* Field/Column */}
                  <Col span={index === 0 ? 6 : 5}>
                    <Select
                      placeholder="Select field"
                      value={condition.field}
                      onChange={(value) => handleConditionChange(index, 'field', value)}
                      size="small"
                      style={{ width: '100%' }}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {getColumnOptions().map(col => (
                        <Option key={col.value} value={col.value}>
                          {col.label}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  {/* Operator */}
                  <Col span={4}>
                    <Select
                      value={condition.operator}
                      onChange={(value) => handleConditionChange(index, 'operator', value)}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {operators.map(op => (
                        <Option key={op.value} value={op.value}>
                          {op.label}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  {/* Value */}
                  <Col span={6}>
                    {renderConditionValue(condition, index)}
                  </Col>

                  {/* Delete Button */}
                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeVisualCondition(index)}
                      disabled={visualConditions.length === 1}
                      size="small"
                    />
                  </Col>
                </Row>
              </Card>
            ))}
            
            <Button
              type="dashed"
              onClick={addVisualCondition}
              icon={<PlusOutlined />}
              className="w-full"
              size="small"
            >
              Add Condition
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Aggregation and Grouping */}
        <div>
          <Text strong className="block mb-3">Aggregation & Grouping</Text>
          <Row gutter={16}>
            <Col span={8}>
              <Text className="block mb-2">Aggregation Function</Text>
              <Select
                placeholder="Select aggregation"
                value={aggregationFunction}
                onChange={setAggregationFunction}
                allowClear
                style={{ width: '100%' }}
                size="small"
              >
                {aggregations.map(agg => (
                  <Option key={agg.value} value={agg.value}>
                    <Space>
                      <FunctionOutlined />
                      {agg.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={8}>
              <Text className="block mb-2">Group By Fields</Text>
              <Select
                mode="multiple"
                placeholder="Select grouping fields"
                value={groupByFields}
                onChange={setGroupByFields}
                style={{ width: '100%' }}
                size="small"
                maxTagCount={2}
              >
                {getColumnOptions().map(col => (
                  <Option key={col.value} value={col.value}>
                    {col.label}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={8}>
              <Text className="block mb-2">Order By Fields</Text>
              <Select
                mode="multiple"
                placeholder="Select sorting fields"
                value={orderByFields}
                onChange={setOrderByFields}
                style={{ width: '100%' }}
                size="small"
                maxTagCount={2}
              >
                {getColumnOptions().map(col => (
                  <Option key={col.value} value={col.value}>
                    <Space>
                      <SortAscendingOutlined />
                      {col.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Query Limits */}
        <div>
          <Text strong className="block mb-3">Query Limits</Text>
          <Row gutter={16}>
            <Col span={8}>
              <Text className="block mb-2">Limit Rows</Text>
              <InputNumber
                placeholder="e.g., 1000"
                value={limitRows}
                onChange={setLimitRows}
                min={1}
                max={100000}
                style={{ width: '100%' }}
                size="small"
                prefix={<NumberOutlined />}
              />
            </Col>
          </Row>
        </div>

        {/* Query Preview */}
        {columns.length > 0 && (
          <>
            <Divider />
            <div>
              <Text strong className="block mb-2">Query Preview</Text>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm">
                <Text code>
                  {(() => {
                    const store = useAlertBuilderStore.getState();
                    return store.generateSqlFromVisual() || 'SELECT * FROM table';
                  })()}
                </Text>
              </div>
            </div>
          </>
        )}

        {/* Helper Text */}
        {getNumericColumns().length > 0 && (
          <div className="p-3 bg-blue-50 rounded">
            <Text type="secondary" className="text-sm">
              💡 <strong>Tip:</strong> For alerting, consider using aggregation functions like COUNT, SUM, or AVG 
              on numeric fields: {getNumericColumns().map(col => col.column_name).join(', ')}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default QueryBuilder;