import { apiClient } from '../client';
import type { 
  Case, 
  CaseFilters, 
  CreateCaseRequest, 
  UpdateCaseRequest, 
  AssignCaseRequest,
  CloseCaseRequest,
  PaginatedResponse,
  ApiResponse,
  QuickActionRequest,
  QuickActionResponse,
  MergeResult
} from '../types';

const BASE_URL = '/cases';

export const caseApi = {
  // Get all cases with pagination and filters
  getCases: (filters?: Partial<CaseFilters & { page?: number; size?: number }>) =>
    apiClient.get<PaginatedResponse<Case>>(`${BASE_URL}`, { params: filters }),

  // Get single case by ID
  getCase: (id: number) =>
    apiClient.get<ApiResponse<Case>>(`${BASE_URL}/${id}`),

  // Get cases assigned to current user
  getMyCases: (includeClosedCases = false) =>
    apiClient.get<ApiResponse<Case[]>>(`${BASE_URL}/my-cases`, {
      params: { includeClosedCases }
    }),

  // Get unassigned cases (admin only)
  getUnassignedCases: (filters?: Partial<CaseFilters>) =>
    apiClient.get<ApiResponse<Case[]>>(`${BASE_URL}/unassigned`, { params: filters }),

  // Count unassigned cases
  getUnassignedCasesCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>(`${BASE_URL}/unassigned/count`),

  // Create new case
  createCase: (data: CreateCaseRequest) =>
    apiClient.post<ApiResponse<Case>>(`${BASE_URL}`, data),

  // Update case
  updateCase: (id: number, data: UpdateCaseRequest) =>
    apiClient.put<ApiResponse<Case>>(`${BASE_URL}/${id}`, data),

  // Assign case to user
  assignCase: (id: number, data: AssignCaseRequest) =>
    apiClient.post<ApiResponse<Case>>(`${BASE_URL}/${id}/assign`, data),

  // Close case
  closeCase: (id: number, data: CloseCaseRequest) =>
    apiClient.post<ApiResponse<Case>>(`${BASE_URL}/${id}/close`, data),

  // Reopen case
  reopenCase: (id: number) =>
    apiClient.post<ApiResponse<Case>>(`${BASE_URL}/${id}/reopen`),

  // Delete case
  deleteCase: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`),

  // Quick actions
  quickAction: (data: QuickActionRequest) =>
    apiClient.post<ApiResponse<QuickActionResponse>>(`${BASE_URL}/quick-action`, data),

  // Acknowledge case
  acknowledgeCase: (caseId: number, userId: number, notes?: string) =>
    apiClient.post<ApiResponse<QuickActionResponse>>(`${BASE_URL}/quick-action`, {
      caseId,
      userId,
      action: 'ACKNOWLEDGE',
      notes
    }),

  // Mark as false positive
  markFalsePositive: (caseId: number, userId: number, reason: string) =>
    apiClient.post<ApiResponse<QuickActionResponse>>(`${BASE_URL}/quick-action`, {
      caseId,
      userId,
      action: 'FALSE_POSITIVE',
      reason
    }),

  // Escalate case
  escalateCase: (caseId: number, userId: number, reason: string) =>
    apiClient.post<ApiResponse<QuickActionResponse>>(`${BASE_URL}/quick-action`, {
      caseId,
      userId,
      action: 'ESCALATE',
      reason
    }),

  // Merge cases
  mergeCases: (primaryCaseId: number, secondaryCaseIds: number[], userId: number) =>
    apiClient.post<ApiResponse<MergeResult>>(`${BASE_URL}/quick-action`, {
      caseId: primaryCaseId,
      userId,
      action: 'MERGE',
      secondaryCaseIds
    }),

  // Get case activities
  getCaseActivities: (id: number) =>
    apiClient.get<ApiResponse<any[]>>(`${BASE_URL}/${id}/activities`),

  // Add case comment
  addCaseComment: (id: number, data: { content: string; isInternal: boolean }) =>
    apiClient.post<ApiResponse<any>>(`${BASE_URL}/${id}/comments`, data),

  // Get case comments
  getCaseComments: (id: number) =>
    apiClient.get<ApiResponse<any[]>>(`${BASE_URL}/${id}/comments`),

  // Search cases
  searchCases: (query: string, page = 0, size = 20) =>
    apiClient.get<PaginatedResponse<Case>>(`${BASE_URL}/search`, {
      params: { q: query, page, size }
    }),

  // Export cases
  exportCases: (filters?: Partial<CaseFilters>, format = 'csv') =>
    apiClient.get(`${BASE_URL}/export`, {
      params: { ...filters, format },
      responseType: 'blob'
    }),

  // Get case statistics
  getCaseStats: (dateRange?: { start: string; end: string }) =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/stats`, { params: dateRange }),

  // Bulk operations
  bulkAssign: (caseIds: number[], userId: number, notes?: string) =>
    apiClient.post<ApiResponse<{ success: number; failed: number }>>(`${BASE_URL}/bulk/assign`, {
      caseIds,
      userId,
      notes
    }),

  bulkClose: (caseIds: number[], resolution: string, notes?: string) =>
    apiClient.post<ApiResponse<{ success: number; failed: number }>>(`${BASE_URL}/bulk/close`, {
      caseIds,
      resolution,
      notes
    }),

  bulkUpdateStatus: (caseIds: number[], status: string) =>
    apiClient.post<ApiResponse<{ success: number; failed: number }>>(`${BASE_URL}/bulk/status`, {
      caseIds,
      status
    }),

  // SLA management
  getSlaBreachedCases: () =>
    apiClient.get<ApiResponse<Case[]>>(`${BASE_URL}/sla-breached`),

  getCasesNearingSla: (hours = 2) =>
    apiClient.get<ApiResponse<Case[]>>(`${BASE_URL}/sla-warning`, { params: { hours } }),

  // Case analytics
  getCaseTrends: (period: 'day' | 'week' | 'month' = 'week') =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/analytics/trends`, { params: { period } }),

  getCasesByTeam: (dateRange?: { start: string; end: string }) =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/analytics/by-team`, { params: dateRange }),

  getResolutionMetrics: (dateRange?: { start: string; end: string }) =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/analytics/resolution`, { params: dateRange })
};