/**
 * Role-Based Access Control (RBAC) utilities
 * Centralized role management for the application
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER'
}

export enum Permission {
  // Case permissions
  VIEW_CASES = 'VIEW_CASES',
  CREATE_CASES = 'CREATE_CASES',
  EDIT_CASES = 'EDIT_CASES',
  DELETE_CASES = 'DELETE_CASES',
  ASSIGN_CASES = 'ASSIGN_CASES',
  CLOSE_CASES = 'CLOSE_CASES',
  
  // Alert permissions
  VIEW_ALERTS = 'VIEW_ALERTS',
  ACKNOWLEDGE_ALERTS = 'ACKNOWLEDGE_ALERTS',
  RESOLVE_ALERTS = 'RESOLVE_ALERTS',
  ASSIGN_ALERTS = 'ASSIGN_ALERTS',
  EXPORT_ALERTS = 'EXPORT_ALERTS',
  
  // Rule permissions
  VIEW_RULES = 'VIEW_RULES',
  CREATE_RULES = 'CREATE_RULES',
  EDIT_RULES = 'EDIT_RULES',
  DELETE_RULES = 'DELETE_RULES',
  TEST_RULES = 'TEST_RULES',
  
  // User permissions
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',
  
  // Team permissions
  VIEW_TEAMS = 'VIEW_TEAMS',
  CREATE_TEAMS = 'CREATE_TEAMS',
  EDIT_TEAMS = 'EDIT_TEAMS',
  DELETE_TEAMS = 'DELETE_TEAMS',
  MANAGE_TEAM_MEMBERS = 'MANAGE_TEAM_MEMBERS',
  
  // System permissions
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA',
  VIEW_GRAFANA = 'VIEW_GRAFANA',
  MANAGE_GRAFANA = 'MANAGE_GRAFANA',
}

// Role to permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin has all permissions
    ...Object.values(Permission)
  ],
  
  [UserRole.MANAGER]: [
    // Cases
    Permission.VIEW_CASES,
    Permission.CREATE_CASES,
    Permission.EDIT_CASES,
    Permission.ASSIGN_CASES,
    Permission.CLOSE_CASES,
    
    // Alerts
    Permission.VIEW_ALERTS,
    Permission.ACKNOWLEDGE_ALERTS,
    Permission.RESOLVE_ALERTS,
    Permission.ASSIGN_ALERTS,
    Permission.EXPORT_ALERTS,
    
    // Rules (Manager can manage rules)
    Permission.VIEW_RULES,
    Permission.CREATE_RULES,
    Permission.EDIT_RULES,
    Permission.TEST_RULES,
    
    // Users & Teams
    Permission.VIEW_USERS,
    Permission.VIEW_TEAMS,
    Permission.MANAGE_TEAM_MEMBERS,
    
    // Analytics
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.VIEW_GRAFANA,
  ],
  
  [UserRole.ANALYST]: [
    // Cases (limited)
    Permission.VIEW_CASES,
    
    // Alerts (view only)
    Permission.VIEW_ALERTS,
    
    // Analytics
    Permission.VIEW_ANALYTICS,
  ],
  
  [UserRole.VIEWER]: [
    // Read-only permissions
    Permission.VIEW_CASES,
    Permission.VIEW_ALERTS,
    Permission.VIEW_ANALYTICS,
  ]
};

// Navigation items visibility based on role
export const navigationPermissions: Record<string, UserRole[]> = {
  '/dashboard': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER],
  '/cases': [UserRole.ADMIN, UserRole.MANAGER], // All Cases - only for admin and manager
  '/cases/my-cases': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER], // My Cases - for everyone
  '/cases/active': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER],
  '/cases/resolved': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER],
  '/cases/new': [UserRole.ADMIN, UserRole.MANAGER], // Create new case - only admin and manager
  '/alerts': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER],
  '/alerts/history': [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER],
  '/alerts/rules': [UserRole.ADMIN, UserRole.MANAGER], // Alert rules - only admin and manager
  '/alerts/builder': [], // Removed - no one can access rule builder from navigation
  '/teams': [UserRole.ADMIN, UserRole.MANAGER],
  '/admin/users': [UserRole.ADMIN],
  '/admin/teams': [UserRole.ADMIN, UserRole.MANAGER],
  '/settings': [UserRole.ADMIN],
  '/reports': [UserRole.ADMIN, UserRole.MANAGER],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  
  const role = userRole as UserRole;
  const permissions = rolePermissions[role];
  
  if (!permissions) return false;
  
  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: string | undefined, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: string | undefined, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userRole: string | undefined, route: string): boolean {
  if (!userRole) return false;
  
  const allowedRoles = navigationPermissions[route];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: string | undefined): Permission[] {
  if (!userRole) return [];
  
  const role = userRole as UserRole;
  return rolePermissions[role] || [];
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string | undefined): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user is manager or higher
 */
export function isManagerOrHigher(userRole: string | undefined): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
}

/**
 * Check if user is analyst or higher
 */
export function isAnalystOrHigher(userRole: string | undefined): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === UserRole.ANALYST;
}

/**
 * UI Component visibility helpers
 */
export const canShowAdminFeatures = (userRole: string | undefined): boolean => {
  return isAdmin(userRole);
};

export const canShowManagerFeatures = (userRole: string | undefined): boolean => {
  return isManagerOrHigher(userRole);
};

export const canEditCases = (userRole: string | undefined): boolean => {
  return hasPermission(userRole, Permission.EDIT_CASES);
};

export const canDeleteCases = (userRole: string | undefined): boolean => {
  return hasPermission(userRole, Permission.DELETE_CASES);
};

export const canManageAlerts = (userRole: string | undefined): boolean => {
  return hasAnyPermission(userRole, [
    Permission.ACKNOWLEDGE_ALERTS,
    Permission.RESOLVE_ALERTS,
    Permission.ASSIGN_ALERTS
  ]);
};

export const canManageRules = (userRole: string | undefined): boolean => {
  return hasAnyPermission(userRole, [
    Permission.CREATE_RULES,
    Permission.EDIT_RULES,
    Permission.DELETE_RULES
  ]);
};

export const canManageUsers = (userRole: string | undefined): boolean => {
  return hasAnyPermission(userRole, [
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS
  ]);
};

export const canManageTeams = (userRole: string | undefined): boolean => {
  return hasAnyPermission(userRole, [
    Permission.CREATE_TEAMS,
    Permission.EDIT_TEAMS,
    Permission.DELETE_TEAMS,
    Permission.MANAGE_TEAM_MEMBERS
  ]);
};