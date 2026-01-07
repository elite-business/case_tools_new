package com.elite.casetools.service;

import com.elite.casetools.dto.GrafanaWebhookRequest;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.CaseRepository;
import com.elite.casetools.repository.RuleAssignmentRepository;
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
    private final CaseService caseService;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;

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

        String ruleUid = extractRuleUidFromAlert(alert);
        if (!StringUtils.hasText(ruleUid)) {
            log.warn("Cannot determine rule UID from alert, skipping: {}", alert.getFingerprint());
            return null;
        }

        // Check if we have a rule assignment for this Grafana rule
        Optional<RuleAssignment> ruleAssignmentOpt = ruleAssignmentRepository.findByGrafanaRuleUid(ruleUid);
        
        if (ruleAssignmentOpt.isEmpty()) {
            log.info("No rule assignment found for rule UID: {}, creating unassigned case", ruleUid);
            return createUnassignedCase(alert, request, webhookTime);
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
        return createCaseWithAssignment(alert, request, ruleAssignment, webhookTime);
    }

    /**
     * Create case with proper user assignment based on rule assignment
     */
    private Case createCaseWithAssignment(
            GrafanaWebhookRequest.Alert alert,
            GrafanaWebhookRequest request,
            RuleAssignment ruleAssignment,
            LocalDateTime webhookTime) {

        log.info("Creating case with assignment for rule: {}", ruleAssignment.getGrafanaRuleName());

        // Determine assigned user based on assignment strategy
        User assignedUser = ruleAssignmentService.determineAssignedUser(ruleAssignment.getGrafanaRuleUid());

        // Generate case number
        String caseNumber = generateCaseNumber();

        // Build case entity
        Case caseEntity = Case.builder()
                .caseNumber(caseNumber)
                .grafanaAlertUid(alert.getFingerprint())
                .grafanaAlertId(extractAlertIdFromLabels(alert))
                .title(buildCaseTitle(alert, ruleAssignment))
                .description(buildCaseDescription(alert, ruleAssignment))
                .severity(mapSeverity(ruleAssignment.getSeverity()))
                .priority(mapPriority(ruleAssignment.getSeverity()))
                .category(mapCategory(ruleAssignment.getCategory()))
                .status(Case.CaseStatus.OPEN)
                .assignedTo(assignedUser)
                .assignedAt(assignedUser != null ? webhookTime : null)
                .slaDeadline(calculateSlaDeadline(ruleAssignment.getSeverity(), webhookTime))
                .affectedServices(extractAffectedServices(alert))
                .tags(extractTags(alert, ruleAssignment))
                .alertData(buildAlertDataJson(alert, request))
                .build();

        // Save case
        Case savedCase = caseRepository.save(caseEntity);
        log.info("Created case {} assigned to {}", caseNumber, 
                assignedUser != null ? assignedUser.getName() : "unassigned");

        // Send notifications
        sendCaseNotifications(savedCase, ruleAssignment);

        // Send real-time updates
        sendRealtimeUpdates(savedCase, ruleAssignment);

        return savedCase;
    }

    /**
     * Create unassigned case for rules without assignments
     */
    private Case createUnassignedCase(
            GrafanaWebhookRequest.Alert alert,
            GrafanaWebhookRequest request,
            LocalDateTime webhookTime) {

        String caseNumber = generateCaseNumber();

        Case caseEntity = Case.builder()
                .caseNumber(caseNumber)
                .grafanaAlertUid(alert.getFingerprint())
                .grafanaAlertId(extractAlertIdFromLabels(alert))
                .title(alert.getAnnotations().getOrDefault("summary", "Alert: " + alert.getFingerprint()))
                .description(alert.getAnnotations().getOrDefault("description", "No description available"))
                .severity(Case.Severity.MEDIUM) // Default severity
                .priority(2) // Default priority
                .category(Case.Category.CUSTOM)
                .status(Case.CaseStatus.OPEN)
                .slaDeadline(calculateSlaDeadline(RuleAssignment.CaseSeverity.MEDIUM, webhookTime))
                .alertData(buildAlertDataJson(alert, request))
                .build();

        Case savedCase = caseRepository.save(caseEntity);
        log.info("Created unassigned case: {}", caseNumber);

        // Notify administrators about unassigned case
        notificationService.notifyAdmins(
                "Unassigned Alert Case Created",
                "Case " + caseNumber + " was created from an alert with no rule assignment. Please review and assign."
        );

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
                
                // Notify assigned user about reopened case
                if (caseEntity.getAssignedTo() != null) {
                    notificationService.sendNotification(
                            caseEntity.getAssignedTo(),
                            "Case Reopened",
                            "Case " + caseEntity.getCaseNumber() + " has been reopened due to a new alert",
                            "CASE_REOPENED"
                    );
                }
                
                return savedCase;
            }
            
            log.debug("Case {} already exists and is still open", caseEntity.getCaseNumber());
            return caseEntity;
        }
        
        return null;
    }

    /**
     * Send case notifications based on assignment
     */
    private void sendCaseNotifications(Case caseEntity, RuleAssignment ruleAssignment) {
        try {
            // Notify assigned user
            if (caseEntity.getAssignedTo() != null) {
                notificationService.sendNotification(
                        caseEntity.getAssignedTo(),
                        "New Case Assigned",
                        String.format("Case %s has been assigned to you from rule: %s", 
                                caseEntity.getCaseNumber(), ruleAssignment.getGrafanaRuleName()),
                        "CASE_ASSIGNED"
                );
            }

            // Notify team members if assigned via team
            for (Team team : ruleAssignment.getAssignedTeams()) {
                for (User member : team.getMembers()) {
                    if (!member.equals(caseEntity.getAssignedTo())) { // Don't double-notify assigned user
                        notificationService.sendNotification(
                                member,
                                "New Team Case",
                                String.format("Case %s created for your team (%s) from rule: %s",
                                        caseEntity.getCaseNumber(), team.getName(), ruleAssignment.getGrafanaRuleName()),
                                "TEAM_CASE_CREATED"
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to send case notifications for case: {}", caseEntity.getCaseNumber(), e);
        }
    }

    /**
     * Send real-time updates via WebSocket
     */
    private void sendRealtimeUpdates(Case caseEntity, RuleAssignment ruleAssignment) {
        try {
            Map<String, Object> updateData = Map.of(
                    "type", "case_created",
                    "caseId", caseEntity.getId(),
                    "caseNumber", caseEntity.getCaseNumber(),
                    "severity", caseEntity.getSeverity().toString(),
                    "assignedTo", caseEntity.getAssignedTo() != null ? caseEntity.getAssignedTo().getId() : null,
                    "ruleName", ruleAssignment.getGrafanaRuleName()
            );

            // Send to assigned user
            if (caseEntity.getAssignedTo() != null) {
                webSocketService.sendToUser(caseEntity.getAssignedTo().getId(), "case.created", updateData);
            }

            // Send to team channels
            for (Team team : ruleAssignment.getAssignedTeams()) {
                webSocketService.sendToChannel("team." + team.getId(), "case.created", updateData);
            }

            // Send to admin channel
            webSocketService.sendToChannel("admin", "case.created", updateData);

        } catch (Exception e) {
            log.error("Failed to send real-time updates for case: {}", caseEntity.getCaseNumber(), e);
        }
    }

    // Helper methods

    private String extractRuleUidFromAlert(GrafanaWebhookRequest.Alert alert) {
        // Try to get rule UID from various sources in the alert
        Map<String, String> labels = alert.getLabels();
        
        // Check common label names for rule UID
        if (labels != null) {
            for (String key : Arrays.asList("__alert_rule_uid__", "alertname", "rule_uid")) {
                if (labels.containsKey(key)) {
                    return labels.get(key);
                }
            }
        }
        
        // Fallback to generator URL parsing if available
        String generatorURL = alert.getGeneratorURL();
        if (StringUtils.hasText(generatorURL) && generatorURL.contains("ruleUID=")) {
            int start = generatorURL.indexOf("ruleUID=") + 8;
            int end = generatorURL.indexOf("&", start);
            return end > start ? generatorURL.substring(start, end) : generatorURL.substring(start);
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
        return title.length() > 500 ? title.substring(0, 497) + "..." : title;
    }

    private String buildCaseDescription(GrafanaWebhookRequest.Alert alert, RuleAssignment ruleAssignment) {
        StringBuilder description = new StringBuilder();
        
        description.append("Alert generated from Grafana rule: ").append(ruleAssignment.getGrafanaRuleName()).append("\n\n");
        
        String alertDescription = alert.getAnnotations().getOrDefault("description", "No description available");
        description.append("Description: ").append(alertDescription).append("\n\n");
        
        if (StringUtils.hasText(ruleAssignment.getDescription())) {
            description.append("Rule Description: ").append(ruleAssignment.getDescription()).append("\n\n");
        }
        
        description.append("Alert Labels:\n");
        alert.getLabels().forEach((key, value) -> 
                description.append("- ").append(key).append(": ").append(value).append("\n"));
        
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

    private String extractAlertIdFromLabels(GrafanaWebhookRequest.Alert alert) {
        // Try to extract a unique alert ID from labels
        Map<String, String> labels = alert.getLabels();
        return labels.getOrDefault("alertname", alert.getFingerprint());
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