'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Spin } from 'antd';
import Cookies from 'js-cookie';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on mount
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      
      // Quick check for token before calling checkAuth
      const token = Cookies.get('token');
      if (!token && pathname !== '/login') {
        router.replace('/login');
      } else if (token) {
        checkAuth();
      }
    }
  }, []);

  useEffect(() => {
    // Only redirect if we've finished checking auth and user is not authenticated
    if (hasCheckedAuth.current && !isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, pathname]);

  // Check role-based access
  useEffect(() => {
    if (isAuthenticated && user && requiredRoles && requiredRoles.length > 0) {
      const userRoles = user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        router.replace('/unauthorized');
      }
    }
  }, [isAuthenticated, user, requiredRoles]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}