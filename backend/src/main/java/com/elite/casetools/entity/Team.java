package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Team entity for grouping users
 * Maps to teams.team table
 */
@Entity
@Table(name = "team", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Team extends BaseEntity {

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lead_id")
    private User lead;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "team_member",
        schema = "casemanagement",
        joinColumns = @JoinColumn(name = "team_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> members = new ArrayList<>();

    // Helper methods
    public void addMember(User user) {
        if (!members.contains(user)) {
            members.add(user);
        }
    }

    public void removeMember(User user) {
        members.remove(user);
    }

    public int getMemberCount() {
        return members != null ? members.size() : 0;
    }

    public boolean hasMember(User user) {
        return members != null && members.contains(user);
    }

    public boolean isLead(User user) {
        return lead != null && lead.equals(user);
    }
}