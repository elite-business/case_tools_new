import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportingApi } from '@/lib/api-client';
import { 
  ReportRequest, 
  ReportResponse, 
  ScheduledReport, 
  AnalyticsOverview,
  TeamPerformanceMetric,
  ExportFormat,
  ReportType
} from '@/lib/types';
import { message } from 'antd';

export const useGenerateReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ReportRequest) => reportingApi.generateReport(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      message.success(`Report generated successfully`);
      return response.data;
    },
    onError: (error: any) => {
      message.error(`Failed to generate report: ${error.message}`);
    },
  });
};

export const useReports = (params?: any) => {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportingApi.getReports(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useReport = (id: number) => {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => reportingApi.getReport(id),
    enabled: !!id,
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: ({ id, format }: { id: number; format: ExportFormat }) =>
      reportingApi.exportReport(id, format),
    onSuccess: (response, variables) => {
      // Handle file download
      const blob = new Blob([response.data], { 
        type: getContentType(variables.format) 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${variables.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Report downloaded successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to export report: ${error.message}`);
    },
  });
};

export const useScheduledReports = (params?: any) => {
  return useQuery({
    queryKey: ['scheduled-reports', params],
    queryFn: () => reportingApi.getScheduledReports(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateScheduledReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<ScheduledReport>) => 
      reportingApi.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      message.success('Scheduled report created successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to create scheduled report: ${error.message}`);
    },
  });
};

export const useUpdateScheduledReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScheduledReport> }) =>
      reportingApi.updateScheduledReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      message.success('Scheduled report updated successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to update scheduled report: ${error.message}`);
    },
  });
};

export const useDeleteScheduledReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => reportingApi.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      message.success('Scheduled report deleted successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to delete scheduled report: ${error.message}`);
    },
  });
};

export const useRunScheduledReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => reportingApi.runScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      message.success('Report generated successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to run scheduled report: ${error.message}`);
    },
  });
};

// Analytics hooks
export const useAnalyticsOverview = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['analytics-overview', timeRange],
    queryFn: () => reportingApi.getAnalyticsOverview(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export const useTeamPerformance = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['team-performance', timeRange],
    queryFn: () => reportingApi.getTeamPerformance(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAlertAnalytics = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['alert-analytics', timeRange],
    queryFn: () => reportingApi.getAlertAnalytics(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSlaReport = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['sla-report', timeRange],
    queryFn: () => reportingApi.getSlaReport(timeRange),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTrendAnalysis = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['trend-analysis', timeRange],
    queryFn: () => reportingApi.getTrendAnalysis(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Utility functions
const getContentType = (format: ExportFormat): string => {
  const contentTypes = {
    PDF: 'application/pdf',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV: 'text/csv',
    JSON: 'application/json',
  };
  return contentTypes[format] || 'application/octet-stream';
};

// Export utility functions
export const reportUtils = {
  getReportTypeLabel: (type: ReportType): string => {
    const labels = {
      CASE_SUMMARY: 'Case Summary',
      TEAM_PERFORMANCE: 'Team Performance',
      ALERT_ANALYTICS: 'Alert Analytics',
      SLA_COMPLIANCE: 'SLA Compliance',
      TREND_ANALYSIS: 'Trend Analysis',
    };
    return labels[type] || type;
  },
  
  getExportFormatIcon: (format: ExportFormat): string => {
    const icons = {
      PDF: '📄',
      EXCEL: '📊',
      CSV: '📋',
      JSON: '🗂️',
    };
    return icons[format] || '📄';
  },
  
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  getFrequencyLabel: (frequency: string): string => {
    const labels = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly', 
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  },
};