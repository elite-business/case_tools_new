package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.exception.ResourceNotFoundException;
import com.elite.casetools.repository.CaseRepository;
import com.elite.casetools.repository.TeamRepository;
import com.elite.casetools.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for case management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CaseService {

    private final CaseRepository caseRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final QuickActionService quickActionService;
    private final TeamRepository teamRepository;

    @Value("${application.alert.duplicate-window-minutes:5}")
    private int duplicateWindowMinutes;

    @Value("${application.alert.auto-assign:true}")
    private boolean autoAssign;

    @Value("${application.case.auto-close-resolved:true}")
    private boolean autoCloseResolved;

    /**
     * Create a new case
     */
    public Case createCase(CreateCaseRequest request) {
        log.info("Creating new case: {}", request.getTitle());

        // Generate case number
        String caseNumber = caseRepository.generateNextCaseNumber();

        Case caseEntity = Case.builder()
                .caseNumber(caseNumber)
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .priority(request.getPriority())
                .category(request.getCategory())
                .status(Case.CaseStatus.OPEN)
                .alertId(request.getAlertId())
                .grafanaAlertId(request.getGrafanaAlertId())
                .grafanaAlertUid(request.getGrafanaAlertUid())
                .affectedServices(request.getAffectedServices())
                .affectedCustomers(request.getAffectedCustomers())
                .estimatedLoss(request.getEstimatedLoss())
                .tags(request.getTags())
                .customFields(request.getCustomFields())
                .build();

        // Calculate SLA deadline based on priority/severity
        caseEntity.setSlaDeadline(calculateSlaDeadline(
                request.getSeverity(),
                request.getPriority(),
                LocalDateTime.now()
        ));

        // Auto-assign if enabled
        if (autoAssign && request.getAssignedToId() == null) {
            autoAssignCase(caseEntity);
        } else if (request.getAssignedToId() != null) {
            assignCaseToUser(caseEntity, request.getAssignedToId());
        }

        Case savedCase = caseRepository.save(caseEntity);

        // Add creation activity
        addActivity(savedCase, CaseActivity.ActivityType.CREATED, null, null, null, "Case created");

        // Send notifications
        notificationService.sendCaseCreatedNotifications(savedCase);
        if (savedCase.getAssignedTo() != null) {
            notificationService.notifyCaseAssigned(savedCase);
        }

        return savedCase;
    }

    /**
     * Create case from Grafana webhook
     */
    public Case createCaseFromWebhook(GrafanaWebhookRequest webhookRequest) {
        log.info("Creating case from Grafana webhook: {}", webhookRequest.getAlertName());

        // Check for duplicates
        Optional<Case> existingCase = findDuplicateCase(webhookRequest.getFingerprint());
        if (existingCase.isPresent()) {
            log.info("Duplicate alert detected, returning existing case: {}", existingCase.get().getCaseNumber());
            return existingCase.get();
        }

        CreateCaseRequest request = CreateCaseRequest.builder()
                .title(webhookRequest.getAlertName())
                .description(webhookRequest.getMessage())
                .severity(mapSeverity(webhookRequest.getSeverity()))
                .priority(mapPriority(webhookRequest.getSeverity()))
                .category(determineCategory(webhookRequest.getLabels()))
                .grafanaAlertId(webhookRequest.getAlertId())
                .grafanaAlertUid(webhookRequest.getFingerprint())
                .customFields(webhookRequest.getLabels())
                .build();

        return createCase(request);
    }

    /**
     * Update case
     */
    public Case updateCase(Long caseId, UpdateCaseRequest request) {
        log.info("Updating case: {}", caseId);

        Case caseEntity = getCaseById(caseId);
        String oldStatus = caseEntity.getStatus().toString();

        // Update fields
        if (request.getTitle() != null) {
            caseEntity.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            caseEntity.setDescription(request.getDescription());
        }
        if (request.getSeverity() != null) {
            Case.Severity oldSeverity = caseEntity.getSeverity();
            caseEntity.setSeverity(request.getSeverity());
            if (oldSeverity != request.getSeverity()) {
                // Recalculate SLA if severity changed
                caseEntity.setSlaDeadline(calculateSlaDeadline(
                        request.getSeverity(),
                        caseEntity.getPriority(),
                        caseEntity.getCreatedAt()
                ));
            }
        }
        if (request.getPriority() != null) {
            Integer oldPriority = caseEntity.getPriority();
            caseEntity.setPriority(request.getPriority());
            if (oldPriority == null || !oldPriority.equals(request.getPriority())) {
                // Recalculate SLA if priority changed
                caseEntity.setSlaDeadline(calculateSlaDeadline(
                        caseEntity.getSeverity(),
                        request.getPriority(),
                        caseEntity.getCreatedAt()
                ));
            }
        }
        if (request.getStatus() != null) {
            updateCaseStatus(caseEntity, request.getStatus());
        }
        if (request.getRootCause() != null) {
            caseEntity.setRootCause(request.getRootCause());
        }
        if (request.getResolutionActions() != null) {
            caseEntity.setResolutionActions(request.getResolutionActions());
        }
        if (request.getActualLoss() != null) {
            caseEntity.setActualLoss(BigDecimal.valueOf(request.getActualLoss()));
        }

        Case savedCase = caseRepository.save(caseEntity);

        // Add update activity
        if (!oldStatus.equals(savedCase.getStatus().toString())) {
            addActivity(savedCase, CaseActivity.ActivityType.UPDATED, "status", oldStatus, 
                       savedCase.getStatus().toString(), "Status changed");
        }

        return savedCase;
    }

    /**
     * Assign case to user
     */
    public Case assignCase(Long caseId, Long userId) {
        log.info("Assigning case {} to user {}", caseId, userId);

        Case caseEntity = getCaseById(caseId);
        
        // Get previous assignee names for activity logging
        AssignmentInfo previousAssignment = caseEntity.getAssignmentInfo();
        String oldValue = "Unassigned";
        if (previousAssignment.hasAssignments()) {
            List<String> assigneeNames = new ArrayList<>();
            for (Long prevUserId : previousAssignment.getUserIds()) {
                userRepository.findById(prevUserId).ifPresent(user -> assigneeNames.add(user.getName()));
            }
            oldValue = String.join(", ", assigneeNames);
        }

        assignCaseToUser(caseEntity, userId);
        
        if (caseEntity.getStatus() == Case.CaseStatus.OPEN) {
            caseEntity.setStatus(Case.CaseStatus.ASSIGNED);
        }

        Case savedCase = caseRepository.save(caseEntity);

        // Add assignment activity
        User newAssignee = userRepository.findById(userId).orElse(null);
        String newValue = newAssignee != null ? newAssignee.getName() : "Unknown User";
        addActivity(savedCase, CaseActivity.ActivityType.ASSIGNED, "assignedTo", oldValue, newValue, 
                   "Case assigned to " + newValue);

        // Send notifications
        notificationService.notifyCaseAssigned(savedCase);

        return savedCase;
    }

    /**
     * Assign case to team
     */
    public Case assignCaseToTeam(Long caseId, Long teamId) {
        log.info("Assigning case {} to team {}", caseId, teamId);

        Case caseEntity = getCaseById(caseId);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        
        // Get previous assignee names for activity logging
        AssignmentInfo previousAssignment = caseEntity.getAssignmentInfo();
        String oldValue = "Unassigned";
        if (previousAssignment.hasAssignments()) {
            List<String> assigneeNames = new ArrayList<>();
            for (Long prevUserId : previousAssignment.getUserIds()) {
                userRepository.findById(prevUserId).ifPresent(user -> assigneeNames.add(user.getName()));
            }
            for (Long prevTeamId : previousAssignment.getTeamIds()) {
                teamRepository.findById(prevTeamId).ifPresent(prevTeam -> assigneeNames.add("Team: " + prevTeam.getName()));
            }
            oldValue = String.join(", ", assigneeNames);
        }

        // Create assignment info with the team
        AssignmentInfo assignmentInfo = new AssignmentInfo();
        assignmentInfo.addTeam(teamId);
        
        log.debug("Created AssignmentInfo with teamIds: {}", assignmentInfo.getTeamIds());
        
        caseEntity.setAssignmentInfo(assignmentInfo);
        caseEntity.setAssignedAt(LocalDateTime.now());
        
        if (caseEntity.getStatus() == Case.CaseStatus.OPEN) {
            caseEntity.setStatus(Case.CaseStatus.ASSIGNED);
        }

        Case savedCase = caseRepository.save(caseEntity);

        // Add assignment activity
        String newValue = "Team: " + team.getName();
        addActivity(savedCase, CaseActivity.ActivityType.ASSIGNED, "assignedTo", oldValue, newValue, 
                   "Case assigned to " + newValue);

        // Send notifications to team members
        notificationService.notifyCaseAssigned(savedCase);

        return savedCase;
    }

    /**
     * Add comment to case
     */
    public CaseComment addComment(Long caseId, AddCommentRequest request) {
        log.info("Adding comment to case: {}", caseId);

        Case caseEntity = getCaseById(caseId);
        User user = getCurrentUser();

        CaseComment comment = CaseComment.builder()
                .caseEntity(caseEntity)
                .user(user)
                .comment(request.getComment())
                .commentType(parseCommentType(request.getCommentType()))
                .isInternal(request.getIsInternal())
                .attachments(convertAttachmentsToJson(request.getAttachments()))
                .build();

        caseEntity.addComment(comment);
        caseRepository.save(caseEntity);

        // Add comment activity
        addActivity(caseEntity, CaseActivity.ActivityType.COMMENTED, null, null, null, 
                   "Comment added by " + user.getName());

        return comment;
    }

    /**
     * Close case
     */
    public Case closeCase(Long caseId, CloseCaseRequest request) {
        log.info("Closing case: {}", caseId);

        Case caseEntity = getCaseById(caseId);
        User user = getCurrentUser();

        caseEntity.setStatus(Case.CaseStatus.CLOSED);
        caseEntity.setClosedAt(LocalDateTime.now());
        caseEntity.setClosedBy(user);
        caseEntity.setClosureReason(request.getClosureReason());
        caseEntity.setRootCause(request.getRootCause());
        caseEntity.setResolutionActions(request.getResolutionActions());
        caseEntity.setPreventiveMeasures(request.getPreventiveMeasures());
        caseEntity.setActualLoss(request.getActualLoss() != null ? BigDecimal.valueOf(request.getActualLoss()) : null);

        // Calculate resolution time
        if (caseEntity.getCreatedAt() != null) {
            long minutes = java.time.Duration.between(caseEntity.getCreatedAt(), LocalDateTime.now()).toMinutes();
            caseEntity.setResolutionTimeMinutes((int) minutes);
        }

        Case savedCase = caseRepository.save(caseEntity);

        // Add close activity
        addActivity(savedCase, CaseActivity.ActivityType.CLOSED, null, null, null, 
                   "Case closed: " + request.getClosureReason());

        return savedCase;
    }

    /**
     * Resolve case from webhook
     */
    public Optional<Case> resolveFromWebhook(String grafanaAlertId) {
        log.info("Resolving case from webhook: {}", grafanaAlertId);

        Optional<Case> caseOpt = caseRepository.findByGrafanaAlertId(grafanaAlertId);
        
        caseOpt.ifPresent(caseEntity -> {
            if (caseEntity.isOpen()) {
                caseEntity.setStatus(Case.CaseStatus.RESOLVED);
                caseEntity.setResolvedAt(LocalDateTime.now());
                
                // Auto-close if configured
                if (autoCloseResolved) {
                    CloseCaseRequest closeRequest = CloseCaseRequest.builder()
                            .closureReason("Auto-closed: Alert resolved in Grafana")
                            .build();
                    closeCase(caseEntity.getId(), closeRequest);
                } else {
                    caseRepository.save(caseEntity);
                    addActivity(caseEntity, CaseActivity.ActivityType.RESOLVED, null, null, null, 
                               "Alert resolved in Grafana");
                }
            }
        });

        return caseOpt;
    }

    /**
     * Get case by ID
     */
    @Transactional(readOnly = true)
    public Case getCaseById(Long caseId) {
        return caseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseId));
    }

    /**
     * Get case by case number
     */
    @Transactional(readOnly = true)
    public Case getCaseByCaseNumber(String caseNumber) {
        return caseRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseNumber));
    }

    /**
     * Get cases with filtering and pagination
     */
    @Transactional(readOnly = true)
    public Page<Case> getCases(CaseFilterRequest filter, Pageable pageable) {
        Specification<Case> spec = buildSpecification(filter);
        return caseRepository.findAll(spec, pageable);
    }

    /**
     * Get cases for a specific user (including team assignments) with filters.
     */
    @Transactional(readOnly = true)
    public Page<Case> getUserCasesFiltered(Long userId, boolean includeClosedCases, CaseFilterRequest filter, Pageable pageable) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Pageable unSorted = org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return caseRepository.findCasesByUserOrTeamAssignmentFiltered(
                userId,
                includeClosedCases,
                filter.getStatus(),
                filter.getSeverity(),
                filter.getPriorities() != null && !filter.getPriorities().isEmpty()
                        ? filter.getPriorities().stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse(null)
                        : null,
                filter.getCategory(),
                filter.getSearch(),
                filter.getCreatedAfter(),
                filter.getCreatedBefore(),
                unSorted
        );
    }

    /**
     * Get cases assigned to user (including team assignments)
     */
    @Transactional(readOnly = true)
    public Page<Case> getUserCases(Long userId, Pageable pageable) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        return caseRepository.findCasesByUserOrTeamAssignment(userId, false, pageable);
    }

    /**
     * Get case statistics
     */
    @Transactional(readOnly = true)
    public Object getCaseStatistics(LocalDateTime startDate) {
        return caseRepository.getCaseStatistics(startDate);
    }

    /**
     * Check and update SLA breaches
     */
    public void checkSlaBreaches() {
        int updated = caseRepository.updateSlaBreaches(LocalDateTime.now());
        if (updated > 0) {
            log.info("Updated {} cases with SLA breach", updated);
            
            // Notify about breached cases
            List<Case> breachedCases = caseRepository.findSlaBreachedCases();
            breachedCases.forEach(notificationService::notifySlaBreached);
        }
    }

    // Helper methods
    public void assignCaseToUser(Case caseEntity, Long userId) {
        log.debug("Starting assignCaseToUser for case {} and user {}", caseEntity.getCaseNumber(), userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        log.debug("Found user: {} ({})", user.getName(), user.getLogin());
        
        // Create assignment info with the user
        AssignmentInfo assignmentInfo = new AssignmentInfo();
        assignmentInfo.addUser(userId);
        
        log.debug("Created AssignmentInfo with userIds: {}", assignmentInfo.getUserIds());
        
        caseEntity.setAssignmentInfo(assignmentInfo);
        
        // Verify the assignment was set correctly
        AssignmentInfo verifyInfo = caseEntity.getAssignmentInfo();
        log.debug("Verified AssignmentInfo after setting - userIds: {}, hasAssignments: {}", 
                verifyInfo.getUserIds(), verifyInfo.hasAssignments());
        
        log.debug("Raw assignedTo JSON after setting: {}", caseEntity.getAssignedTo());
        
        caseEntity.setAssignedAt(LocalDateTime.now());
        caseEntity.setAssignedBy(getCurrentUser());
        
        log.debug("Completed assignCaseToUser for case {}", caseEntity.getCaseNumber());
    }

    public User autoAssignCase(Case caseEntity) {
        Optional<User> userOpt = userRepository.findUserWithLeastActiveCases();
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Create assignment info with the user
            AssignmentInfo assignmentInfo = new AssignmentInfo();
            assignmentInfo.addUser(user.getId());
            caseEntity.setAssignmentInfo(assignmentInfo);
            
            caseEntity.setAssignedAt(LocalDateTime.now());
            caseEntity.setStatus(Case.CaseStatus.ASSIGNED);
            log.info("Auto-assigned case to user: {}", user.getName());
            return user;
        }
        return null;
    }

    public LocalDateTime calculateSlaDeadline(Case.Severity severity, Integer priority, LocalDateTime referenceTime) {
        // Prefer priority-based SLA if available, otherwise fall back to severity.
        int hours;
        if (priority != null) {
            hours = switch (priority) {
                case 1 -> 4;   // Urgent
                case 2 -> 8;   // High
                case 3 -> 24;  // Medium
                case 4 -> 72;  // Low
                default -> 24;
            };
        } else {
            hours = switch (severity) {
                case CRITICAL -> 4;
                case HIGH -> 8;
                case MEDIUM -> 24;
                case LOW -> 72;
            };
        }
        LocalDateTime baseTime = referenceTime != null ? referenceTime : LocalDateTime.now();
        return baseTime.plusHours(hours);
    }

    private Optional<Case> findDuplicateCase(String fingerprint) {
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(duplicateWindowMinutes);
        List<Case> duplicates = caseRepository.findDuplicateCases(fingerprint, windowStart);
        return duplicates.isEmpty() ? Optional.empty() : Optional.of(duplicates.get(0));
    }

    private void updateCaseStatus(Case caseEntity, Case.CaseStatus newStatus) {
        Case.CaseStatus oldStatus = caseEntity.getStatus();
        caseEntity.setStatus(newStatus);

        if (newStatus == Case.CaseStatus.RESOLVED && caseEntity.getResolvedAt() == null) {
            caseEntity.setResolvedAt(LocalDateTime.now());
        } else if (newStatus == Case.CaseStatus.CLOSED && caseEntity.getClosedAt() == null) {
            caseEntity.setClosedAt(LocalDateTime.now());
            caseEntity.setClosedBy(getCurrentUser());
        }
    }

    private void addActivity(Case caseEntity, CaseActivity.ActivityType type, String fieldName, 
                             String oldValue, String newValue, String description) {
        CaseActivity activity = CaseActivity.builder()
                .caseEntity(caseEntity)
                .user(getCurrentUser())
                .activityType(type)
                .fieldName(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .description(description)
                .build();
        
        caseEntity.addActivity(activity);
    }

    private Case.Severity mapSeverity(String severity) {
        return switch (severity.toLowerCase()) {
            case "critical" -> Case.Severity.CRITICAL;
            case "high" -> Case.Severity.HIGH;
            case "medium" -> Case.Severity.MEDIUM;
            default -> Case.Severity.LOW;
        };
    }

    private int mapPriority(String severity) {
        return switch (severity.toLowerCase()) {
            case "critical" -> 1;
            case "high" -> 2;
            case "medium" -> 3;
            default -> 4;
        };
    }

    private Case.Category determineCategory(String labels) {
        // Logic to determine category from labels
        if (labels.contains("revenue")) return Case.Category.REVENUE_LOSS;
        if (labels.contains("network")) return Case.Category.NETWORK_ISSUE;
        if (labels.contains("fraud")) return Case.Category.FRAUD;
        if (labels.contains("quality")) return Case.Category.QUALITY;
        return Case.Category.CUSTOM;
    }

    private Specification<Case> buildSpecification(CaseFilterRequest filter) {
        Specification<Case> spec = Specification.where(null);

        if (filter == null) {
            return spec;
        }

        if (filter.getStatuses() != null && !filter.getStatuses().isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("status").in(filter.getStatuses()));
        }

        if (filter.getSeverities() != null && !filter.getSeverities().isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("severity").in(filter.getSeverities()));
        }

        if (filter.getPriorities() != null && !filter.getPriorities().isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("priority").in(filter.getPriorities()));
        }

        if (filter.getCategory() != null && !filter.getCategory().isBlank()) {
            try {
                Case.Category category = Case.Category.valueOf(filter.getCategory().toUpperCase());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
            } catch (IllegalArgumentException ignored) {
                log.warn("Ignoring invalid category filter: {}", filter.getCategory());
            }
        }

        if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
            String like = "%" + filter.getSearch().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("caseNumber")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like)
            ));
        }

        if (filter.getCreatedAfter() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getCreatedAfter()));
        }

        if (filter.getCreatedBefore() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), filter.getCreatedBefore()));
        }

        if (filter.getAssignedToId() != null) {
            String userIdToken = "\"userIds\":";
            String like = "%" + userIdToken + "%"+ filter.getAssignedToId() + "%";
            spec = spec.and((root, query, cb) -> cb.like(root.get("assignedTo"), like));
        }

        return spec;
    }

    private User getCurrentUser() {
        try {
            org.springframework.security.core.context.SecurityContext context = 
                org.springframework.security.core.context.SecurityContextHolder.getContext();
            org.springframework.security.core.Authentication authentication = context.getAuthentication();
            
            if (authentication != null && authentication.isAuthenticated() && 
                !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
                
                // If the principal is our User entity (from UserDetailsService)
                if (authentication.getPrincipal() instanceof User) {
                    return (User) authentication.getPrincipal();
                }
                
                // If the principal is a string username, find the user
                if (authentication.getPrincipal() instanceof String) {
                    String username = (String) authentication.getPrincipal();
                    return userRepository.findByLogin(username).orElse(null);
                }
            }
            
            log.warn("No authenticated user found in SecurityContext");
            return null;
        } catch (Exception e) {
            log.error("Error getting current user from SecurityContext: {}", e.getMessage());
            return null;
        }
    }

    private CaseComment.CommentType parseCommentType(String commentType) {
        if (commentType == null) {
            return CaseComment.CommentType.USER;
        }
        try {
            return CaseComment.CommentType.valueOf(commentType.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid comment type: {}, defaulting to USER", commentType);
            return CaseComment.CommentType.USER;
        }
    }

    private String convertAttachmentsToJson(java.util.List<String> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(attachments);
        } catch (Exception e) {
            log.warn("Failed to convert attachments to JSON: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Get user cases with option to include closed
     */
    public List<Case> getUserCases(Long userId, boolean includeClosedCases) {
        log.debug("Getting cases for user ID: {}, includeClosedCases: {}", userId, includeClosedCases);
        
        org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.Pageable.unpaged();
        Page<Case> cases = caseRepository.findCasesByUserOrTeamAssignment(userId, includeClosedCases, pageable);
        return cases.getContent();
    }

    /**
     * Get unassigned cases
     */
    public List<Case> getUnassignedCases(String severity, Integer priority, String search) {
        log.debug("Getting unassigned cases with filters - severity: {}, priority: {}, search: {}", 
                severity, priority, search);
        
        org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(0, 100, 
                        org.springframework.data.domain.Sort.by("priority").ascending()
                            .and(org.springframework.data.domain.Sort.by("createdAt").descending()));
        
        Page<Case> unassignedPage = caseRepository.findUnassignedCases(pageable);
        List<Case> unassignedCases = unassignedPage.getContent();
        
        // Apply additional filters
        return unassignedCases.stream()
                .filter(c -> severity == null || c.getSeverity().name().equalsIgnoreCase(severity))
                .filter(c -> priority == null || c.getPriority().equals(priority))
                .filter(c -> search == null || 
                        c.getTitle().toLowerCase().contains(search.toLowerCase()) ||
                        c.getCaseNumber().toLowerCase().contains(search.toLowerCase()) ||
                        (c.getDescription() != null && c.getDescription().toLowerCase().contains(search.toLowerCase())))
                .toList();
    }

    /**
     * Count unassigned cases
     */
    public Long getUnassignedCasesCount() {
        return caseRepository.countUnassignedCases();
    }

    /**
     * Perform quick action on a case - delegates to QuickActionService for full implementation
     */
    public QuickActionResponse performQuickAction(QuickActionRequest request) {
        log.info("Performing quick action {} on case {}", request.getAction(), request.getCaseId());
        
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }
        
        // Delegate ALL quick actions to QuickActionService for proper implementation with notifications and activity tracking
        return switch (request.getAction()) {
            case "ACKNOWLEDGE" -> 
                quickActionService.acknowledge(request.getCaseId(), currentUser.getId(), request.getNotes());
            case "FALSE_POSITIVE" -> 
                quickActionService.markFalsePositive(request.getCaseId(), currentUser.getId(), request.getReason());
            case "ESCALATE" -> 
                quickActionService.escalate(request.getCaseId(), currentUser.getId(), request.getReason());
            case "MERGE" -> {
                // Handle merge with proper target case IDs
                List<Long> targetCaseIds = request.getSecondaryCaseIds() != null ? 
                    request.getSecondaryCaseIds() : List.of();
                
                if (targetCaseIds.isEmpty()) {
                    yield QuickActionResponse.builder()
                        .success(false)
                        .action(request.getAction())
                        .caseId(request.getCaseId())
                        .message("No target cases provided for merge")
                        .performedBy(currentUser.getName())
                        .performedAt(LocalDateTime.now())
                        .build();
                }
                
                MergeResult mergeResult = quickActionService.mergeSimilarCases(
                    request.getCaseId(), targetCaseIds, currentUser.getId());
                
                yield QuickActionResponse.builder()
                    .success(true)
                    .action("MERGE")
                    .caseId(request.getCaseId())
                    .caseNumber(mergeResult.getPrimaryCase() != null ? mergeResult.getPrimaryCase().getCaseNumber() : null)
                    .message("Merged " + mergeResult.getMergedCount() + " case(s)")
                    .performedBy(currentUser.getName())
                    .performedAt(LocalDateTime.now())
                    .build();
            }
            default -> throw new IllegalArgumentException("Unknown action: " + request.getAction());
        };
    }

    /**
     * Bulk assign cases to a user
     */
    public BulkOperationResponse bulkAssignCases(List<Long> caseIds, Long userId, String notes) {
        log.info("Bulk assigning {} cases to user {}", caseIds.size(), userId);
        
        User assignee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        List<String> successfulCases = new ArrayList<>();
        List<BulkOperationResponse.BulkOperationError> errors = new ArrayList<>();
        
        for (Long caseId : caseIds) {
            try {
                Case caseEntity = getCaseById(caseId);
                
                // Create assignment info
                AssignmentInfo assignmentInfo = new AssignmentInfo();
                assignmentInfo.addUser(userId);
                
                caseEntity.setAssignmentInfo(assignmentInfo);
                caseEntity.setAssignedAt(LocalDateTime.now());
                caseEntity.setStatus(Case.CaseStatus.ASSIGNED);
                
                caseRepository.save(caseEntity);
                successfulCases.add(caseEntity.getCaseNumber());
                
            } catch (Exception e) {
                errors.add(BulkOperationResponse.BulkOperationError.builder()
                        .caseId(caseId)
                        .error(e.getMessage())
                        .build());
            }
        }
        
        if (errors.isEmpty()) {
            return BulkOperationResponse.success(successfulCases.size(), successfulCases);
        } else {
            return BulkOperationResponse.mixed(successfulCases.size(), errors.size(), successfulCases, errors);
        }
    }

    /**
     * Bulk close cases
     */
    public BulkOperationResponse bulkCloseCases(List<Long> caseIds, String resolution, String notes) {
        log.info("Bulk closing {} cases", caseIds.size());
        
        List<String> successfulCases = new ArrayList<>();
        List<BulkOperationResponse.BulkOperationError> errors = new ArrayList<>();
        
        for (Long caseId : caseIds) {
            try {
                Case caseEntity = getCaseById(caseId);
                
                caseEntity.setStatus(Case.CaseStatus.CLOSED);
                caseEntity.setClosureReason(resolution);
                caseEntity.setClosedAt(LocalDateTime.now());
                caseEntity.setResolutionActions(notes);
                
                caseRepository.save(caseEntity);
                successfulCases.add(caseEntity.getCaseNumber());
                
            } catch (Exception e) {
                errors.add(BulkOperationResponse.BulkOperationError.builder()
                        .caseId(caseId)
                        .error(e.getMessage())
                        .build());
            }
        }
        
        if (errors.isEmpty()) {
            return BulkOperationResponse.success(successfulCases.size(), successfulCases);
        } else {
            return BulkOperationResponse.mixed(successfulCases.size(), errors.size(), successfulCases, errors);
        }
    }

    public Case assignCaseToUser(Long caseId, Long userId) {
        return assignCase(caseId, userId);
    }
}
