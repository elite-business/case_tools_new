import { apiClient } from '../api-client';
import { 
  RuleAssignment, 
  CreateRuleAssignmentRequest, 
  AssignRuleRequest,
  PaginatedResponse 
} from '../types';

export const ruleAssignmentsApi = {
  // Get all rule assignments with filtering
  getRuleAssignments: async (params?: {
    search?: string;
    active?: boolean;
    page?: number;
    size?: number;
  }) => {
    const response = await apiClient.get<PaginatedResponse<RuleAssignment>>('/api/rule-assignments', {
      params
    });
    return response.data;
  },

  // Get rule assignment by Grafana rule UID
  getRuleAssignmentByUid: async (uid: string) => {
    const response = await apiClient.get<RuleAssignment>(`/api/rule-assignments/grafana-rule/${uid}`);
    return response.data;
  },

  // Create or update rule assignment
  createOrUpdateRuleAssignment: async (uid: string, data: CreateRuleAssignmentRequest) => {
    const response = await apiClient.put<RuleAssignment>(`/api/rule-assignments/grafana-rule/${uid}`, data);
    return response.data;
  },

  // Assign users and teams to a rule
  assignUsersAndTeams: async (uid: string, data: AssignRuleRequest) => {
    const response = await apiClient.post<RuleAssignment>(`/api/rule-assignments/grafana-rule/${uid}/assign`, data);
    return response.data;
  },

  // Remove assignments from a rule
  removeAssignments: async (uid: string, data: { userIds?: number[]; teamIds?: number[] }) => {
    const response = await apiClient.delete<RuleAssignment>(`/api/rule-assignments/grafana-rule/${uid}/assignments`, {
      data
    });
    return response.data;
  },

  // Toggle rule active status
  toggleRuleStatus: async (uid: string, active: boolean) => {
    const response = await apiClient.patch<RuleAssignment>(`/api/rule-assignments/grafana-rule/${uid}/status`, {
      active
    });
    return response.data;
  },

  // Get user's assigned rules
  getUserAssignments: async () => {
    const response = await apiClient.get<RuleAssignment[]>('/api/rule-assignments/my-assignments');
    return response.data;
  },

  // Sync rules from Grafana
  syncFromGrafana: async () => {
    const response = await apiClient.post<{ synced: number; message: string }>('/api/rule-assignments/sync-from-grafana');
    return response.data;
  },

  // Get assignment statistics
  getAssignmentStats: async () => {
    const response = await apiClient.get<{
      totalRules: number;
      assignedRules: number;
      unassignedRules: number;
      activeRules: number;
      totalUsers: number;
      totalTeams: number;
    }>('/api/rule-assignments/stats');
    return response.data;
  }
};