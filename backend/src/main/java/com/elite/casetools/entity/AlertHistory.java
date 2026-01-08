package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.elite.casetools.dto.AssignmentInfo;

import java.time.LocalDateTime;

/**
 * Entity representing alert history
 * Maps to alert_history table
 */
@Entity
@Table(name = "alert_history", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertHistory extends BaseEntity {

    @Column(name = "alert_id", nullable = false)
    private String alertId;

    @Column(name = "grafana_alert_id")
    private String grafanaAlertId;

    @Column(name = "grafana_alert_uid")
    private String grafanaAlertUid;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private AlertStatus status;

    @Column(name = "severity", nullable = false)
    @Enumerated(EnumType.STRING)
    private AlertSeverity severity;

    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    private AlertCategory category;

    // JSONB column for multiple assignees (users and teams)
    @Column(name = "assigned_to", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String assignedTo; // JSON format: {"userIds": [1, 2], "teamIds": [3, 4]}

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledged_by_id")
    private User acknowledgedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    private User resolvedBy;

    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "acknowledge_notes", columnDefinition = "TEXT")
    private String acknowledgeNotes;

    @Column(name = "resolve_notes", columnDefinition = "TEXT")
    private String resolveNotes;

    @Column(name = "tags")
    private String tags;

    @Column(name = "custom_fields", columnDefinition = "TEXT")
    private String customFields;

    @Column(name = "source", length = 50)
    private String source;

    @Column(name = "rule_id")
    private String ruleId;

    @Column(name = "rule_name", length = 200)
    private String ruleName;

    // Enums
    public enum AlertStatus {
        OPEN, ACKNOWLEDGED, RESOLVED, CLOSED
    }

    public enum AlertSeverity {
        CRITICAL, HIGH, MEDIUM, LOW
    }

    public enum AlertCategory {
        NETWORK, SYSTEM, APPLICATION, DATABASE, SECURITY, PERFORMANCE, OTHER
    }
    
    // Helper methods for assignment handling
    @Transient
    public AssignmentInfo getAssignmentInfo() {
        if (assignedTo == null || assignedTo.isEmpty()) {
            return new AssignmentInfo();
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(assignedTo, AssignmentInfo.class);
        } catch (Exception e) {
            return new AssignmentInfo();
        }
    }
    
    @Transient
    public void setAssignmentInfo(AssignmentInfo info) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            this.assignedTo = mapper.writeValueAsString(info);
        } catch (Exception e) {
            this.assignedTo = "{\"userIds\": [], \"teamIds\": []}";
        }
    }
    
    @Transient
    public boolean isAssignedToUser(Long userId) {
        AssignmentInfo info = getAssignmentInfo();
        return info.isUserAssigned(userId);
    }
    
    @Transient
    public boolean isAssignedToTeam(Long teamId) {
        AssignmentInfo info = getAssignmentInfo();
        return info.isTeamAssigned(teamId);
    }
}