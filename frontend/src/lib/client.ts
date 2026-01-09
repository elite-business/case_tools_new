import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // For JWT cookies
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage or wherever you store it
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for handling common responses
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 errors (token expired)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
              refreshToken
            });
            
            const { accessToken } = refreshResponse.data;
            localStorage.setItem('accessToken', accessToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }

      // Handle 403 errors (insufficient permissions)
      if (error.response?.status === 403) {
        console.error('Access denied:', error.response.data.message);
        // You might want to show a notification here
      }

      // Handle 500 errors
      if (error.response?.status >= 500) {
        console.error('Server error:', error.response.data);
        // You might want to show a notification here
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Export the configured client
export const apiClient = createApiClient();

// Utility function to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};

// Utility function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    return error.response.data.message || error.response.data.error || 'Server error occurred';
  } else if (error.request) {
    // Network error
    return 'Network error - please check your connection';
  } else {
    // Other error
    return error.message || 'An unexpected error occurred';
  }
};

// Utility types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}