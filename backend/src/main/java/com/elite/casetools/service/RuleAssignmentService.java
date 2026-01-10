package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.*;
import com.elite.casetools.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing rule assignments
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RuleAssignmentService {

    private final RuleAssignmentRepository ruleAssignmentRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final GrafanaService grafanaService;
    private final NotificationService notificationService;
    private final RoleBasedAccessService roleBasedAccessService;

    /**
     * Get all rule assignments with pagination and filtering
     */
    @Transactional(readOnly = true)
    public Page<RuleAssignmentResponse> getRuleAssignments(
            String search, 
            Boolean active, 
            Pageable pageable, 
            User currentUser) {
        
        log.info("Getting rule assignments for user: {} with search: {}", 
                 currentUser.getLogin(), search);
        
        Page<RuleAssignment> assignments;
        
        if (roleBasedAccessService.isAdmin(currentUser) || roleBasedAccessService.isManager(currentUser)) {
            // Admins and managers see all assignments
            assignments = ruleAssignmentRepository.findWithSearch(search, active, pageable);
        } else {
            // Regular users see only assignments they're part of
            List<RuleAssignment> userAssignments = ruleAssignmentRepository.findByUserAssignment(currentUser);
            // Convert to page manually for simplicity - in production, create proper query
            assignments = new org.springframework.data.domain.PageImpl<>(userAssignments, pageable, userAssignments.size());
        }
        
        return assignments.map(this::mapToResponse);
    }

    /**
     * Create or update rule assignment from Grafana rule
     */
    public RuleAssignmentResponse createOrUpdateRuleAssignment(
            String grafanaRuleUid,
            CreateRuleAssignmentRequest request,
            User currentUser) {
        
        log.info("Creating/updating rule assignment for Grafana rule: {} by user: {}", 
                 grafanaRuleUid, currentUser.getLogin());

        RuleAssignment assignment = ruleAssignmentRepository.findByGrafanaRuleUid(grafanaRuleUid)
                .orElse(RuleAssignment.builder()
                        .grafanaRuleUid(grafanaRuleUid)
                        .active(true)
                        .autoAssignEnabled(true)
                        .assignmentStrategy(RuleAssignment.AssignmentStrategy.MANUAL)
                        .severity(RuleAssignment.CaseSeverity.MEDIUM)
                        .category(RuleAssignment.CaseCategory.OPERATIONAL)
                        .createdBy(currentUser)
                        .build());

        // Update fields from request
        assignment.setGrafanaRuleName(request.getRuleName());
        assignment.setGrafanaFolderUid(request.getFolderUid());
        assignment.setGrafanaFolderName(request.getFolderName());
        assignment.setDatasourceUid(request.getDatasourceUid());
        assignment.setDescription(request.getDescription());
        assignment.setSeverity(parseSeverity(request.getSeverity()));
        assignment.setCategory(parseCategory(request.getCategory()));
        assignment.setAssignmentStrategy(parseAssignmentStrategy(request.getAssignmentStrategy()));
        assignment.setAutoAssignEnabled(request.getAutoAssignEnabled());
        assignment.setActive(request.getActive());
        assignment.setUpdatedBy(currentUser);

        RuleAssignment savedAssignment = ruleAssignmentRepository.save(assignment);
        
        log.info("Created/updated rule assignment with ID: {} for rule: {}", 
                 savedAssignment.getId(), grafanaRuleUid);

        return mapToResponse(savedAssignment);
    }

    /**
     * Assign users and teams to a rule
     */
    public RuleAssignmentResponse assignUsersAndTeams(
            String grafanaRuleUid,
            AssignRuleRequest request,
            User currentUser) {
        
        log.info("Assigning users and teams to rule: {} by user: {}", 
                 grafanaRuleUid, currentUser.getLogin());

        RuleAssignment assignment = ruleAssignmentRepository.findByGrafanaRuleUid(grafanaRuleUid)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Rule assignment not found for Grafana rule: " + grafanaRuleUid));

        // Add users
        if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
            for (Long userId : request.getUserIds()) {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
                assignment.addAssignedUser(user);
            }
        }

        // Add teams
        if (request.getTeamIds() != null && !request.getTeamIds().isEmpty()) {
            for (Long teamId : request.getTeamIds()) {
                Team team = teamRepository.findById(teamId)
                        .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
                assignment.addAssignedTeam(team);
            }
        }

        assignment.setUpdatedBy(currentUser);
        RuleAssignment savedAssignment = ruleAssignmentRepository.save(assignment);

        // Send notifications
        notifyAssignmentUpdate(savedAssignment, "Rule assignment updated");

        return mapToResponse(savedAssignment);
    }

    /**
     * Remove users and teams from a rule assignment
     */
    public RuleAssignmentResponse removeAssignments(
            String grafanaRuleUid,
            RemoveRuleAssignmentsRequest request,
            User currentUser) {
        
        RuleAssignment assignment = ruleAssignmentRepository.findByGrafanaRuleUid(grafanaRuleUid)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Rule assignment not found for Grafana rule: " + grafanaRuleUid));

        // Remove users
        if (request.getUserIds() != null) {
            request.getUserIds().forEach(userId -> {
                userRepository.findById(userId).ifPresent(assignment::removeAssignedUser);
            });
        }

        // Remove teams
        if (request.getTeamIds() != null) {
            request.getTeamIds().forEach(teamId -> {
                teamRepository.findById(teamId).ifPresent(assignment::removeAssignedTeam);
            });
        }

        assignment.setUpdatedBy(currentUser);
        RuleAssignment savedAssignment = ruleAssignmentRepository.save(assignment);

        return mapToResponse(savedAssignment);
    }

    /**
     * Get rule assignment by Grafana UID
     */
    @Transactional(readOnly = true)
    public RuleAssignmentResponse getRuleAssignmentByGrafanaUid(String grafanaRuleUid) {
        RuleAssignment assignment = ruleAssignmentRepository.findByGrafanaRuleUid(grafanaRuleUid)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Rule assignment not found for Grafana rule: " + grafanaRuleUid));
        
        return mapToResponse(assignment);
    }

    /**
     * Get assignments for user (directly assigned or via team)
     */
    @Transactional(readOnly = true)
    public List<RuleAssignmentResponse> getRuleAssignmentsForUser(User user) {
        List<RuleAssignment> assignments = ruleAssignmentRepository.findByUserAssignment(user);
        return assignments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Determine assigned user for a case from rule assignment
     */
    @Transactional(readOnly = true)
    public User determineAssignedUser(String grafanaRuleUid) {
        RuleAssignment assignment = ruleAssignmentRepository.findByGrafanaRuleUid(grafanaRuleUid)
                .orElse(null);

        if (assignment == null || !assignment.getActive() || !assignment.hasAssignments()) {
            return null;
        }

        List<User> availableUsers = assignment.getAllAssignedUsers();
        if (availableUsers.isEmpty()) {
            return null;
        }

        // Apply assignment strategy
        return switch (assignment.getAssignmentStrategy()) {
            case ROUND_ROBIN -> getNextUserRoundRobin(availableUsers);
            case LOAD_BASED -> getUserWithLeastCases(availableUsers);
            case TEAM_BASED -> getTeamLeadOrFirstAvailable(assignment);
            default -> availableUsers.get(0); // Manual - just pick first
        };
    }

    /**
     * Sync rule assignments from Grafana
     */
    public void syncRuleAssignmentsFromGrafana() {
        log.info("Syncing rule assignments from Grafana");
        
        try {
            // Get rules from Grafana
            List<GrafanaRuleInfo> grafanaRules = grafanaService.getAllRulesInfo();
            
            for (GrafanaRuleInfo ruleInfo : grafanaRules) {
                // Create assignment if doesn't exist
                if (!ruleAssignmentRepository.existsByGrafanaRuleUid(ruleInfo.getUid())) {
                    RuleAssignment newAssignment = RuleAssignment.builder()
                            .grafanaRuleUid(ruleInfo.getUid())
                            .grafanaRuleName(ruleInfo.getTitle())
                            .grafanaFolderUid(ruleInfo.getFolderUID())
                            .grafanaFolderName(ruleInfo.getFolderTitle())
                            .description("Auto-synced from Grafana")
                            .active(true)
                            .build();
                    
                    ruleAssignmentRepository.save(newAssignment);
                    log.info("Created new rule assignment for: {}", ruleInfo.getTitle());
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to sync rule assignments from Grafana", e);
        }
    }

    // Helper methods

    private RuleAssignmentResponse mapToResponse(RuleAssignment assignment) {
        return RuleAssignmentResponse.builder()
                .id(assignment.getId())
                .grafanaRuleUid(assignment.getGrafanaRuleUid())
                .grafanaRuleName(assignment.getGrafanaRuleName())
                .grafanaFolderUid(assignment.getGrafanaFolderUid())
                .grafanaFolderName(assignment.getGrafanaFolderName())
                .datasourceUid(assignment.getDatasourceUid())
                .description(assignment.getDescription())
                .severity(assignment.getSeverity() != null ? assignment.getSeverity().name() : null)
                .category(assignment.getCategory() != null ? assignment.getCategory().name() : null)
                .active(assignment.getActive())
                .autoAssignEnabled(assignment.getAutoAssignEnabled())
                .assignmentStrategy(assignment.getAssignmentStrategy() != null ? 
                                  assignment.getAssignmentStrategy().name() : null)
                .assignedUsers(assignment.getAssignedUsers().stream()
                        .map(this::mapUserToSummary)
                        .collect(Collectors.toList()))
                .assignedTeams(assignment.getAssignedTeams().stream()
                        .map(this::mapTeamToSummary)
                        .collect(Collectors.toList()))
                .assignedUserCount(assignment.getAssignedUsers().size())
                .assignedTeamCount(assignment.getAssignedTeams().size())
                .totalAssignedUsers(assignment.getAllAssignedUsers().size())
                .createdBy(assignment.getCreatedBy() != null ? 
                          mapUserToSummary(assignment.getCreatedBy()) : null)
                .updatedBy(assignment.getUpdatedBy() != null ? 
                          mapUserToSummary(assignment.getUpdatedBy()) : null)
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }

    private UserSummaryDto mapUserToSummary(User user) {
        return UserSummaryDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .login(user.getLogin())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .department(user.getDepartment())
                .build();
    }

    private TeamSummaryDto mapTeamToSummary(Team team) {
        return TeamSummaryDto.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .memberCount(team.getMembers() != null ? team.getMembers().size() : 0)
                .department(team.getDepartment())
                .leadId(team.getLead() != null ? team.getLead().getId() : null)
                .leadName(team.getLead() != null ? team.getLead().getName() : null)
                .isActive(team.getIsActive())
                .build();
    }

    private RuleAssignment.CaseSeverity parseSeverity(String severity) {
        if (severity == null) return RuleAssignment.CaseSeverity.MEDIUM;
        try {
            return RuleAssignment.CaseSeverity.valueOf(severity.toUpperCase());
        } catch (IllegalArgumentException e) {
            return RuleAssignment.CaseSeverity.MEDIUM;
        }
    }

    private RuleAssignment.CaseCategory parseCategory(String category) {
        if (category == null) return RuleAssignment.CaseCategory.OPERATIONAL;
        try {
            return RuleAssignment.CaseCategory.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            return RuleAssignment.CaseCategory.OPERATIONAL;
        }
    }

    private RuleAssignment.AssignmentStrategy parseAssignmentStrategy(String strategy) {
        if (strategy == null) return RuleAssignment.AssignmentStrategy.MANUAL;
        try {
            return RuleAssignment.AssignmentStrategy.valueOf(strategy.toUpperCase());
        } catch (IllegalArgumentException e) {
            return RuleAssignment.AssignmentStrategy.MANUAL;
        }
    }

    private User getNextUserRoundRobin(List<User> users) {
        // Simple round-robin - in production, store last assigned index
        return users.get((int) (System.currentTimeMillis() % users.size()));
    }

    private User getUserWithLeastCases(List<User> users) {
        // Simplified - in production, query actual case counts
        return users.get(0);
    }

    private User getTeamLeadOrFirstAvailable(RuleAssignment assignment) {
        // Try to get team lead first
        for (Team team : assignment.getAssignedTeams()) {
            if (team.getLead() != null) {
                return team.getLead();
            }
        }
        
        // Fall back to first user
        List<User> allUsers = assignment.getAllAssignedUsers();
        return allUsers.isEmpty() ? null : allUsers.get(0);
    }

    private void notifyAssignmentUpdate(RuleAssignment assignment, String message) {
        try {
            for (User user : assignment.getAllAssignedUsers()) {
                notificationService.sendNotification(user, 
                    "Rule Assignment Update", 
                    message + ": " + assignment.getGrafanaRuleName(),
                    "RULE_ASSIGNMENT_UPDATE");
            }
        } catch (Exception e) {
            log.error("Failed to send assignment notifications", e);
        }
    }
}