'use client';

import React, { useState, useEffect } from 'react';
import {
  Space,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Dropdown,
  Badge,
  Tooltip,
  Divider,
  Typography,
  Card,
  Row,
  Col,
  Checkbox,
  Slider,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  SettingOutlined,
  DownOutlined,
  CalendarOutlined,
  UserOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { CheckableTag } = Tag;

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'numberrange' | 'tags' | 'checkbox';
  options?: Array<{ label: string; value: any; color?: string }>;
  placeholder?: string;
  width?: number;
  defaultValue?: any;
  searchable?: boolean;
  allowClear?: boolean;
  range?: [number, number];
  step?: number;
}

export interface FilterValue {
  [key: string]: any;
}

interface FilterBarProps {
  config: FilterConfig[];
  value?: FilterValue;
  onChange?: (filters: FilterValue) => void;
  onSearch?: (searchTerm: string) => void;
  onClear?: () => void;
  onSavePreset?: (name: string, filters: FilterValue) => void;
  presets?: Array<{ name: string; filters: FilterValue }>;
  showSearch?: boolean;
  showPresets?: boolean;
  searchPlaceholder?: string;
  className?: string;
  loading?: boolean;
  compact?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  config,
  value = {},
  onChange,
  onSearch,
  onClear,
  onSavePreset,
  presets = [],
  showSearch = true,
  showPresets = false,
  searchPlaceholder = 'Search...',
  className,
  loading = false,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterValue>(value);

  useEffect(() => {
    setLocalFilters(value);
  }, [value]);

