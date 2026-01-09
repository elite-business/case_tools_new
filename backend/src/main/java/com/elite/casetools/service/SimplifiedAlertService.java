package com.elite.casetools.service;

import com.elite.casetools.dto.GrafanaWebhookRequest;
import com.elite.casetools.entity.AlertHistory;
import com.elite.casetools.repository.AlertHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Simplified Alert Service for audit trail only
 * Creates lightweight alert history records without complex state management
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SimplifiedAlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final RuleUidResolver ruleUidResolver;

    /**
     * Process alert from Grafana webhook for audit trail
     */
    public AlertHistory processGrafanaAlertFromWebhook(GrafanaWebhookRequest.Alert alert, 
                                                       GrafanaWebhookRequest request,
                                                       boolean sendNotifications) {
        log.debug("Processing alert for audit trail: {}", alert.getFingerprint());

        // Check if alert already exists
        Optional<AlertHistory> existing = alertHistoryRepository.findByFingerprint(alert.getFingerprint());
        if (existing.isPresent()) {
            log.debug("Alert already exists: {}", alert.getFingerprint());
            AlertHistory existingAlert = existing.get();
            existingAlert.setStatus(AlertHistory.AlertHistoryStatus.DUPLICATE);
            return alertHistoryRepository.save(existingAlert);
        }

        // Extract rule UID
        String ruleUid = ruleUidResolver.resolveRuleUid(alert);

        // Extract alert name
        String alertName = alert.getLabels().getOrDefault("alertname", 
                          alert.getAnnotations().getOrDefault("summary", "Unknown Alert"));

        // Create simplified alert history
        AlertHistory alertHistory = AlertHistory.builder()
                .fingerprint(alert.getFingerprint())
                .grafanaRuleUid(ruleUid)
                .alertName(cleanAlertName(alertName))
                .receivedAt(LocalDateTime.now())
                .status(AlertHistory.AlertHistoryStatus.RECEIVED)
                .rawPayload(buildRawPayload(alert, request))
                .build();

        AlertHistory saved = alertHistoryRepository.save(alertHistory);
        log.info("Created alert history record: {} with status RECEIVED", saved.getId());

        return saved;
    }

    /**
     * Mark alert as having created a case
     */
    public void markAlertCaseCreated(String fingerprint, Long caseId) {
        alertHistoryRepository.findByFingerprint(fingerprint).ifPresent(alert -> {
            alert.setStatus(AlertHistory.AlertHistoryStatus.CASE_CREATED);
            alert.setCaseId(caseId);
            alertHistoryRepository.save(alert);
            log.debug("Marked alert {} as CASE_CREATED with case ID: {}", fingerprint, caseId);
        });
    }

    /**
     * Mark alert as suppressed
     */
    public void markAlertSuppressed(String fingerprint) {
        alertHistoryRepository.findByFingerprint(fingerprint).ifPresent(alert -> {
            alert.setStatus(AlertHistory.AlertHistoryStatus.SUPPRESSED);
            alertHistoryRepository.save(alert);
            log.debug("Marked alert {} as SUPPRESSED", fingerprint);
        });
    }

    /**
     * Check if alert is duplicate within time window
     */
    public boolean isDuplicateAlert(String fingerprint, int windowMinutes) {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(windowMinutes);
        return alertHistoryRepository.existsByFingerprintAndReceivedAtAfter(fingerprint, cutoff);
    }

    /**
     * Clean alert name
     */
    private String cleanAlertName(String name) {
        if (name == null) return "Unknown Alert";
        return name.replace("\\\"", "")
                   .replace("\"", "")
                   .replace("[no value]", "No Data")
                   .trim();
    }

    /**
     * Build raw payload JSON
     */
    private String buildRawPayload(GrafanaWebhookRequest.Alert alert, GrafanaWebhookRequest request) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("fingerprint", alert.getFingerprint());
            payload.put("status", alert.getStatus());
            payload.put("startsAt", alert.getStartsAt());
            payload.put("endsAt", alert.getEndsAt());
            payload.put("generatorURL", alert.getGeneratorURL());
            payload.put("labels", alert.getLabels());
            payload.put("annotations", alert.getAnnotations());
            payload.put("receiver", request.getReceiver());
            return mapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Failed to serialize alert payload", e);
            return "{}";
        }
    }
}