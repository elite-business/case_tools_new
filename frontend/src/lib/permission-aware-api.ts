/**
 * Permission-aware API client wrapper
 * Provides automatic permission checking before API calls
 */

import { Permission, hasPermission } from './rbac';
import { apiClient, casesApi, alertsApi, usersApi, teamsApi } from './api-client';
import { message } from 'antd';

export class PermissionAwareAPI {
  private userRole: string;

  constructor(userRole: string) {
    this.userRole = userRole;
  }

  /**
   * Check if user has required permission and execute API call
   */
  private async executeWithPermission<T>(
    permission: Permission,
    apiCall: () => Promise<T>,
    errorMessage?: string
  ): Promise<T> {
    if (!hasPermission(this.userRole, permission)) {
      const msg = errorMessage || 'You do not have permission to perform this action';
      message.error(msg);
      throw new Error(msg);
    }
    return apiCall();
  }

  /**
   * Cases API with permission checks
   */
  cases = {
    getAll: (params?: any) => {
      // View permission is checked, but data filtering happens server-side
      return this.executeWithPermission(
        Permission.VIEW_CASES,
        () => casesApi.getAll(params)
      );
    },
    
    getById: (id: number) => {
      return this.executeWithPermission(
        Permission.VIEW_CASES,
        () => casesApi.getById(id)
      );
    },
    
    create: (data: any) => {
      return this.executeWithPermission(
        Permission.CREATE_CASES,
        () => casesApi.create(data),
        'You do not have permission to create cases'
      );
    },
    
    update: (id: number, data: any) => {
      return this.executeWithPermission(
        Permission.EDIT_CASES,
        () => casesApi.update(id, data),
        'You do not have permission to edit cases'
      );
    },
    
    // delete: (id: number) => {
    //   return this.executeWithPermission(
    //     Permission.DELETE_CASES,
    //     () => casesApi.delete(id),
    //     'You do not have permission to delete cases'
    //   );
    // },
    
    assign: (id: number, userId: number) => {
      return this.executeWithPermission(
        Permission.ASSIGN_CASES,
        () => casesApi.assign(id, userId),
        'You do not have permission to assign cases'
      );
    },
    
    close: (id: number, reason: string, resolution: string) => {
      return this.executeWithPermission(
        Permission.CLOSE_CASES,
        () => casesApi.close(id, reason, resolution),
        'You do not have permission to close cases'
      );
    },
  };

  /**
   * Alerts API with permission checks
   */
  alerts = {
    getHistory: (params?: any) => {
      return this.executeWithPermission(
        Permission.VIEW_ALERTS,
        () => alertsApi.getHistory(params)
      );
    },
    
    acknowledgeAlert: (id: number) => {
      return this.executeWithPermission(
        Permission.ACKNOWLEDGE_ALERTS,
        () => alertsApi.acknowledgeAlert(id),
        'You do not have permission to acknowledge alerts'
      );
    },
    
    resolveAlert: (id: number) => {
      return this.executeWithPermission(
        Permission.RESOLVE_ALERTS,
        () => alertsApi.resolveAlert(id),
        'You do not have permission to resolve alerts'
      );
    },
    
    assignAlert: (id: number, userId: number) => {
      return this.executeWithPermission(
        Permission.ASSIGN_ALERTS,
        () => alertsApi.assignAlert(id, userId),
        'You do not have permission to assign alerts'
      );
    },
    
    exportHistory: (filters: any, format: string) => {
      return this.executeWithPermission(
        Permission.EXPORT_ALERTS,
        () => alertsApi.exportHistory(filters, format),
        'You do not have permission to export alerts'
      );
    },
  };

  /**
   * Rules API with permission checks
   */
  rules = {
    getAll: () => {
      return this.executeWithPermission(
        Permission.VIEW_RULES,
        () => apiClient.get('/alert-rules')
      );
    },
    
    create: (data: any) => {
      return this.executeWithPermission(
        Permission.CREATE_RULES,
        () => apiClient.post('/alert-rules', data),
        'You do not have permission to create rules'
      );
    },
    
    update: (id: string, data: any) => {
      return this.executeWithPermission(
        Permission.EDIT_RULES,
        () => apiClient.put(`/alert-rules/${id}`, data),
        'You do not have permission to edit rules'
      );
    },
    
    delete: (id: string) => {
      return this.executeWithPermission(
        Permission.DELETE_RULES,
        () => apiClient.delete(`/alert-rules/${id}`),
        'You do not have permission to delete rules'
      );
    },
    
    test: (query: string) => {
      return this.executeWithPermission(
        Permission.TEST_RULES,
        () => apiClient.post('/alert-rules/test', { query }),
        'You do not have permission to test rules'
      );
    },
  };

