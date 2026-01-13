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
  role: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  token?: string;
  teams?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuth: () => void;
}

// Check initial auth state synchronously
const getInitialAuth = () => {
  if (typeof window === 'undefined') return { isAuthenticated: false, user: null };
  
  const token = Cookies.get('token');
  const storedUser = sessionStorage.getItem('user');
  
  if (token && storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return { isAuthenticated: true, user };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  }
  
  return { isAuthenticated: !!token, user: null };
};

const initialState = getInitialAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,

  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    const { token, refreshToken, user } = response.data;
    
    // Transform the user object to match frontend expectations
    const transformedUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.name?.split(' ')[0],
      lastName: user.name?.split(' ').slice(1).join(' '),
      roles: user.role ? [user.role] : [],
      role: user.role || 'VIEWER',
      active: user.active,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    // Set cookies
    Cookies.set('token', token, { expires: 1, path: '/' });
    Cookies.set('refreshToken', refreshToken, { expires: 7, path: '/' });
    
    // Store user in sessionStorage for fast access
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(transformedUser));
    }
    
    set({ 
      user: transformedUser, 
      isAuthenticated: true
    });
  },

  logout: () => {
    // Clear cookies
    Cookies.remove('token', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    
    // Disconnect WebSocket
    wsService.disconnect();
    
    // Clear React Query cache
    queryClient.clear();
    
    // Clear storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notifications');
      sessionStorage.clear();
    }
    
    // Clear auth state
    set({ user: null, isAuthenticated: false });
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
      
      // Transform the user object
      const transformedUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        roles: user.role ? [user.role] : user.roles || [],
        role: user.role || 'VIEWER',
        active: user.active,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      Cookies.set('token', token, { expires: 1, path: '/' });
      
      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(transformedUser));
      }
      
      set({ user: transformedUser, isAuthenticated: true });
    } catch (error) {
      set({ isAuthenticated: false, user: null });
      Cookies.remove('token', { path: '/' });
      Cookies.remove('refreshToken', { path: '/' });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
      }
    }
  },

  checkAuth: async () => {
    const token = Cookies.get('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
      }
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      
      // Transform the user object
      const transformedUser: User = {
        id: user.id,
        username: user.username || user.login,
        email: user.email,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        roles: user.role ? [user.role] : user.roles || [],
        role: user.role || 'VIEWER',
        active: user.active !== undefined ? user.active : true,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || new Date().toISOString()
      };
      
      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(transformedUser));
      }
      
      set({ 
        user: transformedUser, 
        isAuthenticated: true
      });
    } catch (error: any) {
      // Only attempt refresh if we get a 401
      if (error.response?.status === 401) {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          try {
            await get().refreshToken();
          } catch (refreshError) {
            // Refresh failed, clear auth
            Cookies.remove('token', { path: '/' });
            Cookies.remove('refreshToken', { path: '/' });
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('user');
            }
            set({ isAuthenticated: false, user: null });
          }
        } else {
          // No refresh token
          Cookies.remove('token', { path: '/' });
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('user');
          }
          set({ isAuthenticated: false, user: null });
        }
      }
    }
  },

  initializeAuth: () => {
    const { isAuthenticated, user } = getInitialAuth();
    set({ isAuthenticated, user });
  },
}));