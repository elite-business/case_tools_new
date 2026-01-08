package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.service.CaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * REST controller for case management operations
 */
@RestController
@RequestMapping("/cases")
@RequiredArgsConstructor
@Tag(name = "Cases", description = "Case management endpoints")
@Slf4j
public class CaseController {

    private final CaseService caseService;
    private final UserRepository userRepository;

    /**
     * Get all cases with pagination and filtering
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get all cases with pagination and filtering")
    public ResponseEntity<Page<CaseResponse>> getAllCases(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String search) {
        
        CaseFilterRequest filter = CaseFilterRequest.builder()
                .status(status)
                .severity(severity)
                .category(category)
                .assignedToId(assignedToId)
                .search(search)
                .build();
        
        Page<Case> cases = caseService.getCases(filter, pageable);
        Page<CaseResponse> caseResponses = cases.map(this::convertToResponse);
        return ResponseEntity.ok(caseResponses);
    }

    /**
     * Get case by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get case by ID")
    public ResponseEntity<CaseResponse> getCaseById(@PathVariable Long id) {
        Case caseEntity = caseService.getCaseById(id);
        return ResponseEntity.ok(convertToResponse(caseEntity));
    }

    /**
     * Create new case
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Create new case")
    public ResponseEntity<CaseResponse> createCase(
            @Valid @RequestBody CreateCaseRequest request,
            Authentication authentication) {
        
        log.info("Creating new case by user: {}", authentication.getName());
        Case newCase = caseService.createCase(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(newCase));
    }

    /**
     * Update case
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Update case")
    public ResponseEntity<CaseResponse> updateCase(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCaseRequest request,
            Authentication authentication) {
        
        log.info("Updating case {} by user: {}", id, authentication.getName());
        Case updatedCase = caseService.updateCase(id, request);
        return ResponseEntity.ok(convertToResponse(updatedCase));
    }

    /**
     * Assign case to user
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assign case to user")
    public ResponseEntity<CaseResponse> assignCase(
            @PathVariable Long id,
            @RequestBody AssignCaseRequest request,
            Authentication authentication) {
        
        log.info("Assigning case {} to user {} by: {}", id, request.getUserId(), authentication.getName());
        Case assignedCase = caseService.assignCase(id, request.getUserId());
        return ResponseEntity.ok(convertToResponse(assignedCase));
    }

    /**
     * Add comment to case
     */
    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Add comment to case")
    public ResponseEntity<CaseCommentResponse> addComment(
            @PathVariable Long id,
            @RequestBody AddCommentRequest request,
            Authentication authentication) {
        
        log.info("Adding comment to case {} by user: {}", id, authentication.getName());
        CaseComment comment = caseService.addComment(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertCommentToResponse(comment));
    }

    /**
     * Get case comments
     */
    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get case comments")
    public ResponseEntity<List<CaseCommentResponse>> getCaseComments(@PathVariable Long id) {
        Case caseEntity = caseService.getCaseById(id);
        List<CaseCommentResponse> comments = caseEntity.getComments().stream()
                .map(this::convertCommentToResponse)
                .toList();
        return ResponseEntity.ok(comments);
    }

    /**
     * Get case activities
     */
    @GetMapping("/{id}/activities")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get case activities")
    public ResponseEntity<List<CaseActivityResponse>> getCaseActivities(@PathVariable Long id) {
        Case caseEntity = caseService.getCaseById(id);
        List<CaseActivityResponse> activities = caseEntity.getActivities().stream()
                .map(this::convertActivityToResponse)
                .toList();
        return ResponseEntity.ok(activities);
    }

    /**
     * Close case
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Close case")
    public ResponseEntity<CaseResponse> closeCase(
            @PathVariable Long id,
            @Valid @RequestBody CloseCaseRequest request,
            Authentication authentication) {
        
        log.info("Closing case {} by user: {}", id, authentication.getName());
        Case closedCase = caseService.closeCase(id, request);
        return ResponseEntity.ok(convertToResponse(closedCase));
    }

    /**
     * Get case statistics
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Get case statistics")
    public ResponseEntity<CaseStatsResponse> getCaseStats(
            @RequestParam(required = false) String period) {
        
        LocalDateTime startDate = period != null && period.equals("30d") 
                ? LocalDateTime.now().minusDays(30) 
                : LocalDateTime.now().minusYears(1);
                
        // Get actual stats from service
        caseService.getCaseStatistics(startDate);
        
        // Mock response - implement proper stats calculation in service
        CaseStatsResponse response = CaseStatsResponse.builder()
                .total(100L)
                .open(25L)
                .inProgress(30L)
                .resolved(20L)
                .closed(25L)
                .overdue(5L)
                .breachedSla(3L)
                .build();
                
        return ResponseEntity.ok(response);
    }

    /**
     * Get my assigned cases
     */
    @GetMapping("/my-cases")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get current user's assigned cases")
    public ResponseEntity<Page<CaseResponse>> getMyCases(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        
        User currentUser = (User) authentication.getPrincipal();
        Page<Case> cases = caseService.getUserCases(currentUser.getId(), pageable);
        Page<CaseResponse> caseResponses = cases.map(this::convertToResponse);
        return ResponseEntity.ok(caseResponses);
    }

