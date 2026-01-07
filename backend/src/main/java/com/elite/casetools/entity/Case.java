package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Case entity representing alert cases
 * Maps to cases.case table
 */
@Entity
@Table(name = "case", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Case extends BaseEntity {

    @Column(name = "case_number", unique = true, nullable = false)
    private String caseNumber;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "grafana_alert_id")
    private String grafanaAlertId;

    @Column(name = "grafana_alert_uid")
    private String grafanaAlertUid;

    // Case Details
    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "severity", nullable = false)
    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    private Category category;

    // Status & Assignment
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CaseStatus status = CaseStatus.OPEN;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    // Timestamps
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // SLA
    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "sla_breached")
    @Builder.Default
    private Boolean slaBreached = false;

    @Column(name = "response_time_minutes")
    private Integer responseTimeMinutes;

    @Column(name = "resolution_time_minutes")
    private Integer resolutionTimeMinutes;

    // Impact
    @Column(name = "affected_services", columnDefinition = "text")
    private String affectedServices;

    @Column(name = "affected_customers")
    private Integer affectedCustomers;

    @Column(name = "estimated_loss", precision = 15, scale = 2)
    private BigDecimal estimatedLoss;

    @Column(name = "actual_loss", precision = 15, scale = 2)
    private BigDecimal actualLoss;

    // Resolution
    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "resolution_actions", columnDefinition = "TEXT")
    private String resolutionActions;

    @Column(name = "preventive_measures", columnDefinition = "TEXT")
    private String preventiveMeasures;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closure_reason")
    private String closureReason;

    // Metadata
    @Column(name = "tags", columnDefinition = "text[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private String[] tags;

    @Column(name = "custom_fields", columnDefinition = "text")
    private String customFields;

    @Column(name = "alert_data", columnDefinition = "text")
    private String alertData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_case_id")
    private Case parentCase;

    @Column(name = "related_cases", columnDefinition = "integer[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Integer[] relatedCases;

    // Relationships
    @OneToMany(mappedBy = "caseEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CaseComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "caseEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CaseActivity> activities = new ArrayList<>();

    // Enums
    public enum Severity {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }

    public enum Category {
        REVENUE_LOSS,
        NETWORK_ISSUE,
        FRAUD,
        QUALITY,
        CUSTOM
    }

    public enum CaseStatus {
        OPEN,
        ASSIGNED,
        IN_PROGRESS,
        RESOLVED,
        CLOSED,
        CANCELLED
    }

    // Helper methods
    public void addComment(CaseComment comment) {
        comments.add(comment);
        comment.setCaseEntity(this);
    }

    public void addActivity(CaseActivity activity) {
        activities.add(activity);
        activity.setCaseEntity(this);
    }

    public boolean isOpen() {
        return status == CaseStatus.OPEN || status == CaseStatus.ASSIGNED || status == CaseStatus.IN_PROGRESS;
    }

    public boolean isClosed() {
        return status == CaseStatus.CLOSED || status == CaseStatus.CANCELLED;
    }
}