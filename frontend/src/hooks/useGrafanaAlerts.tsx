import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { grafanaApi } from '@/lib/api-client';
import { GrafanaAlert, AlertFiltersEnhanced, PaginatedResponse } from '@/lib/types';
import { message } from 'antd';
import wsService from '@/lib/websocket-stomp';
import { useEffect } from 'react';

export const useGrafanaAlerts = (filters?: AlertFiltersEnhanced) => {
  return useQuery({
    queryKey: ['grafana-alerts', filters],
    queryFn: () => grafanaApi.getAlerts(filters),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Data is fresh for 10 seconds
  });
};

export const useGrafanaAlert = (id: number) => {
  return useQuery({
    queryKey: ['grafana-alert', id],
    queryFn: () => grafanaApi.getAlert(id),
    enabled: !!id,
  });
};

export const useAlertHistory = (filters?: any) => {
  return useQuery({
    queryKey: ['alert-history', filters],
    queryFn: () => grafanaApi.getAlertHistory(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAlertMetrics = (timeRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['alert-metrics', timeRange],
    queryFn: () => grafanaApi.getAlertMetrics(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      grafanaApi.acknowledgeAlert(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grafana-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
      message.success('Alert acknowledged successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to acknowledge alert: ${error.message}`);
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      grafanaApi.resolveAlert(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grafana-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
      message.success('Alert resolved successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to resolve alert: ${error.message}`);
    },
  });
};

export const useCreateCaseFromAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) =>
      grafanaApi.createCaseFromAlert(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['grafana-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      message.success(`Case ${response.data.caseId} created successfully`);
      return response.data;
    },
    onError: (error: any) => {
      message.error(`Failed to create case: ${error.message}`);
    },
  });
};

// Hook for real-time alert updates via WebSocket
export const useRealTimeAlerts = (onAlertUpdate?: (alert: GrafanaAlert) => void) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = wsService.subscribe('alert', (notification) => {
      // Invalidate queries when receiving alert updates
      queryClient.invalidateQueries({ queryKey: ['grafana-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-metrics'] });
      
      // Call custom handler if provided
      if (onAlertUpdate && notification.data) {
        onAlertUpdate(notification.data);
      }
    });

    return unsubscribe;
  }, [queryClient, onAlertUpdate]);
};

// Hook for managing alert filters with URL state
export const useAlertFilters = () => {
  // This could be enhanced to sync with URL params
  // For now, return a simple state management
  return {
    filters: {} as AlertFiltersEnhanced,
    updateFilters: (newFilters: Partial<AlertFiltersEnhanced>) => {
      // Implementation for updating filters
    },
    resetFilters: () => {
      // Implementation for resetting filters
    },
  };
};

// Export utility functions
export const alertUtils = {
  getSeverityColor: (severity: string) => {
    const colors = {
      CRITICAL: '#ff4d4f',
      HIGH: '#fa8c16', 
      MEDIUM: '#1890ff',
      LOW: '#52c41a',
    };
    return colors[severity as keyof typeof colors] || '#d9d9d9';
  },
  
  getStatusColor: (status: string) => {
    const colors = {
      OPEN: '#ff4d4f',
      ACKNOWLEDGED: '#fa8c16', 
      RESOLVED: '#52c41a',
      CLOSED: '#52c41a',
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  },
  
  formatDuration: (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diff = endDate.getTime() - startDate.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  },
};