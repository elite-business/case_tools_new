package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Entity to track all case status changes and transitions
 * Maps to casemanagement.case_history table
 */
@Entity
@Table(name = "case_history", schema = "casemanagement",
       indexes = {
           @Index(name = "idx_case_history_case_id", columnList = "case_id"),
           @Index(name = "idx_case_history_changed_at", columnList = "changed_at"),
           @Index(name = "idx_case_history_changed_by", columnList = "changed_by"),
           @Index(name = "idx_case_history_status", columnList = "new_status")
       })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "change_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ChangeType changeType;

    @Column(name = "field_name", length = 100)
    private String fieldName;

    // Status transitions
    @Column(name = "old_status", length = 30)
    @Enumerated(EnumType.STRING)
    private Case.CaseStatus oldStatus;

    @Column(name = "new_status", length = 30)
    @Enumerated(EnumType.STRING)
    private Case.CaseStatus newStatus;

    // Assignment changes
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_assignee_id")
    private User oldAssignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_assignee_id")
    private User newAssignee;

    // Team changes
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_team_id")
    private Team oldTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_team_id")
    private Team newTeam;

    // Priority and severity changes
    @Column(name = "old_priority")
    private Integer oldPriority;

    @Column(name = "new_priority")
    private Integer newPriority;

    @Column(name = "old_severity", length = 20)
    @Enumerated(EnumType.STRING)
    private Case.Severity oldSeverity;

    @Column(name = "new_severity", length = 20)
    @Enumerated(EnumType.STRING)
    private Case.Severity newSeverity;

    // General field changes
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "change_reason", columnDefinition = "TEXT")
    private String changeReason;

    @Column(name = "change_description", columnDefinition = "TEXT")
    private String changeDescription;

    // Additional metadata
    @Column(name = "additional_data", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> additionalData;

    // Audit information
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "session_id", length = 128)
    private String sessionId;

    // Workflow information
    @Column(name = "workflow_step", length = 100)
    private String workflowStep;

    @Column(name = "automation_triggered", nullable = false)
    @Builder.Default
    private Boolean automationTriggered = false;

    @Column(name = "notification_sent", nullable = false)
    @Builder.Default
    private Boolean notificationSent = false;

    public enum ChangeType {
        STATUS_CHANGE,
        ASSIGNMENT_CHANGE,
        TEAM_CHANGE,
        PRIORITY_CHANGE,
        SEVERITY_CHANGE,
        FIELD_UPDATE,
        COMMENT_ADDED,
        ATTACHMENT_ADDED,
        SLA_BREACH,
        ESCALATION,
        AUTO_RESOLUTION,
        MANUAL_INTERVENTION,
        BULK_UPDATE
    }

    // Helper methods
    public boolean isStatusChange() {
        return changeType == ChangeType.STATUS_CHANGE;
    }

    public boolean isAssignmentChange() {
        return changeType == ChangeType.ASSIGNMENT_CHANGE;
    }

    public boolean isTeamChange() {
        return changeType == ChangeType.TEAM_CHANGE;
    }

    public boolean isPriorityChange() {
        return changeType == ChangeType.PRIORITY_CHANGE;
    }

    public boolean isSeverityChange() {
        return changeType == ChangeType.SEVERITY_CHANGE;
    }

    public boolean isAutomated() {
        return automationTriggered != null && automationTriggered;
    }

    public String getFormattedChange() {
        return switch (changeType) {
            case STATUS_CHANGE -> String.format("Status changed from %s to %s", oldStatus, newStatus);
            case ASSIGNMENT_CHANGE -> {
                String oldName = oldAssignee != null ? oldAssignee.getName() : "Unassigned";
                String newName = newAssignee != null ? newAssignee.getName() : "Unassigned";
                yield String.format("Assignment changed from %s to %s", oldName, newName);
            }
            case TEAM_CHANGE -> {
                String oldTeamName = oldTeam != null ? oldTeam.getName() : "No Team";
                String newTeamName = newTeam != null ? newTeam.getName() : "No Team";
                yield String.format("Team changed from %s to %s", oldTeamName, newTeamName);
            }
            case PRIORITY_CHANGE -> String.format("Priority changed from %d to %d", oldPriority, newPriority);
            case SEVERITY_CHANGE -> String.format("Severity changed from %s to %s", oldSeverity, newSeverity);
            case FIELD_UPDATE -> String.format("%s changed from %s to %s", fieldName, oldValue, newValue);
            default -> changeDescription != null ? changeDescription : "Case updated";
        };
    }
}