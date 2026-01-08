package com.elite.casetools.service;

import com.elite.casetools.dto.GrafanaWebhookRequest;
import com.elite.casetools.entity.*;
import com.elite.casetools.dto.AssignmentInfo;
import com.elite.casetools.repository.CaseRepository;
import com.elite.casetools.repository.RuleAssignmentRepository;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
import com.elite.casetools.exception.WebhookProcessingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Improved webhook service that integrates with the rule assignment system
 * This service implements the proper flow: Grafana Alert → Rule Assignment → Case Creation → User Assignment
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImprovedWebhookService {

    private final RuleAssignmentRepository ruleAssignmentRepository;
    private final RuleAssignmentService ruleAssignmentService;
    private final CaseRepository caseRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final CaseService caseService;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;
    private final AlertService alertService;

    @Value("${application.alert.duplicate-window-minutes:5}")
    private int duplicateWindowMinutes;

    /**
     * Process Grafana webhook using the new rule assignment flow
     */
    @Transactional
    public List<Case> processWebhookWithRuleAssignments(GrafanaWebhookRequest request) {
        log.info("Processing Grafana webhook with {} alerts using rule assignment system", 
                request.getAlerts().size());

        List<Case> processedCases = new ArrayList<>();
        LocalDateTime webhookTime = LocalDateTime.now();

        for (GrafanaWebhookRequest.Alert alert : request.getAlerts()) {
            try {
                Case processedCase = processAlertWithRuleAssignment(alert, request, webhookTime);
                if (processedCase != null) {
                    processedCases.add(processedCase);
                }
            } catch (Exception e) {
                log.error("Failed to process alert: {}", alert.getFingerprint(), e);
                // Continue processing other alerts
            }
        }

        log.info("Successfully processed {} cases from webhook", processedCases.size());
        return processedCases;
    }

    /**
     * Process individual alert with rule assignment logic
     */
    @Transactional
    public Case processAlertWithRuleAssignment(
            GrafanaWebhookRequest.Alert alert, 
            GrafanaWebhookRequest request, 
            LocalDateTime webhookTime) {

        // First create alert history for this alert (NO notifications sent from AlertService)
        alertService.processGrafanaAlertFromWebhook(alert, request, false);
        log.info("Created alert history for alert: {}", alert.getFingerprint());

        // Generate unique alert ID if not present
        String alertId = generateAlertId(alert);
        
        // Extract rule UID from multiple sources (labels, generatorURL)
        String ruleUid = extractRuleUidFromAlert(alert);
        
        if (!StringUtils.hasText(ruleUid)) {
            log.warn("Cannot determine rule UID from alert (checked labels and generatorURL), creating unassigned case: {}", 
                    alert.getFingerprint());
            return createUnassignedCase(alert, request, webhookTime, alertId);
        }

        log.info("Extracted rule UID: {} from alert (fingerprint: {})", ruleUid, alert.getFingerprint());

        // Check if we have a rule assignment for this Grafana rule UID
        Optional<RuleAssignment> ruleAssignmentOpt = ruleAssignmentRepository.findByGrafanaRuleUid(ruleUid);
        
        if (ruleAssignmentOpt.isEmpty()) {
            log.info("No rule assignment found for rule UID: {}, creating unassigned case", ruleUid);
            return createUnassignedCase(alert, request, webhookTime, alertId);
        }

        RuleAssignment ruleAssignment = ruleAssignmentOpt.get();
        
        if (!ruleAssignment.getActive()) {
            log.info("Rule assignment is inactive for rule UID: {}, skipping", ruleUid);
            return null;
        }

        // Check for duplicate alerts
        if (isDuplicateAlert(alert.getFingerprint(), webhookTime)) {
            log.debug("Duplicate alert detected: {}", alert.getFingerprint());
            return updateExistingCase(alert, webhookTime);
        }

        // Create case with assignment
        return createCaseWithAssignment(alert, request, ruleAssignment, webhookTime, alertId);
    }

    /**
     * Create case with proper user assignment based on rule assignment
     */
    private Case createCaseWithAssignment(
            GrafanaWebhookRequest.Alert alert,
            GrafanaWebhookRequest request,
            RuleAssignment ruleAssignment,
            LocalDateTime webhookTime,
            String alertId) {

        log.info("Creating case with assignment for rule: {}", ruleAssignment.getGrafanaRuleName());

        // Build assignment info from rule assignment
        AssignmentInfo assignmentInfo = buildAssignmentInfo(ruleAssignment);

        // Get assigned user for tracking (first user if available)
        User assignedBy = null;
        if (assignmentInfo.getUserIds() != null && !assignmentInfo.getUserIds().isEmpty()) {
            assignedBy = userRepository.findById(assignmentInfo.getUserIds().get(0)).orElse(null);
        }

        // Generate case number
        String caseNumber = generateCaseNumber();

        // Build case entity
        Case caseEntity = Case.builder()
                .caseNumber(caseNumber)
                .grafanaAlertUid(alert.getFingerprint())
                .grafanaAlertId(alertId)
                .title(buildCaseTitle(alert, ruleAssignment))
                .description(buildCaseDescription(alert, ruleAssignment))
                .severity(mapSeverity(ruleAssignment.getSeverity()))
                .priority(mapPriority(ruleAssignment.getSeverity()))
                .category(mapCategory(ruleAssignment.getCategory()))
                .status(Case.CaseStatus.OPEN)
                .assignedBy(assignedBy)
                .assignedAt(assignmentInfo.hasAssignments() ? webhookTime : null)
                .slaDeadline(calculateSlaDeadline(ruleAssignment.getSeverity(), webhookTime))
                .affectedServices(extractAffectedServices(alert))
                .tags(extractTags(alert, ruleAssignment))
                .alertData(buildAlertDataJson(alert, request))
                .build();
        
        // Set the JSONB assignment info
        caseEntity.setAssignmentInfo(assignmentInfo);

        // Save case
        Case savedCase = caseRepository.save(caseEntity);
        log.info("Created case {} with assignments - Users: {}, Teams: {}", caseNumber, 
                assignmentInfo.getUserIds(), assignmentInfo.getTeamIds());

        // Send comprehensive notifications (includes WebSocket)
        sendCaseNotifications(savedCase, ruleAssignment);

        return savedCase;
    }

    /**
     * Create unassigned case for rules without assignments
     */
    private Case createUnassignedCase(
            GrafanaWebhookRequest.Alert alert,
            GrafanaWebhookRequest request,
            LocalDateTime webhookTime,
            String alertId) {

        String caseNumber = generateCaseNumber();
        
        // Clean up title for unassigned cases
        String title = alert.getAnnotations().getOrDefault("summary", "Alert: " + alert.getFingerprint());
        title = title.replace("\\\"", "")
                     .replace("\"", "")
                     .replace("[no value]", "No Data")
                     .trim();
        if (title.isEmpty()) {
            title = alert.getLabels().getOrDefault("alertname", "Alert: " + alert.getFingerprint());
        }
        
        // Clean up description
        String description = alert.getAnnotations().getOrDefault("description", "No description available");
        description = description.replace("\\\"", "")
                               .replace("\"", "")
                               .trim();

        Case caseEntity = Case.builder()
                .caseNumber(caseNumber)
                .grafanaAlertUid(alert.getFingerprint())
                .grafanaAlertId(alertId)
                .title(title)
                .description(description)
                .severity(Case.Severity.MEDIUM) // Default severity
                .priority(2) // Default priority
                .category(Case.Category.CUSTOM)
                .status(Case.CaseStatus.OPEN)
                .slaDeadline(calculateSlaDeadline(RuleAssignment.CaseSeverity.MEDIUM, webhookTime))
                .alertData(buildAlertDataJson(alert, request))
                .build();

        Case savedCase = caseRepository.save(caseEntity);
        log.info("Created unassigned case: {}", caseNumber);

        // Notify ONLY administrators about unassigned case (combines notification + websocket)
        notificationService.notifyAdminsOnly(
                "Unassigned Alert Case Created",
                "Case " + caseNumber + " was created from an alert with no rule assignment. Please review and assign.",
                savedCase
        );
        
        // Don't send duplicate real-time updates - already sent in notifyAdminsOnly
        // sendRealtimeUpdates(savedCase, null);

        return savedCase;
    }

    /**
     * Check for duplicate alerts within time window
     */
    private boolean isDuplicateAlert(String fingerprint, LocalDateTime currentTime) {
        LocalDateTime windowStart = currentTime.minusMinutes(duplicateWindowMinutes);
        return caseRepository.existsByGrafanaAlertUidAndCreatedAtAfter(fingerprint, windowStart);
    }

    /**
     * Update existing case if duplicate alert detected
     */
    private Case updateExistingCase(GrafanaWebhookRequest.Alert alert, LocalDateTime webhookTime) {
        Optional<Case> existingCase = caseRepository.findFirstByGrafanaAlertUidOrderByCreatedAtDesc(alert.getFingerprint());
        
        if (existingCase.isPresent()) {
            Case caseEntity = existingCase.get();
            
            // Update case with new alert information if needed
            if (caseEntity.getStatus() == Case.CaseStatus.RESOLVED || caseEntity.getStatus() == Case.CaseStatus.CLOSED) {
                // Reopen case if it was resolved/closed
                caseEntity.setStatus(Case.CaseStatus.OPEN);
                caseEntity.setResolvedAt(null);
                caseEntity.setClosedAt(null);
                
                Case savedCase = caseRepository.save(caseEntity);
                log.info("Reopened case {} due to new alert", caseEntity.getCaseNumber());
                
                // Notify assigned users about reopened case
                AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
                if (assignmentInfo.hasAssignments()) {
                    // Notify assigned users
                    for (Long userId : assignmentInfo.getUserIds()) {
                        userRepository.findById(userId).ifPresent(user -> 
                            notificationService.sendNotification(
                                    user,
                                    "Case Reopened",
                                    "Case " + caseEntity.getCaseNumber() + " has been reopened due to a new alert",
                                    "CASE_REOPENED"
                            )
                        );
                    }
                }
                
                return savedCase;
            }
            
            log.debug("Case {} already exists and is still open", caseEntity.getCaseNumber());
            return caseEntity;
        }
        
        return null;
    }

    /**
     * Build AssignmentInfo from RuleAssignment
     */
    private AssignmentInfo buildAssignmentInfo(RuleAssignment ruleAssignment) {
        AssignmentInfo info = new AssignmentInfo();
        
        if (ruleAssignment != null) {
            // Add assigned users
            if (ruleAssignment.getAssignedUsers() != null) {
                for (User user : ruleAssignment.getAssignedUsers()) {
                    info.addUser(user.getId());
                }
            }
            
            // Add assigned teams
            if (ruleAssignment.getAssignedTeams() != null) {
                for (Team team : ruleAssignment.getAssignedTeams()) {
                    info.addTeam(team.getId());
                }
            }
        }
        
        return info;
    }
    
    /**
     * Send case notifications based on assignment - ONLY to assigned users/teams
     */
    private void sendCaseNotifications(Case caseEntity, RuleAssignment ruleAssignment) {
        try {
            AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
            
            // Create detailed notification data
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("caseId", caseEntity.getId());
            notificationData.put("caseNumber", caseEntity.getCaseNumber());
            notificationData.put("title", caseEntity.getTitle());
            notificationData.put("severity", caseEntity.getSeverity().toString());
            notificationData.put("priority", caseEntity.getPriority());
            notificationData.put("ruleName", ruleAssignment != null ? ruleAssignment.getGrafanaRuleName() : "No Rule");
            notificationData.put("description", caseEntity.getDescription());
            notificationData.put("slaDeadline", caseEntity.getSlaDeadline());
            notificationData.put("assignedUserIds", assignmentInfo.getUserIds());
            notificationData.put("assignedTeamIds", assignmentInfo.getTeamIds());
            
            // Notify all directly assigned users
            if (assignmentInfo.getUserIds() != null) {
                for (Long userId : assignmentInfo.getUserIds()) {
                    User user = userRepository.findById(userId).orElse(null);
                    if (user != null) {
                        // Send targeted notification to assigned user (includes WebSocket)
                        notificationService.sendNotification(
                                user,
                                "New Case Assigned: " + caseEntity.getCaseNumber(),
                                String.format("Case %s has been assigned to you from rule: %s\nSeverity: %s\nTitle: %s", 
                                        caseEntity.getCaseNumber(), 
                                        ruleAssignment != null ? ruleAssignment.getGrafanaRuleName() : "No Rule",
                                        caseEntity.getSeverity(),
                                        caseEntity.getTitle()),
                                "CASE_ASSIGNED"
                        );
                        
                        // NOTE: WebSocket notification is already sent by notificationService.sendNotification()
                        // No need to send duplicate via webSocketService.sendToUser()
                        log.info("Sent notification to assigned user {} (user_id: {}) for case {}", 
                            user.getName(), userId, caseEntity.getCaseNumber());
                    }
                }
            }
            
            // Notify all assigned teams
            if (assignmentInfo.getTeamIds() != null) {
                for (Long teamId : assignmentInfo.getTeamIds()) {
                    Team team = teamRepository.findById(teamId).orElse(null);
                    if (team != null && team.getMembers() != null) {
                        for (User member : team.getMembers()) {
                            // Skip if user is already directly assigned
                            if (assignmentInfo.getUserIds() != null && assignmentInfo.getUserIds().contains(member.getId())) {
                                continue;
                            }
                            
                            // Send team notification (includes WebSocket)
                            notificationService.sendNotification(
                                    member,
                                    "New Team Case: " + caseEntity.getCaseNumber(),
                                    String.format("Case %s created for your team (%s)\nRule: %s\nSeverity: %s\nTitle: %s",
                                            caseEntity.getCaseNumber(), 
                                            team.getName(), 
                                            ruleAssignment != null ? ruleAssignment.getGrafanaRuleName() : "No Rule",
                                            caseEntity.getSeverity(),
                                            caseEntity.getTitle()),
                                    "TEAM_CASE_CREATED"
                            );
                            
                            // NOTE: WebSocket notification is already sent by notificationService.sendNotification()
                            log.info("Notified team member {} (user_id: {}) about case {} for team {}", 
                                member.getName(), member.getId(), caseEntity.getCaseNumber(), team.getName());
                        }
                    }
                }
            }
            
            // If no assignments, notify admins
            if (!assignmentInfo.hasAssignments()) {
                notificationService.notifyAdminsOnly(
                        "Unassigned Case Created",
                        "Case " + caseEntity.getCaseNumber() + " was created with no assignments. Please review and assign.",
                        caseEntity
                );
            }
            
        } catch (Exception e) {
            log.error("Failed to send case notifications for case: {}", caseEntity.getCaseNumber(), e);
        }
    }

    /**
     * Notify ONLY team members assigned to the rule - NO broadcast
     * @deprecated This method is no longer used, integrated into sendCaseNotifications
     */
    @Deprecated
    @SuppressWarnings("unused")
    private void notifyRuleAssignees_OLD(Case caseEntity, RuleAssignment ruleAssignment) {
        try {
            if (ruleAssignment == null || ruleAssignment.getAssignedTeams() == null) {
                return;
            }
            
            // Create detailed notification data for team members
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("caseId", caseEntity.getId());
            notificationData.put("caseNumber", caseEntity.getCaseNumber());
            notificationData.put("title", caseEntity.getTitle());
            notificationData.put("severity", caseEntity.getSeverity().toString());
            notificationData.put("priority", caseEntity.getPriority());
            notificationData.put("ruleName", ruleAssignment.getGrafanaRuleName());
            notificationData.put("description", caseEntity.getDescription());
            // This is inside the deprecated method, not fixing
            
            for (Team team : ruleAssignment.getAssignedTeams()) {
                if (team.getMembers() == null) continue;
                
                notificationData.put("teamName", team.getName());
                
                for (User member : team.getMembers()) {
                    // This is inside the deprecated method, not fixing
                    
                    // Send targeted notification to team member only
                    notificationService.sendNotification(
                            member,
                            "New Team Case: " + caseEntity.getCaseNumber(),
                            String.format("Case %s created for your team (%s)\nRule: %s\nSeverity: %s\nTitle: %s\nAssigned to: %s",
                                    caseEntity.getCaseNumber(), 
                                    team.getName(), 
                                    ruleAssignment.getGrafanaRuleName(),
                                    caseEntity.getSeverity(),
                                    caseEntity.getTitle(),
                                    "Multiple Users"),
                            "TEAM_CASE_CREATED"
                    );
                    
                    // Send WebSocket notification to specific team member
                    webSocketService.sendToUser(member.getId(), "case.team", notificationData);
                    log.info("Notified team member {} (user_id: {}) about case {} for team {}", 
                        member.getName(), member.getId(), caseEntity.getCaseNumber(), team.getName());
                }
            }
        } catch (Exception e) {
            log.error("Failed to notify rule assignees for case: {}", caseEntity.getCaseNumber(), e);
        }
    }

    /**
     * Send real-time updates via WebSocket - ONLY to relevant users/channels
     * @deprecated This method is no longer used, integrated into sendCaseNotifications
     */
    @Deprecated
    @SuppressWarnings("unused")
    private void sendRealtimeUpdates(Case caseEntity, RuleAssignment ruleAssignment) {
        try {
            Map<String, Object> updateData = buildCaseUpdateData(caseEntity, ruleAssignment);
            com.elite.casetools.dto.AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();

            // Send to all assigned users
            if (assignmentInfo.getUserIds() != null) {
                for (Long userId : assignmentInfo.getUserIds()) {
                    webSocketService.sendToUser(userId, "case.created", updateData);
                    log.debug("Sent real-time update to user: {} for case: {}", 
                        userId, caseEntity.getCaseNumber());
                }
            }

            // Send to specific team channels ONLY - not broadcast
            if (ruleAssignment != null && ruleAssignment.getAssignedTeams() != null) {
                for (Team team : ruleAssignment.getAssignedTeams()) {
                    webSocketService.sendToChannel("team." + team.getId(), "case.created", updateData);
                    log.debug("Sent real-time update to team channel: {} for case: {}", 
                        team.getName(), caseEntity.getCaseNumber());
                }
            }

            // For unassigned cases, ONLY send to admin channel - not broadcast
            if (caseEntity.getAssignedTo() == null && ruleAssignment == null) {
                webSocketService.sendToChannel("admin", "admin.unassigned-case", updateData);
                log.info("Sent unassigned case notification to admin channel for case: {}", 
                    caseEntity.getCaseNumber());
            }

        } catch (Exception e) {
            log.error("Failed to send real-time updates for case: {}", caseEntity.getCaseNumber(), e);
        }
    }

    /**
     * Build case update data for WebSocket messages with full details
     */
    private Map<String, Object> buildCaseUpdateData(Case caseEntity, RuleAssignment ruleAssignment) {
        Map<String, Object> data = new HashMap<>();
        
        // Notification metadata
        data.put("id", UUID.randomUUID().toString());
        data.put("type", "case_created");
        data.put("severity", caseEntity.getSeverity().toString().toLowerCase());
        data.put("timestamp", System.currentTimeMillis());
        
        // Case details for display
        data.put("title", "New Case: " + caseEntity.getCaseNumber());
        data.put("message", String.format("%s\nSeverity: %s | Priority: P%d", 
            caseEntity.getTitle(),
            caseEntity.getSeverity(),
            caseEntity.getPriority()));
        
        // Additional data for navigation
        Map<String, Object> caseData = new HashMap<>();
        caseData.put("caseId", caseEntity.getId());
        caseData.put("caseNumber", caseEntity.getCaseNumber());
        caseData.put("caseTitle", caseEntity.getTitle());
        caseData.put("description", caseEntity.getDescription());
        caseData.put("severity", caseEntity.getSeverity().toString());
        caseData.put("priority", caseEntity.getPriority());
        caseData.put("category", caseEntity.getCategory() != null ? caseEntity.getCategory().toString() : null);
        caseData.put("status", caseEntity.getStatus().toString());
        caseData.put("slaDeadline", caseEntity.getSlaDeadline() != null ? 
            caseEntity.getSlaDeadline().toString() : null);
        com.elite.casetools.dto.AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        caseData.put("assignedUserIds", assignmentInfo.getUserIds());
        caseData.put("assignedTeamIds", assignmentInfo.getTeamIds());
        caseData.put("hasAssignments", assignmentInfo.hasAssignments());
        caseData.put("ruleName", ruleAssignment != null ? 
            ruleAssignment.getGrafanaRuleName() : "Manual/Unassigned");
        caseData.put("grafanaAlertId", caseEntity.getGrafanaAlertId());
        
        data.put("data", caseData);
        
        return data;
    }

    // Helper methods

    private String extractRuleUidFromAlert(GrafanaWebhookRequest.Alert alert) {
        // Try to get rule UID from various sources in the alert
        Map<String, String> labels = alert.getLabels();
        
        // Check common label names for rule UID
        if (labels != null) {
            // First check for explicit rule_id
            if (labels.containsKey("rule_id")) {
                return labels.get("rule_id");
            }
            
            for (String key : Arrays.asList("__alert_rule_uid__", "alertuid", "rule_uid")) {
                if (labels.containsKey(key)) {
                    return labels.get(key);
                }
            }
        }
        
        // Extract from generator URL - format: http://localhost:9000/alerting/grafana/{rule_uid}/view
        String generatorURL = alert.getGeneratorURL();
        if (StringUtils.hasText(generatorURL)) {
            // Pattern 1: /alerting/grafana/{rule_uid}/view or /alerting/grafana/{rule_uid}
            if (generatorURL.contains("/alerting/grafana/")) {
                int start = generatorURL.indexOf("/alerting/grafana/") + 18;
                int end = generatorURL.indexOf("/", start);
                
                if (end > start) {
                    // Found a trailing slash, extract UID between slashes
                    return generatorURL.substring(start, end);
                } else if (end == -1 && start < generatorURL.length()) {
                    // No trailing slash, extract UID from start to end of URL
                    return generatorURL.substring(start);
                }
            }
            
            // Pattern 2: ruleUID= parameter
            if (generatorURL.contains("ruleUID=")) {
                int start = generatorURL.indexOf("ruleUID=") + 8;
                int end = generatorURL.indexOf("&", start);
                return end > start ? generatorURL.substring(start, end) : generatorURL.substring(start);
            }
        }
        
        return null;
    }

    private String generateCaseNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.valueOf((int) (Math.random() * 1000));
        return "CASE-" + timestamp + "-" + random;
    }

    private String buildCaseTitle(GrafanaWebhookRequest.Alert alert, RuleAssignment ruleAssignment) {
        String title = alert.getAnnotations().getOrDefault("summary", ruleAssignment.getGrafanaRuleName());
        
        // Clean up the title - remove escaped quotes and [no value] placeholders
        if (title != null) {
            title = title.replace("\\\"", "")  // Remove escaped quotes
                         .replace("\"", "")      // Remove regular quotes
                         .replace("[no value]", "No Data")  // Replace [no value] with cleaner text
                         .trim();
            
            // If title is empty after cleanup, use alert name or rule name
            if (title.isEmpty()) {
                title = alert.getLabels().getOrDefault("alertname", 
                        ruleAssignment != null ? ruleAssignment.getGrafanaRuleName() : "Alert");
            }
        }
        
        return title != null && title.length() > 500 ? title.substring(0, 497) + "..." : title;
    }

    private String buildCaseDescription(GrafanaWebhookRequest.Alert alert, RuleAssignment ruleAssignment) {
        StringBuilder description = new StringBuilder();
        
        // Add rule information
        if (ruleAssignment != null) {
            description.append("Alert Rule: ").append(ruleAssignment.getGrafanaRuleName()).append("\n\n");
        }
        
        // Clean and add alert description
        String alertDescription = alert.getAnnotations().getOrDefault("description", "No description available");
        alertDescription = alertDescription.replace("\\\"", "")  // Remove escaped quotes
                                         .replace("\"", "")      // Remove regular quotes  
                                         .trim();
        
        if (!alertDescription.isEmpty() && !alertDescription.equals("No description available")) {
            description.append("Alert Details: ").append(alertDescription).append("\n\n");
        }
        
        // Add rule description if different from alert description
        if (ruleAssignment != null && StringUtils.hasText(ruleAssignment.getDescription())) {
            description.append("Rule Configuration: ").append(ruleAssignment.getDescription()).append("\n\n");
        }
        
        // Add important labels
        description.append("Context Information:\n");
        Map<String, String> labels = alert.getLabels();
        if (labels.containsKey("severity")) {
            description.append("- Severity: ").append(labels.get("severity")).append("\n");
        }
        if (labels.containsKey("environment")) {
            description.append("- Environment: ").append(labels.get("environment")).append("\n");
        }
        if (labels.containsKey("service")) {
            description.append("- Service: ").append(labels.get("service")).append("\n");
        }
        if (labels.containsKey("instance")) {
            description.append("- Instance: ").append(labels.get("instance")).append("\n");
        }
        
        // Add alert timing
        if (alert.getStartsAt() != null) {
            description.append("\nAlert Started: ").append(alert.getStartsAt()).append("\n");
        }
        
        return description.toString();
    }

    private Case.Severity mapSeverity(RuleAssignment.CaseSeverity severity) {
        return switch (severity) {
            case LOW -> Case.Severity.LOW;
            case MEDIUM -> Case.Severity.MEDIUM;
            case HIGH -> Case.Severity.HIGH;
            case CRITICAL -> Case.Severity.CRITICAL;
        };
    }

    private int mapPriority(RuleAssignment.CaseSeverity severity) {
        return switch (severity) {
            case LOW -> 4;
            case MEDIUM -> 3;
            case HIGH -> 2;
            case CRITICAL -> 1;
        };
    }

    private Case.Category mapCategory(RuleAssignment.CaseCategory category) {
        return switch (category) {
            case REVENUE_LOSS -> Case.Category.REVENUE_LOSS;
            case NETWORK_ISSUE -> Case.Category.NETWORK_ISSUE;
            case QUALITY_ISSUE -> Case.Category.QUALITY;
            case FRAUD_ALERT -> Case.Category.FRAUD;
            case OPERATIONAL -> Case.Category.CUSTOM;
            case CUSTOM -> Case.Category.CUSTOM; // Default mapping
        };
    }

    private LocalDateTime calculateSlaDeadline(RuleAssignment.CaseSeverity severity, LocalDateTime alertTime) {
        int hoursToAdd = switch (severity) {
            case CRITICAL -> 4;  // 4 hours
            case HIGH -> 12;     // 12 hours
            case MEDIUM -> 24;   // 24 hours
            case LOW -> 72;      // 72 hours
        };
        return alertTime.plusHours(hoursToAdd);
    }

    private String extractAffectedServices(GrafanaWebhookRequest.Alert alert) {
        Map<String, String> labels = alert.getLabels();
        return labels.getOrDefault("service", labels.getOrDefault("job", "Unknown"));
    }

    private String[] extractTags(GrafanaWebhookRequest.Alert alert, RuleAssignment ruleAssignment) {
        List<String> tags = new ArrayList<>();
        tags.add("grafana");
        tags.add(ruleAssignment.getCategory().toString().toLowerCase());
        tags.add(ruleAssignment.getSeverity().toString().toLowerCase());
        
        // Add custom tags from alert labels
        Map<String, String> labels = alert.getLabels();
        if (labels.containsKey("environment")) {
            tags.add("env:" + labels.get("environment"));
        }
        if (labels.containsKey("service")) {
            tags.add("service:" + labels.get("service"));
        }
        
        return tags.toArray(new String[0]);
    }

    /**
     * Generate a unique alert ID if not present in the webhook payload
     */
    private String generateAlertId(GrafanaWebhookRequest.Alert alert) {
        // First check if alertId exists in labels
        Map<String, String> labels = alert.getLabels();
        if (labels != null && labels.containsKey("alertId")) {
            return labels.get("alertId");
        }
        
        // Try to use rule_id + timestamp as unique identifier
        String ruleId = labels != null ? labels.get("rule_id") : null;
        if (StringUtils.hasText(ruleId)) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            return "ALERT-" + ruleId + "-" + timestamp;
        }
        
        // Generate using fingerprint + timestamp as fallback
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String shortFingerprint = alert.getFingerprint().length() > 8 ? 
                alert.getFingerprint().substring(0, 8) : alert.getFingerprint();
        return "ALERT-" + shortFingerprint + "-" + timestamp;
    }

    private String buildAlertDataJson(GrafanaWebhookRequest.Alert alert, GrafanaWebhookRequest request) {
        try {
            Map<String, Object> alertData = new HashMap<>();
            alertData.put("fingerprint", alert.getFingerprint());
            alertData.put("status", alert.getStatus());
            alertData.put("startsAt", alert.getStartsAt());
            alertData.put("endsAt", alert.getEndsAt());
            alertData.put("generatorURL", alert.getGeneratorURL());
            alertData.put("labels", alert.getLabels());
            alertData.put("annotations", alert.getAnnotations());
            alertData.put("receiver", request.getReceiver());
            alertData.put("webhookReceivedAt", LocalDateTime.now().toString());
            
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(alertData);
        } catch (Exception e) {
            log.error("Failed to serialize alert data", e);
            return "{}";
        }
    }
}