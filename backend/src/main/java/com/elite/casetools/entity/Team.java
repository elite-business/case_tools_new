package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Team entity representing organizational teams
 * Maps to casemanagement.team table
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
    @JoinColumn(name = "leader_id")
    private User leader;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "specialization", length = 100)
    private String specialization;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "team_members",
        schema = "casemanagement",
        joinColumns = @JoinColumn(name = "team_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> members = new ArrayList<>();

    public void addMember(User member) {
        members.add(member);
    }

    public void removeMember(User member) {
        members.remove(member);
    }
}