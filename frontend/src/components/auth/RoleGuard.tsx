'use client';

import React from 'react';
import { useAuthStore } from '@/store/auth-store';
import { hasPermission, hasAnyPermission, hasAllPermissions, UserRole, Permission } from '@/lib/rbac';

interface RoleGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render children based on user role or permissions
 * @param roles - Array of roles that can access this content
 * @param permissions - Single permission or array of permissions required
 * @param requireAll - If true, user must have ALL permissions. If false (default), ANY permission is sufficient
 * @param fallback - Optional component to render if access is denied
 */
export function RoleGuard({ 
  children, 
  roles, 
  permissions,
  requireAll = false,
  fallback = null 
}: RoleGuardProps) {
  const { user } = useAuthStore();
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!roles.includes(userRole as UserRole)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permissions) {
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
    
    const hasAccess = requireAll 
      ? hasAllPermissions(userRole, permissionArray)
      : hasAnyPermission(userRole, permissionArray);
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Utility components for common role checks
 */
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleGuard roles={[UserRole.ADMIN]} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const ManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleGuard roles={[UserRole.MANAGER]} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const AdminOrManager: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleGuard roles={[UserRole.ADMIN, UserRole.MANAGER]} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const AnalystOrHigher: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleGuard roles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST]} fallback={fallback}>
    {children}
  </RoleGuard>
);

/**
 * Hook to check permissions programmatically
 */
export function useRolePermissions() {
  const { user } = useAuthStore();
  const userRole = user?.role || (user?.roles && user.roles[0]) || 'VIEWER';

  return {
    userRole,
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    isAdmin: () => userRole === UserRole.ADMIN,
    isManager: () => userRole === UserRole.MANAGER,
    isAnalyst: () => userRole === UserRole.ANALYST,
    isViewer: () => userRole === UserRole.VIEWER,
  };
}