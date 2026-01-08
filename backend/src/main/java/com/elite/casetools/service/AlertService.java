package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.AlertHistory;
import com.elite.casetools.entity.RuleAssignment;
import com.elite.casetools.entity.User;
import com.elite.casetools.entity.Team;
import com.elite.casetools.exception.ResourceNotFoundException;
import com.elite.casetools.repository.AlertHistoryRepository;
import com.elite.casetools.repository.RuleAssignmentRepository;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for alert management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final RuleAssignmentRepository ruleAssignmentRepository;
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
        
        // Create assignment info with the user
        AssignmentInfo assignmentInfo = new AssignmentInfo();
        assignmentInfo.addUser(assignedTo.getId());
        alert.setAssignmentInfo(assignmentInfo);
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
                    .append(getAssignedUserNames(alert))
                    .append("\n");
        }
        
        return csvContent.toString().getBytes();
    }

    /**
     * Process individual alert from Grafana webhook alerts array
     */
    public AlertHistoryResponse processGrafanaAlertFromWebhook(GrafanaWebhookRequest.Alert alert, GrafanaWebhookRequest webhook) {
        return processGrafanaAlertFromWebhook(alert, webhook, true);
    }
    
    /**
     * Process individual alert from Grafana webhook alerts array with option to skip notifications
     */
    public AlertHistoryResponse processGrafanaAlertFromWebhook(GrafanaWebhookRequest.Alert alert, GrafanaWebhookRequest webhook, boolean sendNotifications) {
        log.info("Processing individual alert from Grafana: {}", alert.getLabels().getOrDefault("alertname", "Unknown"));
        
        // Generate alert ID for this specific alert
        String alertId = generateAlertIdFromAlert(alert);
        String fingerprint = StringUtils.hasText(alert.getFingerprint()) ? alert.getFingerprint() : UUID.randomUUID().toString();
        
        // Extract alert details
        Map<String, String> labels = alert.getLabels() != null ? alert.getLabels() : new HashMap<>();
        Map<String, String> annotations = alert.getAnnotations() != null ? alert.getAnnotations() : new HashMap<>();

        // Extract Grafana rule UID from labels or generatorURL
        String ruleUid = extractRuleUidFromAlert(alert);
        
        // Create alert history entry for THIS specific alert
        AlertHistory alertHistory = AlertHistory.builder()
                .alertId(alertId)
                .grafanaAlertId(fingerprint)
            .grafanaAlertUid(ruleUid)
                .title(annotations.getOrDefault("summary", labels.getOrDefault("alertname", "Alert")))
                .description(annotations.getOrDefault("description", "No description provided"))
                .status(AlertHistory.AlertStatus.OPEN)
                .severity(mapSeverity(labels.getOrDefault("severity", "MEDIUM")))
                .category(mapCategory(labels.getOrDefault("category", "OTHER")))
                .triggeredAt(alert.getStartsAt() != null ? alert.getStartsAt().toLocalDateTime() : LocalDateTime.now())
                .source("Grafana")
            .ruleId(labels.containsKey("rule_id") ? labels.get("rule_id") : ruleUid)
                .ruleName(labels.getOrDefault("alertname", webhook.getTitle()))
                .build();
        
        // Auto-assign if rule has assignment configuration
        assignAlertBasedOnRule(alertHistory);
        
        AlertHistory savedAlert = alertHistoryRepository.save(alertHistory);
        
        // Only send notifications if requested (skip when called from webhook service)
        if (sendNotifications) {
            notifyNewAlert(savedAlert);
        }
        
        return mapToResponse(savedAlert);
    }
    
    /**
     * Generate alert ID from individual alert
     */
    private String generateAlertIdFromAlert(GrafanaWebhookRequest.Alert alert) {
        // Check if alertId exists in labels
        if (alert.getLabels() != null && alert.getLabels().containsKey("alertId")) {
            return alert.getLabels().get("alertId");
        }
        
        // Use fingerprint if available
        if (StringUtils.hasText(alert.getFingerprint())) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            return "ALERT-" + alert.getFingerprint().substring(0, Math.min(8, alert.getFingerprint().length())) + "-" + timestamp;
        }
        
        // Generate UUID-based alert ID
        return "ALERT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + 
               LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    /**
     * Process new alert from Grafana webhook (LEGACY - for single alert processing)
     */
    public AlertHistoryResponse processGrafanaAlert(GrafanaWebhookRequest webhook) {
        log.info("Processing new alert from Grafana: {}", webhook.getTitle());
        
        // Generate alert ID if not present
        String alertId = generateAlertId(webhook);
        
        // Create alert history entry
        AlertHistory alert = AlertHistory.builder()
                .alertId(alertId)
                .grafanaAlertId(webhook.getGrafanaAlertId() != null ? webhook.getGrafanaAlertId() : getFingerprint(webhook))
                .grafanaAlertUid(webhook.getGrafanaAlertUid())
                .title(webhook.getTitle() != null ? webhook.getTitle() : "Alert")
                .description(webhook.getDescription() != null ? webhook.getDescription() : "No description provided")
                .status(AlertHistory.AlertStatus.OPEN)
                .severity(mapSeverity(webhook.getSeverity()))
                .category(mapCategory(webhook.getCategory()))
                .triggeredAt(webhook.getTriggeredAt())
                .source("Grafana")
                .ruleId(webhook.getRuleId())
                .ruleName(webhook.getRuleName() != null ? webhook.getRuleName() : getAlertName(webhook))
                .build();
        
        // Auto-assign if rule has assignment configuration
        assignAlertBasedOnRule(alert);
        
        AlertHistory savedAlert = alertHistoryRepository.save(alert);
        
        // Send notifications for new alert
        notifyNewAlert(savedAlert);
        
        return mapToResponse(savedAlert);
    }
    
    /**
     * Generate a unique alert ID if not present in the webhook
     */
    private String generateAlertId(GrafanaWebhookRequest webhook) {
        // Check if webhook already has an alertId
        if (StringUtils.hasText(webhook.getAlertId())) {
            return webhook.getAlertId();
        }
        
        // Check if we have alerts array with fingerprint
        if (webhook.getAlerts() != null && !webhook.getAlerts().isEmpty()) {
            GrafanaWebhookRequest.Alert firstAlert = webhook.getAlerts().get(0);
            
            // Try to get from labels
            if (firstAlert.getLabels() != null && firstAlert.getLabels().containsKey("alertId")) {
                return firstAlert.getLabels().get("alertId");
            }
            
            // Use fingerprint if available
            if (StringUtils.hasText(firstAlert.getFingerprint())) {
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                return "ALERT-" + firstAlert.getFingerprint().substring(0, Math.min(8, firstAlert.getFingerprint().length())) + "-" + timestamp;
            }
        }
        
        // Fallback to fingerprint from webhook
        if (StringUtils.hasText(webhook.getFingerprint())) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            return "ALERT-" + webhook.getFingerprint().substring(0, Math.min(8, webhook.getFingerprint().length())) + "-" + timestamp;
        }
        
        // Last resort: generate UUID-based alert ID
        return "ALERT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + 
               LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }
    
    /**
     * Get fingerprint from webhook
     */
    private String getFingerprint(GrafanaWebhookRequest webhook) {
        // Try to get from alerts array first
        if (webhook.getAlerts() != null && !webhook.getAlerts().isEmpty()) {
            String fp = webhook.getAlerts().get(0).getFingerprint();
            if (StringUtils.hasText(fp)) {
                return fp;
            }
        }
        
        // Fallback to webhook fingerprint
        return webhook.getFingerprint();
    }
    
    /**
     * Get alert name from webhook
     */
    private String getAlertName(GrafanaWebhookRequest webhook) {
        // Try to get from alerts array first
        if (webhook.getAlerts() != null && !webhook.getAlerts().isEmpty()) {
            Map<String, String> labels = webhook.getAlerts().get(0).getLabels();
            if (labels != null && labels.containsKey("alertname")) {
                return labels.get("alertname");
            }
        }
        
        // Fallback to common labels
        if (webhook.getCommonLabels() != null && webhook.getCommonLabels().containsKey("alertname")) {
            return webhook.getCommonLabels().get("alertname");
        }
        
        return webhook.getAlertName();
    }

    /**
     * Extract Grafana rule UID from alert labels or generatorURL
     */
    private String extractRuleUidFromAlert(GrafanaWebhookRequest.Alert alert) {
        Map<String, String> labels = alert.getLabels();

        if (labels != null) {
            // Common label keys that may carry the rule UID
            if (labels.containsKey("rule_id")) {
                return labels.get("rule_id");
            }
            if (labels.containsKey("__alert_rule_uid__")) {
                return labels.get("__alert_rule_uid__");
            }
            if (labels.containsKey("alertuid")) {
                return labels.get("alertuid");
            }
            if (labels.containsKey("rule_uid")) {
                return labels.get("rule_uid");
            }
        }

        String generatorURL = alert.getGeneratorURL();
        if (StringUtils.hasText(generatorURL)) {
            // Pattern: /alerting/grafana/{rule_uid}/view or /alerting/grafana/{rule_uid}
            if (generatorURL.contains("/alerting/grafana/")) {
                int start = generatorURL.indexOf("/alerting/grafana/") + 18;
                int end = generatorURL.indexOf("/", start);
                if (end > start) {
                    return generatorURL.substring(start, end);
                } else if (end == -1 && start < generatorURL.length()) {
                    return generatorURL.substring(start);
                }
            }

            // Query parameter variant: ruleUID=
            if (generatorURL.contains("ruleUID=")) {
                int start = generatorURL.indexOf("ruleUID=") + 8;
                int end = generatorURL.indexOf("&", start);
                return end > start ? generatorURL.substring(start, end) : generatorURL.substring(start);
            }
        }

        return null;
    }

    /**
     * Assign alert based on rule configuration
     */
    private void assignAlertBasedOnRule(AlertHistory alert) {
        try {
            String ruleUid = alert.getGrafanaAlertUid();
            if (!StringUtils.hasText(ruleUid)) {
                log.debug("No rule UID found for alert {}, skipping auto-assign", alert.getAlertId());
                return;
            }

            Optional<RuleAssignment> raOpt = ruleAssignmentRepository.findByGrafanaRuleUid(ruleUid);
            if (raOpt.isEmpty()) {
                log.debug("No rule assignment configured for UID {}", ruleUid);
                return;
            }

            RuleAssignment ra = raOpt.get();
            if (!Boolean.TRUE.equals(ra.getActive())) {
                log.debug("Rule assignment {} inactive, skipping auto-assign", ra.getId());
                return;
            }

            // Create assignment info with ALL assigned users and teams from the rule
            AssignmentInfo assignmentInfo = new AssignmentInfo();
            
            // Add all assigned users from the rule
            if (ra.getAssignedUsers() != null) {
                for (User user : ra.getAssignedUsers()) {
                    assignmentInfo.addUser(user.getId());
                    log.debug("Added user {} to alert assignment", user.getLogin());
                }
            }
            
            // Add all assigned teams from the rule
            if (ra.getAssignedTeams() != null) {
                for (Team team : ra.getAssignedTeams()) {
                    assignmentInfo.addTeam(team.getId());
                    log.debug("Added team {} to alert assignment", team.getName());
                }
            }
            
            // Only set assignment info if we have assignments
            if (assignmentInfo.hasAssignments()) {
                alert.setAssignmentInfo(assignmentInfo);
                alert.setUpdatedAt(LocalDateTime.now());
                log.info("Auto-assigned alert {} - Users: {}, Teams: {}", 
                    alert.getAlertId(), assignmentInfo.getUserIds(), assignmentInfo.getTeamIds());
            } else {
                log.debug("No users or teams assigned to rule {}, leaving alert unassigned", ruleUid);
            }
        } catch (Exception e) {
            log.error("Failed auto-assigning alert {} based on rule", alert.getAlertId(), e);
        }
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
        // Get all assigned users
        List<UserSummaryDto> assignedUsers = new ArrayList<>();
        AssignmentInfo assignmentInfo = alert.getAssignmentInfo();
        if (assignmentInfo != null && assignmentInfo.hasAssignments()) {
            for (Long userId : assignmentInfo.getUserIds()) {
                userRepository.findById(userId).ifPresent(user ->
                    assignedUsers.add(UserSummaryDto.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                );
            }
        }
        
        // Get all assigned teams (TODO: implement when Team entity is available)
        List<TeamSummaryDto> assignedTeams = new ArrayList<>();
        
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
                .assignedUsers(assignedUsers)
                .assignedTeams(assignedTeams)
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
        // DISABLED: We only send notifications for cases, not for alert history
        log.debug("Alert notification disabled for alert {} - notifications sent only for cases", alert.getAlertId());
    }
    
    private void notifyAlertAssigned(AlertHistory alert, User assignedTo, User assignedBy) {
        // DISABLED: We only send notifications for cases, not for alert history
        log.debug("Alert assignment notification disabled for alert {} - notifications sent only for cases", alert.getAlertId());
    }

    private void notifyRuleAssignees(AlertHistory alert) {
        // DISABLED: We only send notifications for cases, not for alert history
        log.debug("Rule assignee notification disabled for alert {} - notifications sent only for cases", alert.getAlertId());
    }
    
    private void notifyAlertStatusChange(AlertHistory alert, String action, User user) {
        log.info("Alert {} {} by user {}", alert.getAlertId(), action, user.getLogin());
        
        // Send to assigned users if different from the user who performed the action
        AssignmentInfo assignmentInfo = alert.getAssignmentInfo();
        if (assignmentInfo.hasAssignments()) {
            for (Long userId : assignmentInfo.getUserIds()) {
                if (!userId.equals(user.getId())) {
                    webSocketService.sendToUser(userId, "alert." + action, alert);
                }
            }
        }
        
        // Send to admin channel
        webSocketService.sendToChannel("admin", "alert." + action, alert);
    }
    
    /**
     * Helper method to get assigned user names for CSV export
     */
    private String getAssignedUserNames(AlertHistory alert) {
        AssignmentInfo assignmentInfo = alert.getAssignmentInfo();
        if (!assignmentInfo.hasAssignments()) {
            return "";
        }
        
        List<String> userNames = new ArrayList<>();
        for (Long userId : assignmentInfo.getUserIds()) {
            userRepository.findById(userId)
                    .ifPresent(user -> userNames.add(user.getName()));
        }
        
        return String.join(", ", userNames);
    }
}