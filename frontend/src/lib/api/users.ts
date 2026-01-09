import { apiClient } from '../client';
import type { User, PaginatedResponse, ApiResponse } from '../types';

const BASE_URL = '/users';

export const userApi = {
  // Get all users
  getAllUsers: (includeInactive = false) =>
    apiClient.get<ApiResponse<User[]>>(`${BASE_URL}`, {
      params: { includeInactive }
    }),

  // Get users with pagination
  getUsers: (page = 0, size = 20, search?: string) =>
    apiClient.get<PaginatedResponse<User>>(`${BASE_URL}/paginated`, {
      params: { page, size, search }
    }),

  // Get single user
  getUser: (id: number) =>
    apiClient.get<ApiResponse<User>>(`${BASE_URL}/${id}`),

  // Get current user profile
  getCurrentUser: () =>
    apiClient.get<ApiResponse<User>>(`${BASE_URL}/me`),

  // Create user
  createUser: (data: {
    username: string;
    email: string;
    fullName: string;
    role: string;
    department?: string;
    password: string;
  }) =>
    apiClient.post<ApiResponse<User>>(`${BASE_URL}`, data),

  // Update user
  updateUser: (id: number, data: {
    email?: string;
    fullName?: string;
    role?: string;
    department?: string;
    isActive?: boolean;
  }) =>
    apiClient.put<ApiResponse<User>>(`${BASE_URL}/${id}`, data),

  // Update current user profile
  updateProfile: (data: {
    email?: string;
    fullName?: string;
    department?: string;
  }) =>
    apiClient.put<ApiResponse<User>>(`${BASE_URL}/me`, data),

  // Change password
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) =>
    apiClient.post<ApiResponse<void>>(`${BASE_URL}/change-password`, data),

  // Reset user password (admin only)
  resetPassword: (id: number) =>
    apiClient.post<ApiResponse<{ temporaryPassword: string }>>(`${BASE_URL}/${id}/reset-password`),

  // Activate/deactivate user
  toggleUserStatus: (id: number, isActive: boolean) =>
    apiClient.patch<ApiResponse<User>>(`${BASE_URL}/${id}/status`, { isActive }),

  // Delete user
  deleteUser: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`),

  // Search users
  searchUsers: (query: string) =>
    apiClient.get<ApiResponse<User[]>>(`${BASE_URL}/search`, {
      params: { q: query }
    }),

  // Get users by role
  getUsersByRole: (role: string) =>
    apiClient.get<ApiResponse<User[]>>(`${BASE_URL}/by-role`, {
      params: { role }
    }),

  // Get user activity
  getUserActivity: (id: number, days = 30) =>
    apiClient.get<ApiResponse<any[]>>(`${BASE_URL}/${id}/activity`, {
      params: { days }
    }),

  // Get user performance metrics
  getUserPerformance: (id: number, startDate?: string, endDate?: string) =>
    apiClient.get<ApiResponse<any>>(`${BASE_URL}/${id}/performance`, {
      params: { startDate, endDate }
    }),

  // Get user workload
  getUserWorkload: (id: number) =>
    apiClient.get<ApiResponse<{
      activeCases: number;
      openCases: number;
      inProgressCases: number;
      overdueCase: number;
    }>>(`${BASE_URL}/${id}/workload`)
};