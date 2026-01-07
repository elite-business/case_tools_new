package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.AlertHistory;
import com.elite.casetools.entity.User;
import com.elite.casetools.entity.Team;
import com.elite.casetools.exception.ResourceNotFoundException;
import com.elite.casetools.repository.AlertHistoryRepository;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for alert management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;

    /**
     * Get alert history with filtering and pagination
     */
    @Transactional(readOnly = true)
    public Page<AlertHistoryResponse> getAlertHistory(AlertHistoryFilterRequest filter, Pageable pageable) {
        log.info("Getting alert history with filter: {}", filter);
        
        // Get current user for role-based filtering
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth != null ? auth.getName() : null;
        User currentUser = getCurrentUser(currentUsername);
        
        // Build specification based on filters and user role
        Specification<AlertHistory> spec = buildAlertSpecification(filter, currentUser);
        
        Page<AlertHistory> alertPage = alertHistoryRepository.findAll(spec, pageable);
        
        return alertPage.map(this::mapToResponse);
    }

    /**
     * Acknowledge alert
     */
    public AlertHistoryResponse acknowledgeAlert(Long alertId, AcknowledgeAlertRequest request, String username) {
        log.info("Acknowledging alert {} by user: {}", alertId, username);
        
        AlertHistory alert = alertHistoryRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + alertId));
        
        User user = getCurrentUser(username);
        validateUserCanManageAlert(alert, user);
                
        alert.setStatus(AlertHistory.AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgeNotes(request.getNotes());
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(user);
        
        AlertHistory savedAlert = alertHistoryRepository.save(alert);
        
        // Send notifications
        notifyAlertStatusChange(savedAlert, "acknowledged", user);
        
        return mapToResponse(savedAlert);
    }

    /**
     * Resolve alert
     */
    public AlertHistoryResponse resolveAlert(Long alertId, ResolveAlertRequest request, String username) {
        log.info("Resolving alert {} by user: {}", alertId, username);
        
        AlertHistory alert = alertHistoryRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + alertId));
        
        User user = getCurrentUser(username);
        validateUserCanManageAlert(alert, user);
                
        alert.setStatus(AlertHistory.AlertStatus.RESOLVED);
        alert.setResolveNotes(request.getNotes());
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(user);
        
        AlertHistory savedAlert = alertHistoryRepository.save(alert);
        
        // Send notifications
        notifyAlertStatusChange(savedAlert, "resolved", user);
        
        return mapToResponse(savedAlert);
    }

    /**
     * Assign alert to user
     */
    public AlertHistoryResponse assignAlert(Long alertId, AssignAlertRequest request, String username) {
        log.info("Assigning alert {} to user {} by: {}", alertId, request.getUserId(), username);
        
        AlertHistory alert = alertHistoryRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + alertId));
        
        User assignedBy = getCurrentUser(username);
        User assignedTo = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));
        
        // Validate assignment permissions
        if (!canAssignAlert(assignedBy)) {
            throw new SecurityException("User does not have permission to assign alerts");
        }
        
        alert.setAssignedTo(assignedTo);
        alert.setUpdatedAt(LocalDateTime.now());
        
        AlertHistory savedAlert = alertHistoryRepository.save(alert);
        
        // Send notification to assigned user
        notifyAlertAssigned(savedAlert, assignedTo, assignedBy);
        
        return mapToResponse(savedAlert);
    }

    /**
     * Export alert history
     */
    @Transactional(readOnly = true)
    public byte[] exportAlertHistory(AlertHistoryFilterRequest filter, String format) {
        log.info("Exporting alert history in {} format with filter: {}", format, filter);
        
        List<AlertHistory> alerts = alertHistoryRepository.findAll();
        
        StringBuilder csvContent = new StringBuilder();
        csvContent.append("ID,Alert ID,Title,Status,Severity,Created At,Assigned To\n");
        
        for (AlertHistory alert : alerts) {
            csvContent.append(alert.getId())
                    .append(",")
                    .append(alert.getAlertId())
                    .append(",")
                    .append(alert.getTitle())
                    .append(",")
                    .append(alert.getStatus())
                    .append(",")
                    .append(alert.getSeverity())
                    .append(",")
                    .append(alert.getCreatedAt())
                    .append(",")
                    .append(alert.getAssignedTo() != null ? alert.getAssignedTo().getName() : "")
                    .append("\n");
        }
        
        return csvContent.toString().getBytes();
    }

    /**
     * Process new alert from Grafana webhook
     */
    public AlertHistoryResponse processGrafanaAlert(GrafanaWebhookRequest webhook) {
        log.info("Processing new alert from Grafana: {}", webhook.getTitle());
        
        // Create alert history entry
        AlertHistory alert = AlertHistory.builder()
                .alertId(webhook.getAlertId())
                .grafanaAlertId(webhook.getGrafanaAlertId())
                .grafanaAlertUid(webhook.getGrafanaAlertUid())
                .title(webhook.getTitle())
                .description(webhook.getDescription())
                .status(AlertHistory.AlertStatus.OPEN)
                .severity(mapSeverity(webhook.getSeverity()))
                .category(mapCategory(webhook.getCategory()))
                .triggeredAt(webhook.getTriggeredAt())
                .source("Grafana")
                .ruleId(webhook.getRuleId())
                .ruleName(webhook.getRuleName())
                .build();
        
        // Auto-assign if rule has assignment configuration
        assignAlertBasedOnRule(alert);
        
        AlertHistory savedAlert = alertHistoryRepository.save(alert);
        
        // Send notifications for new alert
        notifyNewAlert(savedAlert);
        
        return mapToResponse(savedAlert);
    }
    
    /**
     * Assign alert based on rule configuration
     */
    private void assignAlertBasedOnRule(AlertHistory alert) {
        // Since AlertRuleDefinition is removed, we'll skip auto-assignment for now
        // This should be replaced with RuleAssignment-based logic
        log.debug("Auto-assignment based on rules is disabled - AlertRuleDefinition removed");
    }
    
    /**
     * Build JPA specification for filtering alerts
     */
    private Specification<AlertHistory> buildAlertSpecification(AlertHistoryFilterRequest filter, User currentUser) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Role-based filtering
            if (currentUser != null && !isAdmin(currentUser)) {
                // Non-admin users only see their assigned alerts or alerts from their assigned rules
                Predicate assignedToUser = criteriaBuilder.equal(root.get("assignedTo"), currentUser);
                
                if (!currentUser.getRole().equals(User.UserRole.MANAGER)) {
                    predicates.add(assignedToUser);
                } else {
                    // Managers can see team alerts too
                    List<Team> userTeams = teamRepository.findByMembersContaining(currentUser);
                    if (!userTeams.isEmpty()) {
                        List<User> teamMembers = new ArrayList<>();
                        userTeams.forEach(team -> teamMembers.addAll(team.getMembers()));
                        
                        Predicate teamAlerts = root.get("assignedTo").in(teamMembers);
                        predicates.add(criteriaBuilder.or(assignedToUser, teamAlerts));
                    } else {
                        predicates.add(assignedToUser);
                    }
                }
            }
            
            // Apply filters
            if (StringUtils.hasText(filter.getStatus())) {
                predicates.add(criteriaBuilder.equal(root.get("status"), 
                        AlertHistory.AlertStatus.valueOf(filter.getStatus().toUpperCase())));
            }
            
            if (StringUtils.hasText(filter.getSeverity())) {
                predicates.add(criteriaBuilder.equal(root.get("severity"), 
                        AlertHistory.AlertSeverity.valueOf(filter.getSeverity().toUpperCase())));
            }
            
            if (StringUtils.hasText(filter.getCategory())) {
                predicates.add(criteriaBuilder.equal(root.get("category"), 
                        AlertHistory.AlertCategory.valueOf(filter.getCategory().toUpperCase())));
            }
            
            if (filter.getAssignedToId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("assignedTo").get("id"), filter.getAssignedToId()));
            }
            
            if (StringUtils.hasText(filter.getSearch())) {
                String searchPattern = "%" + filter.getSearch().toLowerCase() + "%";
                Predicate titleMatch = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("title")), searchPattern);
                Predicate descriptionMatch = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("description")), searchPattern);
                predicates.add(criteriaBuilder.or(titleMatch, descriptionMatch));
            }
            
            if (filter.getStartDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("triggeredAt"), filter.getStartDate()));
            }
            
            if (filter.getEndDate() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("triggeredAt"), filter.getEndDate()));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * Helper method to map AlertHistory entity to response DTO
     */
    private AlertHistoryResponse mapToResponse(AlertHistory alert) {
        UserSummaryDto assignedToDto = null;
        if (alert.getAssignedTo() != null) {
            assignedToDto = UserSummaryDto.builder()
                    .id(alert.getAssignedTo().getId())
                    .name(alert.getAssignedTo().getName())
                    .email(alert.getAssignedTo().getEmail())
                    .build();
        }
        
        UserSummaryDto acknowledgedByDto = null;
        if (alert.getAcknowledgedBy() != null) {
            acknowledgedByDto = UserSummaryDto.builder()
                    .id(alert.getAcknowledgedBy().getId())
                    .name(alert.getAcknowledgedBy().getName())
                    .email(alert.getAcknowledgedBy().getEmail())
                    .build();
        }
        
        UserSummaryDto resolvedByDto = null;
        if (alert.getResolvedBy() != null) {
            resolvedByDto = UserSummaryDto.builder()
                    .id(alert.getResolvedBy().getId())
                    .name(alert.getResolvedBy().getName())
                    .email(alert.getResolvedBy().getEmail())
                    .build();
        }
        
        return AlertHistoryResponse.builder()
                .id(alert.getId())
                .alertId(alert.getAlertId())
                .grafanaAlertId(alert.getGrafanaAlertId())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .status(alert.getStatus().name())
                .severity(alert.getSeverity().name())
                .category(alert.getCategory() != null ? alert.getCategory().name() : null)
                .assignedTo(assignedToDto)
                .acknowledgedBy(acknowledgedByDto)
                .resolvedBy(resolvedByDto)
                .triggeredAt(alert.getTriggeredAt() != null ? alert.getTriggeredAt() : alert.getCreatedAt())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .resolvedAt(alert.getResolvedAt())
                .acknowledgeNotes(alert.getAcknowledgeNotes())
                .resolveNotes(alert.getResolveNotes())
                .source(alert.getSource())
                .ruleId(alert.getRuleId())
                .ruleName(alert.getRuleName())
                .build();
    }
    
    // Utility methods
    private User getCurrentUser(String username) {
        if (username == null) return null;
        return userRepository.findByLogin(username).orElse(null);
    }
    
    private boolean isAdmin(User user) {
        return user.getRole() == User.UserRole.ADMIN || Boolean.TRUE.equals(user.getAdminAdd());
    }
    
    private boolean canAssignAlert(User user) {
        return isAdmin(user) || user.getRole() == User.UserRole.MANAGER || Boolean.TRUE.equals(user.getAssignedTo());
    }
    
    private void validateUserCanManageAlert(AlertHistory alert, User user) {
        if (!isAdmin(user) && !user.equals(alert.getAssignedTo())) {
            throw new SecurityException("User does not have permission to manage this alert");
        }
    }
    
    private AlertHistory.AlertSeverity mapSeverity(String severity) {
        if (severity == null) return AlertHistory.AlertSeverity.MEDIUM;
        try {
            return AlertHistory.AlertSeverity.valueOf(severity.toUpperCase());
        } catch (IllegalArgumentException e) {
            return AlertHistory.AlertSeverity.MEDIUM;
        }
    }
    
    private AlertHistory.AlertCategory mapCategory(String category) {
        if (category == null) return AlertHistory.AlertCategory.OTHER;
        try {
            return AlertHistory.AlertCategory.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            return AlertHistory.AlertCategory.OTHER;
        }
    }
    
    
    private void notifyNewAlert(AlertHistory alert) {
        if (alert.getAssignedTo() != null) {
            notifyAlertAssigned(alert, alert.getAssignedTo(), null);
        } else {
            // Notify admins about unassigned alert
            webSocketService.sendToChannel("admin", "alert.unassigned", alert);
        }
    }
    
    private void notifyAlertAssigned(AlertHistory alert, User assignedTo, User assignedBy) {
        log.info("Sending assignment notification for alert {} to user {}", alert.getAlertId(), assignedTo.getLogin());
        
        // WebSocket notification
        webSocketService.sendToUser(assignedTo.getId(), "alert.assigned", alert);
        
        // Email notification (if enabled)
        notificationService.sendSimpleEmail(
                assignedTo.getEmail(),
                "Alert Assigned: " + alert.getTitle(),
                String.format("Alert %s has been assigned to you. Priority: %s. Please check the system for details.", 
                        alert.getAlertId(), alert.getSeverity())
        );
        
        if (assignedBy != null) {
            log.info("Alert {} assigned by {} to {}", alert.getAlertId(), assignedBy.getLogin(), assignedTo.getLogin());
        }
    }
    
    private void notifyAlertStatusChange(AlertHistory alert, String action, User user) {
        log.info("Alert {} {} by user {}", alert.getAlertId(), action, user.getLogin());
        
        // Send to assigned user if different from the user who performed the action
        if (alert.getAssignedTo() != null && !alert.getAssignedTo().equals(user)) {
            webSocketService.sendToUser(alert.getAssignedTo().getId(), "alert." + action, alert);
        }
        
        // Send to admin channel
        webSocketService.sendToChannel("admin", "alert." + action, alert);
    }
}