  const handleFilterChange = (key: string, val: any) => {
    const newFilters = { ...localFilters, [key]: val };
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      delete newFilters[key];
    }
    setLocalFilters(newFilters);
    onChange?.(newFilters);
  };

  const handleSearch = () => {
    onSearch?.(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    setLocalFilters({});
    onClear?.();
    onChange?.({});
  };

  const getActiveFilterCount = () => {
    return Object.keys(localFilters).filter(key => {
      const val = localFilters[key];
      return val !== undefined && val !== null && val !== '' && 
             (!Array.isArray(val) || val.length > 0);
    }).length;
  };

  const renderFilterInput = (filter: FilterConfig) => {
    const commonProps = {
      placeholder: filter.placeholder,
      style: { width: filter.width || 180 },
      allowClear: filter.allowClear !== false,
      size: compact ? 'small' : 'middle' as any,
    };

    switch (filter.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            value={localFilters[filter.key]}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            prefix={<SearchOutlined />}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            value={localFilters[filter.key]}
            onChange={(val) => handleFilterChange(filter.key, val)}
            showSearch={filter.searchable}
            options={filter.options}
          />
        );

      case 'multiselect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            value={localFilters[filter.key] || []}
            onChange={(val) => handleFilterChange(filter.key, val)}
            showSearch={filter.searchable}
            options={filter.options}
            maxTagCount={2}
          />
        );

      case 'date':
        return (
          <DatePicker
            {...commonProps}
            value={localFilters[filter.key] ? dayjs(localFilters[filter.key]) : null}
            onChange={(date) => handleFilterChange(filter.key, date?.toISOString())}
          />
        );

      case 'daterange':
        const rangePlaceholder = typeof filter.placeholder === 'string'
          ? [filter.placeholder, filter.placeholder]
          : filter.placeholder;
        return (
          <RangePicker
            {...commonProps}
            value={localFilters[filter.key] ? 
              [dayjs(localFilters[filter.key][0]), dayjs(localFilters[filter.key][1])] : 
              null}
            placeholder={rangePlaceholder as [string, string] | undefined}
            onChange={(dates) => 
              handleFilterChange(filter.key, dates ? 
                [dates[0]?.toISOString(), dates[1]?.toISOString()] : 
                null)
            }
          />
        );

      case 'number':
        return (
          <InputNumber
            {...commonProps}
            value={localFilters[filter.key]}
            onChange={(val) => handleFilterChange(filter.key, val)}
            min={filter.range?.[0]}
            max={filter.range?.[1]}
            step={filter.step}
          />
        );

      case 'numberrange':
        return (
          <div style={{ width: filter.width || 180, padding: '0 12px' }}>
            <Slider
              range
              value={localFilters[filter.key] || filter.range}
              onChange={(val) => handleFilterChange(filter.key, val)}
              min={filter.range?.[0]}
              max={filter.range?.[1]}
              step={filter.step}
              tooltip={{ 
                formatter: (value) => `${value}${filter.placeholder || ''}` 
              }}
            />
          </div>
        );

      case 'tags':
        return (
          <div style={{ maxWidth: filter.width || 280 }}>
            {filter.options?.map(option => (
              <CheckableTag
                key={option.value}
                checked={(localFilters[filter.key] || []).includes(option.value)}
                onChange={(checked) => {
                  const currentTags = localFilters[filter.key] || [];
                  const newTags = checked
                    ? [...currentTags, option.value]
                    : currentTags.filter((tag: any) => tag !== option.value);
                  handleFilterChange(filter.key, newTags);
                }}
                style={{ 
                  marginBottom: 4,
                  borderColor: option.color 
                }}
              >
                {option.label}
              </CheckableTag>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <Checkbox.Group
            value={localFilters[filter.key] || []}
            onChange={(val) => handleFilterChange(filter.key, val)}
            style={{ maxWidth: filter.width || 200 }}
          >
            <Row gutter={[8, 8]}>
              {filter.options?.map(option => (
                <Col key={option.value} span={24}>
                  <Checkbox value={option.value}>{option.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = getActiveFilterCount();

  const filterDropdownContent = (
    <Card 
      size="small" 
      style={{ width: 400, maxHeight: 500, overflow: 'auto' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {config.map(filter => (
          <div key={filter.key}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              {filter.label}
            </Text>
            {renderFilterInput(filter)}
          </div>
        ))}
        <Divider style={{ margin: '12px 0' }} />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            Clear All
          </Button>
          {showPresets && (
            <Button 
              size="small" 
              icon={<SaveOutlined />}
              onClick={() => {
                // Save preset logic would go here
                console.log('Save preset:', localFilters);
              }}
            >
              Save Preset
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card 
        size="small" 
        bodyStyle={{ padding: compact ? '8px 16px' : '12px 24px' }}
        style={{ 
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
        }}
      >
        <Space 
          size={compact ? 8 : 12} 
          wrap 
          style={{ width: '100%' }}
          align="center"
        >
          {/* Search Input */}
          {showSearch && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Input.Search
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 280 }}
                size={compact ? 'small' : 'middle'}
                enterButton={<SearchOutlined />}
                loading={loading}
              />
            </motion.div>
          )}

          {/* Quick Filters - First 3 configs */}
          {config.slice(0, 3).map(filter => (
            <motion.div
              key={filter.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Space direction="vertical" size={0}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {filter.label}
                </Text>
                {renderFilterInput(filter)}
              </Space>
            </motion.div>
          ))}

          {/* Advanced Filters Dropdown */}
          {config.length > 3 && (
            <Dropdown
              overlay={filterDropdownContent}
              trigger={['click']}
              placement="bottomLeft"
              open={showAdvanced}
              onOpenChange={setShowAdvanced}
            >
              <Button 
                icon={<FilterOutlined />}
                size={compact ? 'small' : 'middle'}
                style={{ 
                  borderColor: activeFilterCount > 0 ? '#1677ff' : undefined,
                  color: activeFilterCount > 0 ? '#1677ff' : undefined
                }}
              >
                <Space size={4}>
                  Advanced
                  {activeFilterCount > 0 && (
                    <Badge 
                      count={activeFilterCount} 
                      size="small"
                      style={{ backgroundColor: '#1677ff' }}
                    />
                  )}
                  <DownOutlined 
                    style={{ 
                      fontSize: 10,
                      transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }} 
                  />
                </Space>
              </Button>
            </Dropdown>
          )}

          {/* Preset Filters */}
          {showPresets && presets.length > 0 && (
            <Dropdown
              menu={{
                items: presets.map(preset => ({
                  key: preset.name,
                  label: preset.name,
                  onClick: () => {
                    setLocalFilters(preset.filters);
                    onChange?.(preset.filters);
                  }
                }))
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />} size={compact ? 'small' : 'middle'}>
                Presets
              </Button>
            </Dropdown>
          )}

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Tooltip title="Clear all filters">
                <Button 
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                  size={compact ? 'small' : 'middle'}
                  danger
                >
                  Clear ({activeFilterCount})
                </Button>
              </Tooltip>
            </motion.div>
          )}
        </Space>

        {/* Active Filters Display */}
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                marginTop: 12, 
                paddingTop: 12, 
                borderTop: '1px solid #f0f0f0' 
              }}
            >
              <Space size={[8, 8]} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Active filters:
                </Text>
                {Object.entries(localFilters).map(([key, val]) => {
                  const filterConfig = config.find(c => c.key === key);
                  if (!filterConfig || !val) return null;

                  let displayValue = val;
                  if (Array.isArray(val)) {
                    displayValue = val.length > 2 
                      ? `${val.slice(0, 2).join(', ')} +${val.length - 2} more`
                      : val.join(', ');
                  } else if (filterConfig.type === 'daterange' && Array.isArray(val)) {
                    displayValue = `${dayjs(val[0]).format('MMM DD')} - ${dayjs(val[1]).format('MMM DD')}`;
                  } else if (filterConfig.type === 'date') {
                    displayValue = dayjs(val).format('MMM DD, YYYY');
                  }

                  return (
                    <Tag
                      key={key}
                      closable
                      onClose={() => handleFilterChange(key, undefined)}
                      color="blue"
                      style={{ borderRadius: 4 }}
                    >
                      {filterConfig.label}: {String(displayValue)}
                    </Tag>
                  );
                })}
              </Space>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default FilterBar;
