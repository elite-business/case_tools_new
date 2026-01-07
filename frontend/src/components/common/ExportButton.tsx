'use client';

import React from 'react';
import { Button, Dropdown, message, type MenuProps } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { ExportFormat } from '@/lib/types';
import { useExport, useTableExport, exportUtils } from '@/hooks/useExport';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  type?: 'alerts' | 'cases' | 'reports' | 'notifications' | 'custom';
  columns?: Array<{ title: string; dataIndex: string }>;
  format?: ExportFormat;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  variant?: 'button' | 'dropdown';
  loading?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  type = 'custom',
  columns,
  format = 'CSV',
  disabled = false,
  size = 'middle',
  variant = 'dropdown',
  loading = false,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const exportMutation = useExport();
  const { exportTable } = useTableExport();

  const handleExport = async (selectedFormat: ExportFormat) => {
    try {
      onExportStart?.();

      // Validate data
      const validation = exportUtils.validateExportData(data);
      if (!validation.isValid) {
        message.warning(validation.error);
        onExportError?.(validation.error!);
        return;
      }

      // Format data based on type
      const formattedData = type === 'custom' ? data : exportUtils.formatDataForExport(data, type);
      
      // Generate filename
      const exportFilename = filename || exportUtils.getExportFilename(type, selectedFormat);

      if (columns && selectedFormat === 'CSV') {
        // Use table export for structured data
        await exportTable(formattedData, columns, selectedFormat, exportFilename);
      } else {
        // Use general export
        await exportMutation.mutateAsync({
          data: formattedData,
          format: selectedFormat,
          options: { filename: exportFilename }
        });
      }

      onExportComplete?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Export failed';
      onExportError?.(errorMessage);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'csv',
      icon: <FileTextOutlined />,
      label: 'Export as CSV',
      onClick: () => handleExport('CSV'),
    },
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: 'Export as Excel',
      onClick: () => handleExport('EXCEL'),
      disabled: true, // TODO: Implement Excel export
    },
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'Export as PDF',
      onClick: () => handleExport('PDF'),
      disabled: true, // TODO: Implement PDF export
    },
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: 'Export as JSON',
      onClick: () => handleExport('JSON'),
    },
  ];

  if (variant === 'button') {
    return (
      <Button
        icon={<DownloadOutlined />}
        onClick={() => handleExport(format)}
        loading={loading || exportMutation.isPending}
        disabled={disabled || data.length === 0}
        size={size}
      >
        Export
      </Button>
    );
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      disabled={disabled || data.length === 0}
      placement="bottomRight"
    >
      <Button
        icon={<DownloadOutlined />}
        loading={loading || exportMutation.isPending}
        disabled={disabled || data.length === 0}
        size={size}
      >
        Export ({data.length} {data.length === 1 ? 'record' : 'records'})
      </Button>
    </Dropdown>
  );
};

// Specialized export buttons for different data types
export const AlertsExportButton: React.FC<Omit<ExportButtonProps, 'type' | 'columns'>> = (props) => {
  const columns = [
    { title: 'Rule Name', dataIndex: 'Rule Name' },
    { title: 'Severity', dataIndex: 'Severity' },
    { title: 'Status', dataIndex: 'Status' },
    { title: 'Started At', dataIndex: 'Started At' },
    { title: 'Summary', dataIndex: 'Summary' },
    { title: 'Value', dataIndex: 'Value' },
    { title: 'Threshold', dataIndex: 'Threshold' },
  ];

  return <ExportButton {...props} type="alerts" columns={columns} />;
};

export const CasesExportButton: React.FC<Omit<ExportButtonProps, 'type' | 'columns'>> = (props) => {
  const columns = [
    { title: 'Case ID', dataIndex: 'Case ID' },
    { title: 'Title', dataIndex: 'Title' },
    { title: 'Status', dataIndex: 'Status' },
    { title: 'Severity', dataIndex: 'Severity' },
    { title: 'Priority', dataIndex: 'Priority' },
    { title: 'Assigned To', dataIndex: 'Assigned To' },
    { title: 'Created At', dataIndex: 'Created At' },
  ];

  return <ExportButton {...props} type="cases" columns={columns} />;
};

export const ReportsExportButton: React.FC<Omit<ExportButtonProps, 'type' | 'columns'>> = (props) => {
  const columns = [
    { title: 'Title', dataIndex: 'Title' },
    { title: 'Type', dataIndex: 'Type' },
    { title: 'Generated At', dataIndex: 'Generated At' },
    { title: 'Generated By', dataIndex: 'Generated By' },
    { title: 'Total Records', dataIndex: 'Total Records' },
  ];

  return <ExportButton {...props} type="reports" columns={columns} />;
};

export const NotificationsExportButton: React.FC<Omit<ExportButtonProps, 'type' | 'columns'>> = (props) => {
  const columns = [
    { title: 'Title', dataIndex: 'Title' },
    { title: 'Type', dataIndex: 'Type' },
    { title: 'Severity', dataIndex: 'Severity' },
    { title: 'Status', dataIndex: 'Status' },
    { title: 'Created At', dataIndex: 'Created At' },
    { title: 'Read At', dataIndex: 'Read At' },
  ];

  return <ExportButton {...props} type="notifications" columns={columns} />;
};

export default ExportButton;