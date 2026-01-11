import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export type UserRole = 'ADMIN' | 'MANAGER' | 'ANALYST' | 'VIEWER';

interface RolePermissions {
  canViewDashboard: boolean;
  canViewCases: boolean;
  canCreateCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;
  canAssignCases: boolean;
  canViewAlerts: boolean;
  canManageAlerts: boolean;
  canViewRuleAssignments: boolean;
  canManageRuleAssignments: boolean;
  canViewTeams: boolean;
  canManageTeams: boolean;
  canViewUsers: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canGenerateReports: boolean;
  canViewSystemSettings: boolean;
  canManageSystemSettings: boolean;
  canViewGrafanaIntegration: boolean;
  canManageGrafanaIntegration: boolean;
}

const rolePermissionsMap: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canViewDashboard: true,
    canViewCases: true,
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: true,
    canAssignCases: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canViewRuleAssignments: true,
    canManageRuleAssignments: true,
    canViewTeams: true,
    canManageTeams: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewReports: true,
    canGenerateReports: true,
    canViewSystemSettings: true,
    canManageSystemSettings: true,
    canViewGrafanaIntegration: true,
    canManageGrafanaIntegration: true,
  },
  MANAGER: {
    canViewDashboard: true,
    canViewCases: true,
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canAssignCases: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canViewRuleAssignments: true,
    canManageRuleAssignments: true,
    canViewTeams: true,
    canManageTeams: true,
    canViewUsers: true,
    canManageUsers: false,
    canViewReports: true,
    canGenerateReports: true,
    canViewSystemSettings: false,
    canManageSystemSettings: false,
    canViewGrafanaIntegration: true,
    canManageGrafanaIntegration: false,
  },
  ANALYST: {
    canViewDashboard: true,
    canViewCases: true,
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canAssignCases: false,
    canViewAlerts: true,
    canManageAlerts: false,
    canViewRuleAssignments: true,
    canManageRuleAssignments: false,
    canViewTeams: true,
    canManageTeams: false,
    canViewUsers: false,
    canManageUsers: false,
    canViewReports: true,
    canGenerateReports: true,
    canViewSystemSettings: false,
    canManageSystemSettings: false,
    canViewGrafanaIntegration: false,
    canManageGrafanaIntegration: false,
  },
  VIEWER: {
    canViewDashboard: true,
    canViewCases: true,
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canAssignCases: false,
    canViewAlerts: true,
    canManageAlerts: false,
    canViewRuleAssignments: true,
    canManageRuleAssignments: false,
    canViewTeams: false,
    canManageTeams: false,
    canViewUsers: false,
    canManageUsers: false,
    canViewReports: true,
    canGenerateReports: false,
    canViewSystemSettings: false,
    canManageSystemSettings: false,
    canViewGrafanaIntegration: false,
    canManageGrafanaIntegration: false,
  },
};

export function useRoleAccess() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [permissions, setPermissions] = useState<RolePermissions>(
    rolePermissionsMap.VIEWER
  );

  useEffect(() => {
    if (user?.role) {
      const userRole = user.role.toUpperCase() as UserRole;
      setPermissions(rolePermissionsMap[userRole] || rolePermissionsMap.VIEWER);
    }
  }, [user]);

  const checkAccess = (permission: keyof RolePermissions): boolean => {
    return permissions[permission];
  };

  const requireAccess = (permission: keyof RolePermissions, redirectTo = '/') => {
    if (!isLoading && !checkAccess(permission)) {
      router.push(redirectTo);
      return false;
    }
    return true;
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user?.role) return false;
    const userRole = user.role.toUpperCase() as UserRole;
    return roles.includes(userRole);
  };

  const isAdmin = () => hasRole(['ADMIN']);
  const isManager = () => hasRole(['MANAGER']);
  const isAnalyst = () => hasRole(['ANALYST']);
  const isViewer = () => hasRole(['VIEWER']);
  const canManage = () => hasRole(['ADMIN', 'MANAGER']);

  return {
    user,
    permissions,
    checkAccess,
    requireAccess,
    hasRole,
    isAdmin,
    isManager,
    isAnalyst,
    isViewer,
    canManage,
    isLoading,
  };
}

// Higher-order component for role-based route protection
export function withRoleAccess(
  Component: React.ComponentType<any>,
  requiredPermission: keyof RolePermissions,
  redirectTo = '/'
) {
  return function ProtectedComponent(props: any) {
    const { checkAccess, isLoading } = useRoleAccess();
    const router = useRouter();
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
      if (!isLoading) {
        if (!checkAccess(requiredPermission)) {
          router.push(redirectTo);
        } else {
          setHasAccess(true);
        }
      }
    }, [isLoading, checkAccess, requiredPermission, router]);

    if (isLoading || !hasAccess) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };
}
