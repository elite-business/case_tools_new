package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Simplified entity for assigning Grafana rules to users and teams
 * This is the single source of truth for rule-based case assignments
 */
@Entity
@Table(name = "rule_assignments", schema = "casemanagement",
       uniqueConstraints = @UniqueConstraint(name = "uk_grafana_rule_uid", columnNames = "grafana_rule_uid"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleAssignment extends BaseEntity {

    @Column(name = "grafana_rule_uid", nullable = false, unique = true, length = 255)
    private String grafanaRuleUid;

    @Column(name = "grafana_rule_name", nullable = false, length = 500)
    private String grafanaRuleName;
    
    @Column(name = "grafana_folder_uid", length = 255)
    private String grafanaFolderUid;
    
    @Column(name = "grafana_folder_name", length = 255)
    private String grafanaFolderName;

    @Column(name = "datasource_uid", length = 255)
    private String datasourceUid;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "severity")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CaseSeverity severity = CaseSeverity.MEDIUM;

    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CaseCategory category = CaseCategory.OPERATIONAL;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "auto_assign_enabled")
    @Builder.Default
    private Boolean autoAssignEnabled = true;

    @Column(name = "assignment_strategy")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AssignmentStrategy assignmentStrategy = AssignmentStrategy.MANUAL;

    // Users assigned to this rule
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rule_assignment_users", 
        schema = "casemanagement",
        joinColumns = @JoinColumn(name = "rule_assignment_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> assignedUsers = new ArrayList<>();

    // Teams assigned to this rule
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rule_assignment_teams", 
        schema = "casemanagement",
        joinColumns = @JoinColumn(name = "rule_assignment_id"),
        inverseJoinColumns = @JoinColumn(name = "team_id")
    )
    @Builder.Default
    private List<Team> assignedTeams = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    // Enums aligned with Case entity
    public enum CaseSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum CaseCategory {
        REVENUE_LOSS,
        NETWORK_ISSUE,
        QUALITY_ISSUE,
        FRAUD_ALERT,
        OPERATIONAL,
        CUSTOM
    }

    public enum AssignmentStrategy {
        MANUAL,           // Admin manually assigns
        ROUND_ROBIN,      // Auto-assign in rotation
        LOAD_BASED,       // Assign to user with least cases
        TEAM_BASED        // Assign to team lead first
    }

    // Helper methods
    public void addAssignedUser(User user) {
        if (!assignedUsers.contains(user)) {
            assignedUsers.add(user);
        }
    }

    public void removeAssignedUser(User user) {
        assignedUsers.remove(user);
    }

    public void addAssignedTeam(Team team) {
        if (!assignedTeams.contains(team)) {
            assignedTeams.add(team);
        }
    }

    public void removeAssignedTeam(Team team) {
        assignedTeams.remove(team);
    }

    public boolean hasAssignments() {
        return !assignedUsers.isEmpty() || !assignedTeams.isEmpty();
    }

    public List<User> getAllAssignedUsers() {
        List<User> allUsers = new ArrayList<>(assignedUsers);
        
        // Add users from assigned teams
        for (Team team : assignedTeams) {
            if (team.getMembers() != null) {
                for (User member : team.getMembers()) {
                    if (!allUsers.contains(member)) {
                        allUsers.add(member);
                    }
                }
            }
        }
        
        return allUsers;
    }
}