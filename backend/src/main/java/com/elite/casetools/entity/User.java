package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User entity representing system users
 * Maps to casemanagement.userlogin table
 */
@Entity
@Table(name = "userlogin", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity implements UserDetails {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "login", unique = true, nullable = false)
    private String login;

    @Column(name = "mail")
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "matricule")
    private String matricule;

    @Column(name = "etat")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "department")
    private String department;

    @Column(name = "phone")
    private String phone;

    // Permissions
    @Column(name = "domaine_control")
    @Builder.Default
    private Boolean domainControl = false;

    @Column(name = "revunue_stream")
    @Builder.Default
    private Boolean revenueStream = false;

    @Column(name = "historique_alert")
    @Builder.Default
    private Boolean historiqueAlert = false;

    @Column(name = "admin_add")
    @Builder.Default
    private Boolean adminAdd = false;

    @Column(name = "ra_rule")
    @Builder.Default
    private Boolean raRule = false;

    @Column(name = "stat")
    @Builder.Default
    private Boolean stat = false;

    @Column(name = "assigned_to")
    @Builder.Default
    private Boolean assignedTo = false;

    @Column(name = "re_assigned_to")
    @Builder.Default
    private Boolean reAssignedTo = false;

    @Column(name = "closed")
    @Builder.Default
    private Boolean closed = false;

    // Authentication
    @Column(name = "auth_token", length = 500)
    private String authToken;

    @Column(name = "token_expiration")
    private LocalDateTime tokenExpiration;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "failed_login_attempts")
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "account_locked_until")
    private LocalDateTime accountLockedUntil;

    @Column(name = "notification_preferences", columnDefinition = "TEXT")
    private String notificationPreferences;

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        
        if (role != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        }
        
        // Add permission-based authorities
        if (Boolean.TRUE.equals(adminAdd)) {
            authorities.add(new SimpleGrantedAuthority("PERMISSION_ADMIN"));
        }
        if (Boolean.TRUE.equals(raRule)) {
            authorities.add(new SimpleGrantedAuthority("PERMISSION_RULE_MANAGE"));
        }
        if (Boolean.TRUE.equals(domainControl)) {
            authorities.add(new SimpleGrantedAuthority("PERMISSION_DOMAIN_CONTROL"));
        }
        
        return authorities;
    }

    @Override
    public String getUsername() {
        return login;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        if (accountLockedUntil == null) {
            return true;
        }
        return LocalDateTime.now().isAfter(accountLockedUntil);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED
    }

    public enum UserRole {
        ADMIN,
        MANAGER,
        SENIOR_ANALYST,
        ANALYST,
        VIEWER
    }
}