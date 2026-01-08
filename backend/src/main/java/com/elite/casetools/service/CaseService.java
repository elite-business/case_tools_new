package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.exception.ResourceNotFoundException;
import com.elite.casetools.repository.CaseRepository;
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

        // Calculate SLA deadline based on severity
        caseEntity.setSlaDeadline(calculateSlaDeadline(request.getSeverity()));

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
                caseEntity.setSlaDeadline(calculateSlaDeadline(request.getSeverity()));
            }
        }
        if (request.getPriority() != null) {
            caseEntity.setPriority(request.getPriority());
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
     * Get cases assigned to user
     */
    @Transactional(readOnly = true)
    public Page<Case> getUserCases(Long userId, Pageable pageable) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return caseRepository.findByAssignedTo(user, pageable);
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

    private void assignCaseToUser(Case caseEntity, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        // Create assignment info with the user
        AssignmentInfo assignmentInfo = new AssignmentInfo();
        assignmentInfo.addUser(userId);
        caseEntity.setAssignmentInfo(assignmentInfo);
        
        caseEntity.setAssignedAt(LocalDateTime.now());
        caseEntity.setAssignedBy(getCurrentUser());
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

    public LocalDateTime calculateSlaDeadline(Case.Severity severity) {
        int minutes = switch (severity) {
            case CRITICAL -> 15;
            case HIGH -> 60;
            case MEDIUM -> 240;
            case LOW -> 1440;
        };
        return LocalDateTime.now().plusMinutes(minutes);
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
        // Build JPA specification from filter
        return Specification.where(null);
    }

    private User getCurrentUser() {
        // Get from SecurityContext - placeholder for now
        return userRepository.findById(1L).orElse(null);
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
}