    // Helper methods

    private CaseResponse convertToResponse(Case caseEntity) {
        return CaseResponse.builder()
                .id(caseEntity.getId())
                .caseNumber(caseEntity.getCaseNumber())
                .title(caseEntity.getTitle())
                .description(caseEntity.getDescription())
                .status(caseEntity.getStatus().name())
                .severity(caseEntity.getSeverity().name())
                .priority(caseEntity.getPriority())
                .category(caseEntity.getCategory().name())
                .assignedUsers(getAssignedUsers(caseEntity))
                .assignedTeams(getAssignedTeams(caseEntity))
                .assignedBy(caseEntity.getAssignedBy() != null ?
                    UserSummaryDto.builder()
                        .id(caseEntity.getAssignedBy().getId())
                        .name(caseEntity.getAssignedBy().getName())
                        .email(caseEntity.getAssignedBy().getEmail())
                        .build() : null)
                .createdAt(caseEntity.getCreatedAt())
                .updatedAt(caseEntity.getUpdatedAt())
                .assignedAt(caseEntity.getAssignedAt())
                .resolvedAt(caseEntity.getResolvedAt())
                .closedAt(caseEntity.getClosedAt())
                .slaDeadline(caseEntity.getSlaDeadline())
                .slaBreached(caseEntity.getSlaBreached())
                .rootCause(caseEntity.getRootCause())
                .resolutionActions(caseEntity.getResolutionActions())
                .preventiveMeasures(caseEntity.getPreventiveMeasures())
                .closureReason(caseEntity.getClosureReason())
                .estimatedLoss(caseEntity.getEstimatedLoss())
                .actualLoss(caseEntity.getActualLoss())
                .affectedServices(caseEntity.getAffectedServices())
                .affectedCustomers(caseEntity.getAffectedCustomers())
                .tags(caseEntity.getTags() != null ? java.util.Arrays.asList(caseEntity.getTags()) : null)
                .customFields(caseEntity.getCustomFields())
                .alertId(caseEntity.getAlertId())
                .grafanaAlertId(caseEntity.getGrafanaAlertId())
                .grafanaAlertUid(caseEntity.getGrafanaAlertUid())
                .resolutionTimeMinutes(caseEntity.getResolutionTimeMinutes())
                .build();
    }

    private CaseCommentResponse convertCommentToResponse(CaseComment comment) {
        return CaseCommentResponse.builder()
                .id(comment.getId())
                .comment(comment.getComment())
                .commentType(comment.getCommentType().name())
                .isInternal(comment.getIsInternal())
                .user(UserSummaryDto.builder()
                    .id(comment.getUser().getId())
                    .name(comment.getUser().getName())
                    .email(comment.getUser().getEmail())
                    .build())
                .createdAt(comment.getCreatedAt())
                .attachments(comment.getAttachments())
                .build();
    }

    private CaseActivityResponse convertActivityToResponse(CaseActivity activity) {
        return CaseActivityResponse.builder()
                .id(activity.getId())
                .activityType(activity.getActivityType().name())
                .fieldName(activity.getFieldName())
                .oldValue(activity.getOldValue())
                .newValue(activity.getNewValue())
                .description(activity.getDescription())
                .user(UserSummaryDto.builder()
                    .id(activity.getUser().getId())
                    .name(activity.getUser().getName())
                    .email(activity.getUser().getEmail())
                    .build())
                .createdAt(activity.getCreatedAt())
                .build();
    }

    /**
     * Get assigned users for a case
     */
    private List<UserSummaryDto> getAssignedUsers(Case caseEntity) {
        if (caseEntity.getAssignmentInfo() == null || !caseEntity.getAssignmentInfo().hasAssignments()) {
            return new ArrayList<>();
        }
        
        List<UserSummaryDto> assignedUsers = new ArrayList<>();
        for (Long userId : caseEntity.getAssignmentInfo().getUserIds()) {
            userRepository.findById(userId).ifPresent(user -> 
                assignedUsers.add(UserSummaryDto.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .build())
            );
        }
        return assignedUsers;
    }

    /**
     * Get assigned teams for a case
     */
    private List<TeamSummaryDto> getAssignedTeams(Case caseEntity) {
        if (caseEntity.getAssignmentInfo() == null || !caseEntity.getAssignmentInfo().hasAssignments()) {
            return new ArrayList<>();
        }
        
        List<TeamSummaryDto> assignedTeams = new ArrayList<>();
        // TODO: Implement team lookup when Team entity is available
        // For now, return empty list as teams are not yet implemented
        return assignedTeams;
    }
}