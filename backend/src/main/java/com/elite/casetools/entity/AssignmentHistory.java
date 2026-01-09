package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity to track complete audit trail of case assignments
 * Tracks who handled what and when for accountability
 */
@Entity
@Table(name = "assignment_history", schema = "casemanagement",
       indexes = {
           @Index(name = "idx_assignment_history_case", columnList = "case_id"),
           @Index(name = "idx_assignment_history_assigned_at", columnList = "assigned_at"),
           @Index(name = "idx_assignment_history_assigned_by", columnList = "assigned_by")
       })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user")
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user")
    private User toUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_team")
    private Team fromTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_team")
    private Team toTeam;

    @Column(name = "assignment_reason", nullable = false)
    @Enumerated(EnumType.STRING)
    private AssignmentReason reason;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Workload snapshot at time of assignment for analytics
    @Column(name = "from_user_open_cases")
    private Integer fromUserOpenCases;

    @Column(name = "to_user_open_cases")
    private Integer toUserOpenCases;

    @Column(name = "from_team_open_cases")
    private Integer fromTeamOpenCases;

    @Column(name = "to_team_open_cases")
    private Integer toTeamOpenCases;

    /**
     * Reason for assignment change
     */
    public enum AssignmentReason {
        INITIAL,           // First assignment from rule
        MANUAL,            // Manual reassignment by user/admin
        WORKLOAD_BALANCE,  // Automatic load balancing
        ESCALATION,        // Escalated to higher level
        SHIFT_CHANGE,      // Shift handover
        UNAVAILABLE,       // User became unavailable
        AUTO_ASSIGN,       // Automatic assignment by rule
        TEAM_ROTATION      // Team rotation policy
    }

    /**
     * Helper methods for creating assignment history records
     */
    public static AssignmentHistory createInitialAssignment(Case caseEntity, User assignedTo, 
                                                           User assignedBy, String notes) {
        return AssignmentHistory.builder()
                .caseEntity(caseEntity)
                .toUser(assignedTo)
                .reason(AssignmentReason.INITIAL)
                .assignedAt(LocalDateTime.now())
                .assignedBy(assignedBy)
                .notes(notes)
                .build();
    }

    public static AssignmentHistory createTeamAssignment(Case caseEntity, Team assignedToTeam, 
                                                        User assignedBy, String notes) {
        return AssignmentHistory.builder()
                .caseEntity(caseEntity)
                .toTeam(assignedToTeam)
                .reason(AssignmentReason.INITIAL)
                .assignedAt(LocalDateTime.now())
                .assignedBy(assignedBy)
                .notes(notes)
                .build();
    }

    public static AssignmentHistory createReassignment(Case caseEntity, User fromUser, User toUser, 
                                                      User assignedBy, AssignmentReason reason, String notes) {
        return AssignmentHistory.builder()
                .caseEntity(caseEntity)
                .fromUser(fromUser)
                .toUser(toUser)
                .reason(reason)
                .assignedAt(LocalDateTime.now())
                .assignedBy(assignedBy)
                .notes(notes)
                .build();
    }

    public static AssignmentHistory createEscalation(Case caseEntity, User fromUser, Team toTeam, 
                                                    User escalatedBy, String reason) {
        return AssignmentHistory.builder()
                .caseEntity(caseEntity)
                .fromUser(fromUser)
                .toTeam(toTeam)
                .reason(AssignmentReason.ESCALATION)
                .assignedAt(LocalDateTime.now())
                .assignedBy(escalatedBy)
                .notes("Escalated: " + reason)
                .build();
    }

    // Helper methods for display
    public String getAssignmentDescription() {
        StringBuilder desc = new StringBuilder();
        
        if (fromUser != null || fromTeam != null) {
            desc.append("Reassigned from ");
            if (fromUser != null) {
                desc.append(fromUser.getName());
            }
            if (fromTeam != null) {
                desc.append(" (").append(fromTeam.getName()).append(")");
            }
            desc.append(" to ");
        } else {
            desc.append("Assigned to ");
        }
        
        if (toUser != null) {
            desc.append(toUser.getName());
        }
        if (toTeam != null) {
            desc.append(" (").append(toTeam.getName()).append(")");
        }
        
        return desc.toString();
    }

    public boolean isInitialAssignment() {
        return fromUser == null && fromTeam == null;
    }

    public boolean isReassignment() {
        return !isInitialAssignment();
    }
}