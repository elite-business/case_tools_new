import axios, { AxiosError, AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[API Client] Setting Authorization header for request to ${config.url}`, {
          hasToken: !!token,
          tokenLength: token.length,
          endpoint: config.url,
        });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API Client] No token found in cookies for request to ${config.url}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    // Skip retry for specific endpoints that shouldn't trigger auth flow
    const skipRetryEndpoints = ['/auth/me', '/auth/refresh', '/auth/login'];
    const shouldSkipRetry = skipRetryEndpoints.some(endpoint => 
      originalRequest?.url?.includes(endpoint)
    );
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRetry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Prevent infinite retry loops
      if (originalRequest._retryCount > 2) {
        Cookies.remove('token', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        Cookies.remove('token', { path: '/login' });
        Cookies.remove('refreshToken', { path: '/login' });
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const from = `${window.location.pathname}${window.location.search}`;
          window.location.href = `/login?from=${encodeURIComponent(from)}`;
        }
        return Promise.reject(error);
      }
      
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          const { token } = response.data;
          Cookies.remove('token', { path: '/login' });
          Cookies.set('token', token, { expires: 1, path: '/' });
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          Cookies.remove('token', { path: '/' });
          Cookies.remove('refreshToken', { path: '/' });
          Cookies.remove('token', { path: '/login' });
          Cookies.remove('refreshToken', { path: '/login' });
          if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/unauthorized') {
            const from = `${window.location.pathname}${window.location.search}`;
            window.location.href = `/login?from=${encodeURIComponent(from)}`;
          }
          return Promise.reject(refreshError);
        }
      } else if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/unauthorized') {
        const from = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?from=${encodeURIComponent(from)}`;
      }
    }
    
    // Handle 404 Not Found - log the error but don't mask it with synthetic data
    // This ensures frontend knows when endpoints are actually missing
    if (error.response?.status === 404) {
      const url = error.config?.url || '';
      
      // Log 404 errors in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API Client] 404 Not Found: ${url}`);
      }
      
      // Let the error propagate so frontend can handle it appropriately
      // This prevents masking of backend issues
    }
    
    // Don't log errors for auth/me endpoint during initial load
    if (error.config?.url?.includes('/auth/me') && error.response?.status === 401) {
      return Promise.reject(error);
    }
    
    // Log other errors to console only in development
    if (process.env.NODE_ENV === 'development' && error.response?.status !== 401) {
      console.warn('API Error:', error.config?.url, error.response?.status, error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// API service methods
export const authApi = {
  login: (username: string, password: string) => 
    apiClient.post('/auth/login', { username, password }),
  
  refresh: (refreshToken: string) => 
    apiClient.post('/auth/refresh', { refreshToken }),
  
  logout: () => apiClient.post('/auth/logout'),
  
  me: () => apiClient.get('/auth/me'),
  
  changePassword: (oldPassword: string, newPassword: string, confirmPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword, confirmPassword }),
};

export const usersApi = {
  getAll: (params?: any) => apiClient.get('/users', { params }),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
  search: (query: string) => apiClient.get('/users/search', { params: { query } }),
  getAvailableForAssignment: () => apiClient.get('/users/available-for-assignment'),
  getActiveUsers: () => apiClient.get('/users/list/active'),
  getUserActivity: (id: number, params?: any) => apiClient.get(`/users/${id}/activity`, { params }),
  resetPassword: (id: number, newPassword: string) => 
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
};

export const casesApi = {
  getAll: (params?: any) => apiClient.get('/cases', { params }),
  getById: (id: number) => apiClient.get(`/cases/${id}`),
  create: (data: any) => apiClient.post('/cases', data),
  update: (id: number, data: any) => apiClient.put(`/cases/${id}`, data),
  updateStatus: (id: number, status: string) => apiClient.put(`/cases/${id}/status`, { status }),
  assign: (id: number, userId: number) => apiClient.post(`/cases/${id}/assign`, { userId }),
  assignToTeam: (id: number, teamId: number) => apiClient.post(`/cases/${id}/assign-team`, { teamId }),
  addComment: (id: number, content: string, isInternal?: boolean) => 
    apiClient.post(`/cases/${id}/comments`, { content, isInternal }),
  getComments: (id: number) => apiClient.get(`/cases/${id}/comments`),
  getActivities: (id: number) => apiClient.get(`/cases/${id}/activities`),
  close: (id: number, resolution: string, closingNotes?: string) => 
    apiClient.post(`/cases/${id}/close`, { resolution, closingNotes }),
  resolve: (id: number, resolution: string) => 
    apiClient.post(`/cases/${id}/resolve`, { resolution }),
  reopen: (id: number, reason: string) => 
    apiClient.post(`/cases/${id}/reopen`, { reason }),
  getStats: (period?: string) => apiClient.get('/cases/stats', { params: { period } }),
  getMyCases: () => apiClient.get('/cases/my-cases'),
  
  // Quick Actions
  performQuickAction: (data: any) => apiClient.post('/cases/quick-action', data),
  bulkAssign: (caseIds: number[], userId: number, notes?: string) => 
    apiClient.post('/cases/bulk/assign', { caseIds, userId, notes }),
  bulkClose: (caseIds: number[], resolution: string, notes?: string) => 
    apiClient.post('/cases/bulk/close', { caseIds, resolution, notes }),
};

export const alertsApi = {
  getRules: (params?: any) => apiClient.get('/alert-rules', { params }),
  getRuleById: (id: number) => apiClient.get(`/alert-rules/${id}`),
  createRule: (data: any) => apiClient.post('/alert-rules', data),
  updateRule: (id: number, data: any) => apiClient.put(`/alert-rules/${id}`, data),
  deleteRule: (id: number) => apiClient.delete(`/alert-rules/${id}`),
  toggleRule: (id: number, enabled: boolean) => 
    apiClient.patch(`/alert-rules/${id}/toggle`, { enabled }),
  testRule: (data: any) => apiClient.post('/alert-rules/test', data),
  getHistory: (params?: any) => apiClient.get('/alerts/history', { params }),
  acknowledgeAlert: (id: number, notes?: string) => 
    apiClient.post(`/alerts/${id}/acknowledge`, { notes }),
  resolveAlert: (id: number, notes?: string) => 
    apiClient.post(`/alerts/${id}/resolve`, { notes }),
  assignAlert: (id: number, userId: number) => 
    apiClient.post(`/alerts/${id}/assign`, { userId }),
  getDatasources: () => apiClient.get('/alert-rules/datasources'),
  getFields: (datasource: string) => apiClient.get(`/alert-rules/datasources/${datasource}/fields`),
  exportHistory: (params: any, format: string = 'csv') => 
    apiClient.get('/alerts/history/export', { 
      params: { ...params, format },
      responseType: 'blob'
    }),
  
  // Enhanced Alert Rule Builder APIs
  getSchemas: () => apiClient.get('/alert-rules/schemas'),
  getTables: (schema: string) => apiClient.get(`/alert-rules/tables/${schema}`),
  getColumns: (schema: string, table: string) => 
    apiClient.get(`/alert-rules/columns/${schema}/${table}`),
  getSuggestions: (schema: string, table: string) => 
    apiClient.get(`/alert-rules/suggestions/${schema}/${table}`),
  validateQuery: (data: any) => apiClient.post('/alert-rules/validate-query', data),
  getGrafanaContactPoints: () => apiClient.get('/alert-rules/grafana/contact-points'),
  getGrafanaFolders: () => apiClient.get('/alert-rules/grafana/folders'),
  createWithV1: (data: any) => apiClient.post('/alert-rules/create-with-v1', data),
  getTemplates: () => apiClient.get('/alert-rules/templates'),
};

export const analyticsApi = {
  getOverview: (params?: any) => apiClient.get('/analytics/overview', { params }),
  getTrends: (params?: any) => apiClient.get('/analytics/trends', { params }),
  getTeamPerformance: (params?: any) => apiClient.get('/analytics/team-performance', { params }),
  getReports: (params?: any) => apiClient.get('/analytics/reports', { params }),
  generateReport: (type: string, params: any) => 
    apiClient.post('/analytics/reports/generate', { type, ...params }),
  exportReport: (id: number, format: string) => 
    apiClient.get(`/analytics/reports/${id}/export`, { 
      params: { format },
      responseType: 'blob'
    }),
  
  // Additional analytics endpoints for detailed dashboard
  getPerformanceMetrics: (params?: any) => apiClient.get('/analytics/performance', { params }),
  getTopAlerts: (params?: any) => apiClient.get('/analytics/top-alerts', { params }),
  getUserActivity: (params?: any) => apiClient.get('/analytics/user-activity', { params }),
};

export const teamsApi = {
  getAll: (params?: any) => apiClient.get('/teams', { params }),
  getById: (id: number) => apiClient.get(`/teams/${id}`),
  create: (data: any) => apiClient.post('/teams', data),
  update: (id: number, data: any) => apiClient.put(`/teams/${id}`, data),
  delete: (id: number) => apiClient.delete(`/teams/${id}`),
  addMember: (id: number, userId: number, role?: string) => 
    apiClient.post(`/teams/${id}/members`, { userId, role }),
  removeMember: (id: number, userId: number) => 
    apiClient.delete(`/teams/${id}/members/${userId}`),
  updateMemberRole: (id: number, userId: number, role: string) => 
    apiClient.put(`/teams/${id}/members/${userId}`, { role }),
  getPerformance: (id: number, params?: any) => 
    apiClient.get(`/teams/${id}/performance`, { params }),
};

export const systemApi = {
  getHealth: () => apiClient.get('/system/health'),
  getSettings: (category?: string) => 
    apiClient.get('/system/settings', { params: { category } }),
  updateSetting: (id: number, value: string) => 
    apiClient.put(`/system/settings/${id}`, { value }),
  getEmailSettings: () => apiClient.get('/system/settings/email'),
  updateEmailSettings: (data: any) => apiClient.put('/system/settings/email', data),
  testEmailConnection: () => apiClient.post('/system/settings/email/test'),
  getLogs: (params?: any) => apiClient.get('/system/logs', { params }),
  getSystemStats: () => apiClient.get('/system/stats'),
};

export const grafanaApi = {
  getSettings: () => apiClient.get('/grafana/settings'),
  updateSettings: (data: any) => apiClient.put('/grafana/settings', data),
  testConnection: (data: any) => apiClient.post('/grafana/test-connection', data),
  sync: () => apiClient.post('/grafana/sync'),
  getDashboards: () => apiClient.get('/grafana/dashboards'),
  syncDashboard: (uid: string) => apiClient.post(`/grafana/dashboards/${uid}/sync`),
  getConnectionStatus: () => apiClient.get('/grafana/connection-status'),
  getAlertRules: () => apiClient.get('/grafana/alert-rules'),
  createAlertRule: (data: any) => apiClient.post('/grafana/alert-rules', data),
  updateAlertRule: (uid: string, data: any) => apiClient.put(`/grafana/alert-rules/${uid}`, data),
  deleteAlertRule: (uid: string) => apiClient.delete(`/grafana/alert-rules/${uid}`),
  
  // Enhanced Grafana alert APIs
  getAlerts: (params?: any) => apiClient.get('/grafana/alerts', { params }),
  getAlert: (id: number) => apiClient.get(`/grafana/alerts/${id}`),
  acknowledgeAlert: (id: number, notes?: string) => 
    apiClient.post(`/grafana/alerts/${id}/acknowledge`, { notes }),
  resolveAlert: (id: number, notes?: string) => 
    apiClient.post(`/grafana/alerts/${id}/resolve`, { notes }),
  createCaseFromAlert: (id: number, data?: any) => 
    apiClient.post(`/grafana/alerts/${id}/create-case`, data),
  getAlertHistory: (params?: any) => apiClient.get('/grafana/alerts/history', { params }),
  getAlertMetrics: (params?: any) => apiClient.get('/grafana/alerts/metrics', { params }),
};

// New reporting API
export const reportingApi = {
  generateReport: (data: any) => apiClient.post('/reports/generate', data),
  getReports: (params?: any) => apiClient.get('/reports', { params }),
  getReport: (id: number) => apiClient.get(`/reports/${id}`),
  exportReport: (id: number, format: string) => 
    apiClient.get(`/reports/${id}/export`, { 
      params: { format },
      responseType: 'blob'
    }),
  getScheduledReports: (params?: any) => apiClient.get('/reports/scheduled', { params }),
  createScheduledReport: (data: any) => apiClient.post('/reports/scheduled', data),
  updateScheduledReport: (id: number, data: any) => 
    apiClient.put(`/reports/scheduled/${id}`, data),
  deleteScheduledReport: (id: number) => apiClient.delete(`/reports/scheduled/${id}`),
  runScheduledReport: (id: number) => apiClient.post(`/reports/scheduled/${id}/run`),
  
  // Analytics endpoints
  getAnalyticsOverview: (params?: any) => apiClient.get('/reports/analytics/overview', { params }),
  getTeamPerformance: (params?: any) => apiClient.get('/reports/analytics/team-performance', { params }),
  getAlertAnalytics: (params?: any) => apiClient.get('/reports/analytics/alerts', { params }),
  getSlaReport: (params?: any) => apiClient.get('/reports/analytics/sla', { params }),
  getTrendAnalysis: (params?: any) => apiClient.get('/reports/analytics/trends', { params }),
};

// New notifications API
export const notificationsApi = {
  getNotifications: (params?: any) => apiClient.get('/notifications', { params }),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markAsRead: (id: number) => apiClient.post(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/notifications/mark-all-read'),
  getPreferences: () => apiClient.get('/notifications/preferences'),
  updatePreferences: (data: any) => apiClient.put('/notifications/preferences', data),
  deleteNotification: (id: number) => apiClient.delete(`/notifications/${id}`),
  testNotification: (data: any) => apiClient.post('/notifications/test', data),
};

// Rule Assignment API
export const ruleAssignmentApi = {
  getRuleAssignments: (params?: any) => apiClient.get('/rule-assignments', { params }),
  getRuleAssignmentByGrafanaUid: (grafanaUid: string) => 
    apiClient.get(`/rule-assignments/grafana-rule/${grafanaUid}`),
  createOrUpdateRuleAssignment: (grafanaUid: string, data: any) => 
    apiClient.put(`/rule-assignments/grafana-rule/${grafanaUid}`, data),
  assignUsersAndTeams: (grafanaUid: string, data: any) => 
    apiClient.post(`/rule-assignments/grafana-rule/${grafanaUid}/assign`, data),
  removeAssignments: (grafanaUid: string, data: any) => 
    apiClient.delete(`/rule-assignments/grafana-rule/${grafanaUid}/assign`, { data }),
  toggleRuleStatus: (uid: string, active: boolean) =>
    apiClient.patch(`/rule-assignments/grafana-rule/${uid}/status`, { active }),
  getMyAssignments: () => apiClient.get('/rule-assignments/my-assignments'),
  syncFromGrafana: () => apiClient.post('/rule-assignments/sync-from-grafana'),
  getStatistics: () => apiClient.get('/rule-assignments/statistics'),
  getGrafanaRules: () => apiClient.get('/rule-assignments/grafana-rules'),
};
