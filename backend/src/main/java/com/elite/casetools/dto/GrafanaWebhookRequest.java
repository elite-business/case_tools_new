package com.elite.casetools.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO for Grafana webhook request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GrafanaWebhookRequest {

    private String receiver;
    private String status;
    private List<Alert> alerts;
    private Map<String, String> groupLabels;
    private Map<String, String> commonLabels;
    private Map<String, String> commonAnnotations;
    private String externalURL;
    private String version;
    private String groupKey;
    private Integer truncatedAlerts;
    
    // For single alert processing
    private String alertName;
    private String alertId;
    private String fingerprint;
    private String severity;
    private String message;
    private String description;
    private String labels;
    private OffsetDateTime startsAt;
    private String generatorURL;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Alert {
        private String status;
        private Map<String, String> labels;
        private Map<String, String> annotations;
        private OffsetDateTime startsAt;
        private OffsetDateTime endsAt;
        private String generatorURL;
        private String fingerprint;
        private Map<String, Object> values;
    }
    
    // Helper methods for AlertService compatibility
    public String getTitle() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.annotations != null) {
                return firstAlert.annotations.getOrDefault("summary", 
                       firstAlert.annotations.getOrDefault("title", alertName != null ? alertName : "Unknown Alert"));
            }
        }
        return alertName != null ? alertName : "Unknown Alert";
    }
    
    public String getDescription() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.annotations != null) {
                return firstAlert.annotations.getOrDefault("description", message != null ? message : "");
            }
        }
        return message != null ? message : "";
    }
    
    public String getSeverity() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.labels != null) {
                return firstAlert.labels.getOrDefault("severity", 
                       firstAlert.labels.getOrDefault("priority", severity != null ? severity : "MEDIUM"));
            }
        }
        return severity != null ? severity : "MEDIUM";
    }
    
    public String getCategory() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.labels != null) {
                return firstAlert.labels.getOrDefault("category", 
                       firstAlert.labels.getOrDefault("alertname", "OTHER"));
            }
        }
        return "OTHER";
    }
    
    public String getGrafanaAlertId() {
        if (alerts != null && !alerts.isEmpty()) {
            return alerts.get(0).fingerprint;
        }
        return fingerprint != null ? fingerprint : alertId;
    }
    
    public String getGrafanaAlertUid() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.labels != null) {
                return firstAlert.labels.get("alertuid");
            }
        }
        return null;
    }
    
    public LocalDateTime getTriggeredAt() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.startsAt != null) {
                return firstAlert.startsAt.toLocalDateTime();
            }
        }
        if (startsAt != null) {
            return startsAt.toLocalDateTime();
        }
        return LocalDateTime.now();
    }
    
    public String getRuleId() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.labels != null) {
                return firstAlert.labels.getOrDefault("rule_id", 
                       firstAlert.labels.getOrDefault("alertname", null));
            }
        }
        return alertName;
    }
    
    public String getRuleName() {
        if (alerts != null && !alerts.isEmpty()) {
            Alert firstAlert = alerts.get(0);
            if (firstAlert.labels != null) {
                return firstAlert.labels.getOrDefault("alertname", 
                       firstAlert.labels.getOrDefault("rule_name", null));
            }
        }
        return alertName;
    }
}