  /**
   * Users API with permission checks
   */
  users = {
    getAll: (params?: any) => {
      return this.executeWithPermission(
        Permission.VIEW_USERS,
        () => usersApi.getAll(params)
      );
    },
    
    create: (data: any) => {
      return this.executeWithPermission(
        Permission.CREATE_USERS,
        () => usersApi.create(data),
        'You do not have permission to create users'
      );
    },
    
    update: (id: number, data: any) => {
      return this.executeWithPermission(
        Permission.EDIT_USERS,
        () => usersApi.update(id, data),
        'You do not have permission to edit users'
      );
    },
    
    delete: (id: number) => {
      return this.executeWithPermission(
        Permission.DELETE_USERS,
        () => usersApi.delete(id),
        'You do not have permission to delete users'
      );
    },
  };

  /**
   * Teams API with permission checks
   */
  teams = {
    getAll: (params?: any) => {
      return this.executeWithPermission(
        Permission.VIEW_TEAMS,
        () => teamsApi.getAll(params)
      );
    },
    
    create: (data: any) => {
      return this.executeWithPermission(
        Permission.CREATE_TEAMS,
        () => teamsApi.create(data),
        'You do not have permission to create teams'
      );
    },
    
    update: (id: number, data: any) => {
      return this.executeWithPermission(
        Permission.EDIT_TEAMS,
        () => teamsApi.update(id, data),
        'You do not have permission to edit teams'
      );
    },
    
    delete: (id: number) => {
      return this.executeWithPermission(
        Permission.DELETE_TEAMS,
        () => teamsApi.delete(id),
        'You do not have permission to delete teams'
      );
    },
    
    addMember: (teamId: number, userId: number, role: string) => {
      return this.executeWithPermission(
        Permission.MANAGE_TEAM_MEMBERS,
        () => teamsApi.addMember(teamId, userId, role),
        'You do not have permission to manage team members'
      );
    },
    
    removeMember: (teamId: number, userId: number) => {
      return this.executeWithPermission(
        Permission.MANAGE_TEAM_MEMBERS,
        () => teamsApi.removeMember(teamId, userId),
        'You do not have permission to manage team members'
      );
    },
  };

  /**
   * Analytics API with permission checks
   */
  analytics = {
    getDashboard: () => {
      return this.executeWithPermission(
        Permission.VIEW_ANALYTICS,
        () => apiClient.get('/analytics/dashboard')
      );
    },
    
    exportReport: (type: string, params: any) => {
      return this.executeWithPermission(
        Permission.EXPORT_DATA,
        () => apiClient.post('/analytics/export', { type, ...params }),
        'You do not have permission to export data'
      );
    },
  };

  /**
   * System Settings API with permission checks
   */
  settings = {
    getAll: () => {
      return this.executeWithPermission(
        Permission.VIEW_SETTINGS,
        () => apiClient.get('/settings')
      );
    },
    
    update: (data: any) => {
      return this.executeWithPermission(
        Permission.EDIT_SETTINGS,
        () => apiClient.put('/settings', data),
        'You do not have permission to edit system settings'
      );
    },
  };

  /**
   * Grafana API with permission checks
   */
  grafana = {
    getSettings: () => {
      return this.executeWithPermission(
        Permission.VIEW_GRAFANA,
        () => apiClient.get('/grafana/settings')
      );
    },
    
    updateSettings: (data: any) => {
      return this.executeWithPermission(
        Permission.MANAGE_GRAFANA,
        () => apiClient.put('/grafana/settings', data),
        'You do not have permission to manage Grafana settings'
      );
    },
    
    sync: () => {
      return this.executeWithPermission(
        Permission.MANAGE_GRAFANA,
        () => apiClient.post('/grafana/sync'),
        'You do not have permission to sync with Grafana'
      );
    },
  };
}

/**
 * Hook to use permission-aware API
 */
export function usePermissionAwareAPI() {
  const getUserRole = () => {
    // Get from auth store or context
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      const parsed = JSON.parse(authState);
      return parsed?.state?.user?.role || 'VIEWER';
    }
    return 'VIEWER';
  };

  const userRole = getUserRole();
  return new PermissionAwareAPI(userRole);
}