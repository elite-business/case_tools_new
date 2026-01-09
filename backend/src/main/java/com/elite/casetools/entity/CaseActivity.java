package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Case activity entity for audit trail
 * Maps to cases.case_activity table
 */
@Entity
@Table(name = "case_activity", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseActivity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "activity_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ActivityType activityType;

    @Column(name = "field_name")
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "performed_by_id")
    private User performedBy;

    @Column(name = "performed_at")
    private java.time.LocalDateTime performedAt;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    public enum ActivityType {
        CREATED,
        ASSIGNED,
        UPDATED,
        COMMENTED,
        RESOLVED,
        CLOSED,
        REOPENED,
        ESCALATED,
        STATUS_CHANGE,
        MERGED
    }
}