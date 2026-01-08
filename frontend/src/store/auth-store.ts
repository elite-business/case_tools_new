import { create } from 'zustand';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api-client';
import wsService from '@/lib/websocket-stomp';
import { queryClient } from '@/app/providers';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  role: string; // Single role from backend
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { token, refreshToken, user } = response.data;
      
      // Transform the user object to match frontend expectations
      const transformedUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        roles: user.role ? [user.role] : [], // Convert single role to array
        role: user.role || 'VIEWER', // Store single role
        active: user.active,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      Cookies.set('token', token, { expires: 1 });
      Cookies.set('refreshToken', refreshToken, { expires: 7 });
      
      set({ 
        user: transformedUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    // Clear cookies
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    
    // Disconnect WebSocket to prevent notifications from persisting
    wsService.disconnect();
    
    // Clear React Query cache to remove notifications
    queryClient.clear();
    
    // Clear auth state
    set({ user: null, isAuthenticated: false });
    
    // Optional: Clear localStorage if any notification data is stored there
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notifications');
      sessionStorage.clear();
    }
  },

  refreshToken: async () => {
    const refreshToken = Cookies.get('refreshToken');
    if (!refreshToken) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { token, user } = response.data;
      
      // Transform the user object if needed
      const transformedUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        roles: user.role ? [user.role] : user.roles || [],
        role: user.role || 'VIEWER', // Store single role
        active: user.active,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      Cookies.set('token', token, { expires: 1 });
      set({ user: transformedUser, isAuthenticated: true });
    } catch (error) {
      set({ isAuthenticated: false, user: null });
      Cookies.remove('token');
      Cookies.remove('refreshToken');
    }
  },

  checkAuth: async () => {
    const token = Cookies.get('token');
    if (!token) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      
      // Transform the user object to match frontend expectations
      const transformedUser: User = {
        id: user.id,
        username: user.username || user.login,
        email: user.email,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        roles: user.role ? [user.role] : user.roles || [],
        role: user.role || 'VIEWER', // Store single role
        active: user.active !== undefined ? user.active : true,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || new Date().toISOString()
      };
      
      set({ 
        user: transformedUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error: any) {
      // Only attempt refresh if we get a 401, not for other errors
      if (error.response?.status === 401) {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await apiClient.post('/auth/refresh', { refreshToken });
            const { token: newToken, user } = refreshResponse.data;
            Cookies.set('token', newToken, { expires: 1 });
            
            // Transform the refreshed user object
            const transformedUser: User = {
              id: user.id,
              username: user.username || user.login,
              email: user.email,
              firstName: user.name?.split(' ')[0],
              lastName: user.name?.split(' ').slice(1).join(' '),
              roles: user.role ? [user.role] : user.roles || [],
              role: user.role || 'VIEWER', // Store single role
              active: user.active !== undefined ? user.active : true,
              createdAt: user.createdAt || new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            
            set({ 
              user: transformedUser, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } catch (refreshError) {
            // Refresh failed, clear auth
            Cookies.remove('token');
            Cookies.remove('refreshToken');
            set({ isAuthenticated: false, user: null, isLoading: false });
          }
        } else {
          // No refresh token, clear auth
          Cookies.remove('token');
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      } else {
        // Non-401 error, just set loading to false
        set({ isLoading: false });
      }
    }
  },

  clearError: () => set({ error: null }),
}));