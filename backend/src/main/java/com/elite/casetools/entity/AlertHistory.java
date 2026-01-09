package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Simplified Alert History entity for audit trail only
 * Tracks incoming alerts and their processing status
 */
@Entity
@Table(name = "alert_history", schema = "casemanagement", 
       indexes = {
           @Index(name = "idx_alert_history_fingerprint", columnList = "fingerprint"),
           @Index(name = "idx_alert_history_grafana_rule_uid", columnList = "grafana_rule_uid")
       })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertHistory extends BaseEntity {

    @Column(name = "fingerprint", nullable = false, length = 255)
    private String fingerprint; // For deduplication

    @Column(name = "grafana_rule_uid", length = 255)
    private String grafanaRuleUid; // For finding assignment (can be null)

    @Column(name = "alert_name", nullable = false, length = 500)
    private String alertName; // Alert name for display

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private AlertHistoryStatus status; // RECEIVED, CASE_CREATED, SUPPRESSED, DUPLICATE

    @Column(name = "case_id")
    private Long caseId; // Link to case if created

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload; // Store original for audit

    // Simplified enum for alert history status only
    public enum AlertHistoryStatus {
        RECEIVED,      // Alert received from Grafana
        CASE_CREATED,  // Case was created from this alert
        SUPPRESSED,    // Alert was suppressed (e.g., duplicate pattern)
        DUPLICATE      // Duplicate alert within time window
    }
}