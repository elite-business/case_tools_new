'use client';

import React, { useState } from 'react';
import { DatePicker, Select, Space, Button, Typography } from 'antd';
import { CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { QuickTimeRange, TimeRange } from '@/lib/types';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface DateRangePickerProps {
  value?: TimeRange;
  onChange: (timeRange: TimeRange) => void;
  showQuickRanges?: boolean;
  showTime?: boolean;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  className?: string;
  placeholder?: [string, string];
  format?: string;
  allowClear?: boolean;
}

const DateRangePickerComponent: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  showQuickRanges = true,
  showTime = false,
  size = 'middle',
  disabled = false,
  className = '',
  placeholder = ['Start date', 'End date'],
  format = showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD',
  allowClear = true,
}) => {
  const [selectedQuickRange, setSelectedQuickRange] = useState<QuickTimeRange>('custom');

  const quickRanges: Array<{ label: string; value: QuickTimeRange; range: [Dayjs, Dayjs] }> = [
    {
      label: 'Last Hour',
      value: 'last_hour',
      range: [dayjs().subtract(1, 'hour'), dayjs()],
    },
    {
      label: 'Last 24 Hours',
      value: 'last_24h',
      range: [dayjs().subtract(24, 'hours'), dayjs()],
    },
    {
      label: 'Last 7 Days',
      value: 'last_7d',
      range: [dayjs().subtract(7, 'days'), dayjs()],
    },
    {
      label: 'Last 30 Days',
      value: 'last_30d',
      range: [dayjs().subtract(30, 'days'), dayjs()],
    },
    {
      label: 'Last 90 Days',
      value: 'last_90d',
      range: [dayjs().subtract(90, 'days'), dayjs()],
    },
  ];

  const handleQuickRangeChange = (quickRange: QuickTimeRange) => {
    setSelectedQuickRange(quickRange);
    
    if (quickRange === 'custom') {
      return;
    }

    const range = quickRanges.find(r => r.value === quickRange);
    if (range) {
      const timeRange: TimeRange = {
        start: range.range[0].toISOString(),
        end: range.range[1].toISOString(),
        quick: quickRange,
      };
      onChange(timeRange);
    }
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const timeRange: TimeRange = {
        start: dates[0].toISOString(),
        end: dates[1].toISOString(),
        quick: 'custom',
      };
      onChange(timeRange);
      setSelectedQuickRange('custom');
    } else if (!dates) {
      // Clear selection
      const now = dayjs();
      const timeRange: TimeRange = {
        start: now.subtract(7, 'days').toISOString(),
        end: now.toISOString(),
        quick: 'last_7d',
      };
      onChange(timeRange);
      setSelectedQuickRange('last_7d');
    }
  };

  const handleReset = () => {
    const defaultRange: TimeRange = {
      start: dayjs().subtract(7, 'days').toISOString(),
      end: dayjs().toISOString(),
      quick: 'last_7d',
    };
    onChange(defaultRange);
    setSelectedQuickRange('last_7d');
  };

  const currentRange = value ? [dayjs(value.start), dayjs(value.end)] as [Dayjs, Dayjs] : undefined;

  return (
    <div className={`date-range-picker ${className}`}>
      <Space direction="vertical" size="small" className="w-full">
        {showQuickRanges && (
          <div className="flex items-center gap-2">
            <Text type="secondary" className="text-sm">Quick ranges:</Text>
            <Select
              value={selectedQuickRange}
              onChange={handleQuickRangeChange}
              size={size}
              className="min-w-[120px]"
              disabled={disabled}
            >
              <Select.Option value="custom">Custom</Select.Option>
              {quickRanges.map(range => (
                <Select.Option key={range.value} value={range.value}>
                  {range.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <RangePicker
            value={currentRange}
            onChange={handleDateRangeChange}
            showTime={showTime ? { format: 'HH:mm' } : false}
            format={format}
            placeholder={placeholder}
            size={size}
            disabled={disabled}
            allowClear={allowClear}
            suffixIcon={<CalendarOutlined />}
            className="flex-1"
            presets={showQuickRanges ? quickRanges.map(range => ({
              label: range.label,
              value: range.range,
            })) : undefined}
          />
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            size={size}
            disabled={disabled}
            title="Reset to last 7 days"
          />
        </div>

        {value && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Selected: {dayjs(value.start).format(format)} - {dayjs(value.end).format(format)}
            </span>
            <span>
              Duration: {dayjs(value.end).diff(dayjs(value.start), 'day')} days
            </span>
          </div>
        )}
      </Space>
    </div>
  );
};

// Preset configurations for common use cases
export const DateRangePresets = {
  analytics: {
    showTime: false,
    showQuickRanges: true,
    format: 'YYYY-MM-DD',
    placeholder: ['Start date', 'End date'] as [string, string],
  },
  
  alerts: {
    showTime: true,
    showQuickRanges: true,
    format: 'YYYY-MM-DD HH:mm',
    placeholder: ['Start time', 'End time'] as [string, string],
  },
  
  reports: {
    showTime: false,
    showQuickRanges: true,
    format: 'YYYY-MM-DD',
    placeholder: ['From date', 'To date'] as [string, string],
  },
};

// Hook for managing date range state
export const useDateRange = (initialRange?: QuickTimeRange) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const now = dayjs();
    const quick = initialRange || 'last_7d';
    
    const ranges = {
      last_hour: [now.subtract(1, 'hour'), now],
      last_24h: [now.subtract(24, 'hours'), now],
      last_7d: [now.subtract(7, 'days'), now],
      last_30d: [now.subtract(30, 'days'), now],
      last_90d: [now.subtract(90, 'days'), now],
      custom: [now.subtract(7, 'days'), now],
    };
    
    const range = ranges[quick];
    return {
      start: range[0].toISOString(),
      end: range[1].toISOString(),
      quick,
    };
  });

  const updateTimeRange = (newRange: TimeRange) => {
    setTimeRange(newRange);
  };

  const resetToDefault = () => {
    const now = dayjs();
    setTimeRange({
      start: now.subtract(7, 'days').toISOString(),
      end: now.toISOString(),
      quick: 'last_7d',
    });
  };

  return {
    timeRange,
    updateTimeRange,
    resetToDefault,
  };
};

export default DateRangePickerComponent;