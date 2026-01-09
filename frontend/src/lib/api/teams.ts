import { apiClient } from '../client';
import type { 
  Team, 
  TeamPerformance, 
  CreateTeamRequest, 
  UpdateTeamRequest, 
  TeamMemberRequest,
  PaginatedResponse, 
  ApiResponse 
} from '../types';

const BASE_URL = '/teams';

export const teamApi = {
  // Get all teams
  getAllTeams: (includeInactive = false) =>
    apiClient.get<ApiResponse<Team[]>>(`${BASE_URL}`, {
      params: { includeInactive }
    }),

  // Get teams with pagination
  getTeams: (page = 0, size = 20, search?: string) =>
    apiClient.get<PaginatedResponse<Team>>(`${BASE_URL}/paginated`, {
      params: { page, size, search }
    }),

  // Get single team
  getTeam: (id: number) =>
    apiClient.get<ApiResponse<Team>>(`${BASE_URL}/${id}`),

  // Get team with members
  getTeamWithMembers: (id: number) =>
    apiClient.get<ApiResponse<Team>>(`${BASE_URL}/${id}/with-members`),

  // Create team
  createTeam: (data: CreateTeamRequest) =>
    apiClient.post<ApiResponse<Team>>(`${BASE_URL}`, data),

  // Update team
  updateTeam: (id: number, data: UpdateTeamRequest) =>
    apiClient.put<ApiResponse<Team>>(`${BASE_URL}/${id}`, data),

  // Delete team
  deleteTeam: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`),

  // Team member management
  addTeamMember: (teamId: number, data: TeamMemberRequest) =>
    apiClient.post<ApiResponse<Team>>(`${BASE_URL}/${teamId}/members`, data),

  removeTeamMember: (teamId: number, userId: number) =>
    apiClient.delete<ApiResponse<Team>>(`${BASE_URL}/${teamId}/members/${userId}`),

  updateTeamMemberRole: (teamId: number, userId: number, role: 'MEMBER' | 'LEAD') =>
    apiClient.patch<ApiResponse<Team>>(`${BASE_URL}/${teamId}/members/${userId}`, { role }),

  // Get team members
  getTeamMembers: (id: number) =>
    apiClient.get<ApiResponse<Team['members']>>(`${BASE_URL}/${id}/members`),

  // Team performance
  getTeamPerformance: (id: number, startDate?: string, endDate?: string) =>
    apiClient.get<ApiResponse<TeamPerformance>>(`${BASE_URL}/${id}/performance`, {
      params: { startDate, endDate }
    }),

  getAllTeamsPerformance: (startDate?: string, endDate?: string) =>
    apiClient.get<ApiResponse<TeamPerformance[]>>(`${BASE_URL}/performance`, {
      params: { startDate, endDate }
    }),

  compareTeamsPerformance: (teamIds: number[], startDate?: string, endDate?: string) =>
    apiClient.post<ApiResponse<any>>(`${BASE_URL}/performance/compare`, {
      teamIds,
      startDate,
      endDate
    }),

  // Team workload
  getTeamWorkload: (id: number) =>
    apiClient.get<ApiResponse<{
      totalCases: number;
      activeCases: number;
      openCases: number;
      inProgressCases: number;
      memberWorkload: Array<{
        userId: number;
        userName: string;
        activeCases: number;
      }>;
    }>>(`${BASE_URL}/${id}/workload`),

  // Team analytics
  getTeamCaseDistribution: (id: number, period: 'week' | 'month' | 'quarter' = 'month') =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/${id}/analytics/cases`, {
      params: { period }
    }),

  getTeamResolutionTrends: (id: number, period: 'week' | 'month' | 'quarter' = 'month') =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/${id}/analytics/resolution-trends`, {
      params: { period }
    }),

  // Search teams
  searchTeams: (query: string) =>
    apiClient.get<ApiResponse<Team[]>>(`${BASE_URL}/search`, {
      params: { q: query }
    }),

  // Get teams by department
  getTeamsByDepartment: (department: string) =>
    apiClient.get<ApiResponse<Team[]>>(`${BASE_URL}/by-department`, {
      params: { department }
    }),

  // Get teams for user
  getTeamsForUser: (userId: number) =>
    apiClient.get<ApiResponse<Team[]>>(`${BASE_URL}/for-user/${userId}`),

  // Activate/deactivate team
  toggleTeamStatus: (id: number, isActive: boolean) =>
    apiClient.patch<ApiResponse<Team>>(`${BASE_URL}/${id}/status`, { isActive })
};