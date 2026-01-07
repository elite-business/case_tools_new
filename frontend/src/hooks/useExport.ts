import { useMutation } from '@tanstack/react-query';
import { ExportFormat } from '@/lib/types';
import { message } from 'antd';

interface ExportOptions {
  filename?: string;
  contentType?: string;
}

export const useExport = () => {
  return useMutation({
    mutationFn: async ({ 
      data, 
      format, 
      options = {} 
    }: { 
      data: any; 
      format: ExportFormat; 
      options?: ExportOptions;
    }) => {
      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'CSV':
          content = convertToCSV(data);
          contentType = 'text/csv';
          filename = options.filename || 'export.csv';
          break;
          
        case 'JSON':
          content = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          filename = options.filename || 'export.json';
          break;
          
        case 'EXCEL':
          // For Excel, we'd need to use a library like xlsx
          throw new Error('Excel export not implemented yet');
          
        case 'PDF':
          // For PDF, we'd need to use a library like jsPDF
          throw new Error('PDF export not implemented yet');
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return { content, contentType, filename };
    },
    onSuccess: ({ content, contentType, filename }) => {
      downloadFile(content, contentType, filename);
      message.success('Export completed successfully');
    },
    onError: (error: any) => {
      message.error(`Export failed: ${error.message}`);
    },
  });
};

// Utility function to convert data to CSV
const convertToCSV = (data: any[]): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas, quotes, or newlines
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  return csvContent;
};

// Utility function to download file
const downloadFile = (content: string, contentType: string, filename: string): void => {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Hook for exporting tables
export const useTableExport = () => {
  const exportMutation = useExport();
  
  const exportTable = (
    data: any[],
    columns: Array<{ title: string; dataIndex: string }>,
    format: ExportFormat = 'CSV',
    filename?: string
  ) => {
    // Transform data based on column configuration
    const transformedData = data.map(item => {
      const transformed: any = {};
      columns.forEach(col => {
        transformed[col.title] = item[col.dataIndex];
      });
      return transformed;
    });

    return exportMutation.mutate({
      data: transformedData,
      format,
      options: { filename }
    });
  };

  return {
    exportTable,
    isLoading: exportMutation.isPending,
    error: exportMutation.error,
  };
};

// Hook for exporting charts
export const useChartExport = () => {
  const exportChart = (
    chartRef: React.RefObject<any>,
    format: 'PNG' | 'JPEG' | 'SVG' = 'PNG',
    filename?: string
  ) => {
    try {
      if (!chartRef.current) {
        throw new Error('Chart reference not found');
      }

      // This would need to be implemented based on the chart library being used
      // For example, with recharts, you might use html2canvas or similar
      message.info('Chart export feature coming soon');
    } catch (error: any) {
      message.error(`Chart export failed: ${error.message}`);
    }
  };

  return { exportChart };
};

// Export utility functions
export const exportUtils = {
  formatDataForExport: (data: any[], type: 'alerts' | 'cases' | 'reports' | 'notifications') => {
    switch (type) {
      case 'alerts':
        return data.map(alert => ({
          'Rule Name': alert.ruleName,
          'Severity': alert.severity,
          'Status': alert.status,
          'Started At': new Date(alert.startsAt).toLocaleString(),
          'Ended At': alert.endsAt ? new Date(alert.endsAt).toLocaleString() : 'N/A',
          'Summary': alert.summary,
          'Value': alert.value,
          'Threshold': alert.threshold,
        }));
        
      case 'cases':
        return data.map(caseItem => ({
          'Case ID': caseItem.caseId,
          'Title': caseItem.title,
          'Status': caseItem.status,
          'Severity': caseItem.severity,
          'Priority': caseItem.priority,
          'Assigned To': caseItem.assignedTo?.fullName || 'Unassigned',
          'Created At': new Date(caseItem.createdAt).toLocaleString(),
          'Updated At': new Date(caseItem.updatedAt).toLocaleString(),
        }));
        
      case 'reports':
        return data.map(report => ({
          'Title': report.title,
          'Type': report.type,
          'Generated At': new Date(report.generatedAt).toLocaleString(),
          'Generated By': report.generatedBy?.fullName,
          'Total Records': report.summary?.totalRecords || 0,
        }));
        
      case 'notifications':
        return data.map(notification => ({
          'Title': notification.title,
          'Type': notification.type,
          'Severity': notification.severity,
          'Status': notification.status,
          'Created At': new Date(notification.createdAt).toLocaleString(),
          'Read At': notification.readAt ? new Date(notification.readAt).toLocaleString() : 'Unread',
        }));
        
      default:
        return data;
    }
  },

  getExportFilename: (type: string, format: ExportFormat): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `${type}_export_${timestamp}.${format.toLowerCase()}`;
  },

  validateExportData: (data: any[]): { isValid: boolean; error?: string } => {
    if (!Array.isArray(data)) {
      return { isValid: false, error: 'Data must be an array' };
    }
    
    if (data.length === 0) {
      return { isValid: false, error: 'No data to export' };
    }
    
    if (data.length > 10000) {
      return { isValid: false, error: 'Too much data to export (max 10,000 records)' };
    }
    
    return { isValid: true };
  },
};