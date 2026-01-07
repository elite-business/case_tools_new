package com.elite.casetools.service;

import com.elite.casetools.entity.User;
import com.elite.casetools.entity.AlertHistory;
import com.elite.casetools.entity.Case;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Service for managing role-based access control
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoleBasedAccessService {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;

    /**
     * Get current authenticated user
     */
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        
        String username = auth.getName();
        return userRepository.findByLogin(username).orElse(null);
    }

    /**
     * Check if user has specific permission
     */
    public boolean hasPermission(String permission) {
        User currentUser = getCurrentUser();
        return hasPermission(currentUser, permission);
    }

    /**
     * Check if specific user has permission
     */
    public boolean hasPermission(User user, String permission) {
        if (user == null) {
            return false;
        }

        // Admin users have all permissions
        if (isAdmin(user)) {
            return true;
        }

        // Check role-based permissions
        switch (permission.toLowerCase()) {
            case "admin":
                return Boolean.TRUE.equals(user.getAdminAdd());
                
            case "domain_control":
                return Boolean.TRUE.equals(user.getDomainControl());
                
            case "revenue_stream":
                return Boolean.TRUE.equals(user.getRevenueStream());
                
            case "historique_alert":
                return Boolean.TRUE.equals(user.getHistoriqueAlert());
                
            case "ra_rule":
                return Boolean.TRUE.equals(user.getRaRule());
                
            case "stat":
                return Boolean.TRUE.equals(user.getStat());
                
            case "assigned_to":
                return Boolean.TRUE.equals(user.getAssignedTo());
                
            case "re_assigned_to":
                return Boolean.TRUE.equals(user.getReAssignedTo());
                
            case "closed":
                return Boolean.TRUE.equals(user.getClosed());
                
            case "case_create":
                return user.getRole() != User.UserRole.VIEWER;
                
            case "case_assign":
                return user.getRole() == User.UserRole.ADMIN || 
                       user.getRole() == User.UserRole.MANAGER ||
                       Boolean.TRUE.equals(user.getAssignedTo());
                
            case "case_close":
                return user.getRole() != User.UserRole.VIEWER && 
                       Boolean.TRUE.equals(user.getClosed());
                
            case "alert_manage":
                return user.getRole() != User.UserRole.VIEWER;
                
            case "rule_create":
                return Boolean.TRUE.equals(user.getRaRule()) ||
                       user.getRole() == User.UserRole.ADMIN ||
                       user.getRole() == User.UserRole.MANAGER;
                
            case "rule_assign":
                return user.getRole() == User.UserRole.ADMIN ||
                       user.getRole() == User.UserRole.MANAGER;
                
            case "user_manage":
                return Boolean.TRUE.equals(user.getAdminAdd()) ||
                       user.getRole() == User.UserRole.ADMIN;
                
            case "team_manage":
                return user.getRole() == User.UserRole.ADMIN ||
                       user.getRole() == User.UserRole.MANAGER;
                
            case "system_config":
                return user.getRole() == User.UserRole.ADMIN;
                
            case "reports_view":
                return user.getRole() != User.UserRole.VIEWER;
                
            case "analytics_view":
                return user.getRole() != User.UserRole.VIEWER;
                
            default:
                log.warn("Unknown permission requested: {}", permission);
                return false;
        }
    }

    /**
     * Check if user can manage specific alert
     */
    public boolean canManageAlert(User user, AlertHistory alert) {
        if (user == null || alert == null) {
            return false;
        }

        // Admin can manage all alerts
        if (isAdmin(user)) {
            return true;
        }

        // User can manage alerts assigned to them
        if (alert.getAssignedTo() != null && alert.getAssignedTo().equals(user)) {
            return true;
        }

        // Managers can manage team alerts
        if (user.getRole() == User.UserRole.MANAGER) {
            return isTeamMemberAlert(user, alert);
        }

        return false;
    }

    /**
     * Check if user can manage specific case
     */
    public boolean canManageCase(User user, Case caseEntity) {
        if (user == null || caseEntity == null) {
            return false;
        }

        // Admin can manage all cases
        if (isAdmin(user)) {
            return true;
        }

        // User can manage cases assigned to them
        if (caseEntity.getAssignedTo() != null && caseEntity.getAssignedTo().equals(user)) {
            return true;
        }

        // Managers can manage team cases
        if (user.getRole() == User.UserRole.MANAGER) {
            return isTeamMemberCase(user, caseEntity);
        }

        return false;
    }


    /**
     * Get user's navigation permissions
     */
    public Map<String, Boolean> getNavigationPermissions(User user) {
        Map<String, Boolean> permissions = new HashMap<>();

        permissions.put("dashboard", true); // Everyone can see dashboard
        permissions.put("alerts", hasPermission(user, "historique_alert"));
        permissions.put("cases", hasPermission(user, "assigned_to") || hasPermission(user, "case_create"));
        permissions.put("rules", hasPermission(user, "ra_rule"));
        permissions.put("analytics", hasPermission(user, "analytics_view"));
        permissions.put("reports", hasPermission(user, "reports_view"));
        permissions.put("users", hasPermission(user, "user_manage"));
        permissions.put("teams", hasPermission(user, "team_manage"));
        permissions.put("system", hasPermission(user, "system_config"));
        permissions.put("domainControl", hasPermission(user, "domain_control"));
        permissions.put("revenueStream", hasPermission(user, "revenue_stream"));
        permissions.put("stats", hasPermission(user, "stat"));

        return permissions;
    }

    /**
     * Get user's action permissions for UI buttons/actions
     */
    public Map<String, Boolean> getActionPermissions(User user) {
        Map<String, Boolean> permissions = new HashMap<>();

        // Case actions
        permissions.put("createCase", hasPermission(user, "case_create"));
        permissions.put("assignCase", hasPermission(user, "case_assign"));
        permissions.put("closeCase", hasPermission(user, "case_close"));
        permissions.put("reopenCase", hasPermission(user, "case_assign"));

        // Alert actions
        permissions.put("acknowledgeAlert", hasPermission(user, "alert_manage"));
        permissions.put("resolveAlert", hasPermission(user, "alert_manage"));
        permissions.put("assignAlert", hasPermission(user, "case_assign"));

        // Rule actions
        permissions.put("createRule", hasPermission(user, "rule_create"));
        permissions.put("editRule", hasPermission(user, "rule_create"));
        permissions.put("deleteRule", hasPermission(user, "rule_create"));
        permissions.put("assignRule", hasPermission(user, "rule_assign"));

        // User actions
        permissions.put("createUser", hasPermission(user, "user_manage"));
        permissions.put("editUser", hasPermission(user, "user_manage"));
        permissions.put("deleteUser", hasPermission(user, "user_manage"));
        permissions.put("resetPassword", hasPermission(user, "user_manage"));

        // Team actions
        permissions.put("createTeam", hasPermission(user, "team_manage"));
        permissions.put("editTeam", hasPermission(user, "team_manage"));
        permissions.put("deleteTeam", hasPermission(user, "team_manage"));

        // Export/Import actions
        permissions.put("exportData", user.getRole() != User.UserRole.VIEWER);
        permissions.put("importData", hasPermission(user, "admin"));

        return permissions;
    }

    /**
     * Get filtered data based on user role and permissions
     */
    public Map<String, Object> getDataFilters(User user) {
        Map<String, Object> filters = new HashMap<>();

        if (user == null) {
            return filters;
        }

        // Admin users see all data
        if (isAdmin(user)) {
            filters.put("viewAll", true);
            return filters;
        }

        // Role-based filters
        filters.put("viewAll", false);
        filters.put("assignedToUser", user.getId());

        // Managers can see team data
        if (user.getRole() == User.UserRole.MANAGER) {
            List<Long> teamMemberIds = getTeamMemberIds(user);
            filters.put("teamMembers", teamMemberIds);
        }

        // Department-based filtering
        if (user.getDepartment() != null) {
            filters.put("department", user.getDepartment());
        }

        return filters;
    }

    /**
     * Check if user is admin
     */
    public boolean isAdmin(User user) {
        return user != null && (user.getRole() == User.UserRole.ADMIN || 
                               Boolean.TRUE.equals(user.getAdminAdd()));
    }

    /**
     * Check if user is manager
     */
    public boolean isManager(User user) {
        return user != null && (user.getRole() == User.UserRole.MANAGER || isAdmin(user));
    }

    /**
     * Check if alert belongs to user's team member
     */
    private boolean isTeamMemberAlert(User manager, AlertHistory alert) {
        if (alert.getAssignedTo() == null) {
            return false;
        }

        List<Long> teamMemberIds = getTeamMemberIds(manager);
        return teamMemberIds.contains(alert.getAssignedTo().getId());
    }

    /**
     * Check if case belongs to user's team member
     */
    private boolean isTeamMemberCase(User manager, Case caseEntity) {
        if (caseEntity.getAssignedTo() == null) {
            return false;
        }

        List<Long> teamMemberIds = getTeamMemberIds(manager);
        return teamMemberIds.contains(caseEntity.getAssignedTo().getId());
    }

    /**
     * Get team member IDs for a user (if they are team leader or member)
     */
    private List<Long> getTeamMemberIds(User user) {
        return teamRepository.findByUser(user).stream()
                .flatMap(team -> team.getMembers().stream())
                .map(User::getId)
                .distinct()
                .toList();
    }

    /**
     * Check if user can access all alerts (admin/manager level access)
     */
    public boolean canAccessAllAlerts(User user) {
        if (user == null) {
            return false;
        }
        
        return isAdmin(user) || isManager(user);
    }

    /**
     * Check if user can perform specific action on resource type
     */
    public boolean canPerformAction(User user, String resourceType, String action) {
        if (user == null) {
            return false;
        }

        String permission = resourceType + "_" + action;
        return hasPermission(user, permission);
    }

    /**
     * Validate user can perform action on resource
     */
    public void validateAccess(User user, String action, Object resource) {
        if (user == null) {
            throw new SecurityException("User not authenticated");
        }

        boolean hasAccess;
        
        if (resource instanceof AlertHistory) {
            hasAccess = canManageAlert(user, (AlertHistory) resource);
        } else if (resource instanceof Case) {
            hasAccess = canManageCase(user, (Case) resource);
        } else if (resource instanceof Class<?>) {
            // For class-based permissions (e.g., when creating new resources)
            hasAccess = hasPermission(user, action);
        } else {
            hasAccess = hasPermission(user, action);
        }

        if (!hasAccess) {
            throw new SecurityException(String.format("User %s does not have permission to %s on %s", 
                    user.getLogin(), action, resource.getClass().getSimpleName()));
        }
    }
}