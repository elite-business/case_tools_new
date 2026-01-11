package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
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
import java.util.Map;

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
    private final TeamRepository teamRepository;

    /**
     * Get all cases with pagination and filtering
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')")
    @Operation(summary = "Get all cases with pagination and filtering")
    public ResponseEntity<Page<CaseResponse>> getAllCases(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false, defaultValue = "false") boolean includeTeamCases,
            Authentication authentication) {
        
        CaseFilterRequest filter = CaseFilterRequest.builder()
                .status(status)
                .severity(severity)
                .category(category)
                .assignedToId(assignedToId)
                .search(search)
                .statuses(parseStatuses(status))
                .severities(parseSeverities(severity))
                .priorities(parsePriorities(priority))
                .createdAfter(parseDate(dateFrom))
                .createdBefore(parseDate(dateTo))
                .build();

        Page<Case> cases;
        if (isAdminOrManager(authentication) && !includeTeamCases) {
            cases = caseService.getCases(filter, pageable);
        } else {
            User currentUser = resolveCurrentUser(authentication);
            cases = caseService.getUserCasesFiltered(currentUser.getId(), true, filter, pageable);
        }

        Page<CaseResponse> caseResponses = cases.map(this::convertToResponse);
        return ResponseEntity.ok(caseResponses);
    }

    /**
     * Get case by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')")
    @Operation(summary = "Get case by ID")
    public ResponseEntity<CaseResponse> getCaseById(@PathVariable Long id) {
        Case caseEntity = caseService.getCaseById(id);
        CaseResponse response = convertToResponse(caseEntity);
        
        // Debug logging for assignment info
        log.info("Case {} assignment info - assignedTo field: {}", 
                caseEntity.getCaseNumber(), caseEntity.getAssignedTo());
        log.info("Case {} assignment info - parsed users: {}, teams: {}", 
                caseEntity.getCaseNumber(), response.getAssignedUsers(), response.getAssignedTeams());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Create new case
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
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
        
        // Debug: Log the assignment result
        log.info("After assignment - assignedTo field: {}", assignedCase.getAssignedTo());
        AssignmentInfo info = assignedCase.getAssignmentInfo();
        log.info("After assignment - userIds: {}, teamIds: {}", 
                info != null ? info.getUserIds() : "null", 
                info != null ? info.getTeamIds() : "null");
        
        CaseResponse response = convertToResponse(assignedCase);
        log.info("Response - assignedUsers: {}, assignedTeams: {}", 
                response.getAssignedUsers(), response.getAssignedTeams());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Assign case to team
     */
    @PostMapping("/{id}/assign-team")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assign case to team")
    public ResponseEntity<CaseResponse> assignCaseToTeam(
            @PathVariable Long id,
            @RequestBody AssignCaseToTeamRequest request,
            Authentication authentication) {
        
        log.info("Assigning case {} to team {} by: {}", id, request.getTeamId(), authentication.getName());
        Case assignedCase = caseService.assignCaseToTeam(id, request.getTeamId());
        return ResponseEntity.ok(convertToResponse(assignedCase));
    }

    /**
     * Add comment to case
     */
    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'VIEWER')")
    @Operation(summary = "Get case statistics")
    public ResponseEntity<CaseStatsResponse> getCaseStats(
            @RequestParam(required = false) String period) {
        
        LocalDateTime startDate = period != null && period.equals("30d") 
                ? LocalDateTime.now().minusDays(30) 
                : LocalDateTime.now().minusYears(1);
                
        // Get actual stats from database (returns a Map)
        @SuppressWarnings("unchecked")
        Map<String, Object> statsMap = (Map<String, Object>) caseService.getCaseStatistics(startDate);
        
        // Extract values from map with null safety
        Long openCases = statsMap.get("openCases") != null ? ((Number) statsMap.get("openCases")).longValue() : 0L;
        Long inProgressCases = statsMap.get("inProgressCases") != null ? ((Number) statsMap.get("inProgressCases")).longValue() : 0L;
        Long resolvedCases = statsMap.get("resolvedCases") != null ? ((Number) statsMap.get("resolvedCases")).longValue() : 0L;
        Long closedCases = statsMap.get("closedCases") != null ? ((Number) statsMap.get("closedCases")).longValue() : 0L;
        Long breachedCases = statsMap.get("breachedCases") != null ? ((Number) statsMap.get("breachedCases")).longValue() : 0L;
        Double avgResolutionTime = statsMap.get("avgResolutionTime") != null ? ((Number) statsMap.get("avgResolutionTime")).doubleValue() : 0.0;
        
        // Calculate total and overdue (overdue is same as breached in this context)
        Long total = openCases + inProgressCases + resolvedCases + closedCases;
        Double slaCompliance = total > 0 ? ((double) (total - breachedCases) / total) * 100.0 : 0.0;
        
        // Build response from actual data
        CaseStatsResponse response = CaseStatsResponse.builder()
                .total(total)
                .open(openCases)
                .inProgress(inProgressCases)
                .resolved(resolvedCases)
                .closed(closedCases)
                .overdue(breachedCases)  // Using breached as overdue
                .breachedSla(breachedCases)
                .averageResolutionTime(avgResolutionTime)
                .slaCompliance(slaCompliance)
                .build();
                
        return ResponseEntity.ok(response);
    }

    /**
     * Get my assigned cases
     */
    @GetMapping("/my-cases")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get current user's assigned cases")
    public ResponseEntity<List<CaseResponse>> getMyCases(
            @RequestParam(defaultValue = "false") boolean includeClosedCases,
            Authentication authentication) {
        
        User currentUser = (User) authentication.getPrincipal();
        List<Case> cases = caseService.getUserCases(currentUser.getId(), includeClosedCases);
        List<CaseResponse> caseResponses = cases.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(caseResponses);
    }

    /**
     * Get unassigned cases (Admin/Manager only)
     */
    @GetMapping("/unassigned")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get unassigned cases")
    public ResponseEntity<List<CaseResponse>> getUnassignedCases(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) Integer priority,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50, sort = "priority", direction = Sort.Direction.ASC) Pageable pageable) {
        
        List<Case> unassignedCases = caseService.getUnassignedCases(severity, priority, search);
        List<CaseResponse> caseResponses = unassignedCases.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(caseResponses);
    }

    /**
     * Count unassigned cases
     */
    @GetMapping("/unassigned/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')")
    @Operation(summary = "Count unassigned cases")
    public ResponseEntity<CountResponse> getUnassignedCasesCount() {
        Long count = caseService.getUnassignedCasesCount();
        return ResponseEntity.ok(new CountResponse(count));
    }

    /**
     * Quick action endpoint
     */
    @PostMapping("/quick-action")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Perform quick action on case")
    public ResponseEntity<QuickActionResponse> performQuickAction(
            @Valid @RequestBody QuickActionRequest request,
            Authentication authentication) {
        
        log.info("Performing quick action {} on case {} by user: {}", 
                request.getAction(), request.getCaseId(), authentication.getName());
        
        QuickActionResponse response = caseService.performQuickAction(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk assign cases
     */
    @PostMapping("/bulk/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Bulk assign cases to user")
    public ResponseEntity<BulkOperationResponse> bulkAssignCases(
            @Valid @RequestBody BulkAssignRequest request,
            Authentication authentication) {
        
        log.info("Bulk assigning {} cases to user {} by: {}", 
                request.getCaseIds().size(), request.getUserId(), authentication.getName());
        
        BulkOperationResponse response = caseService.bulkAssignCases(
                request.getCaseIds(), request.getUserId(), request.getNotes());
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk close cases
     */
    @PostMapping("/bulk/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Bulk close cases")
    public ResponseEntity<BulkOperationResponse> bulkCloseCases(
            @Valid @RequestBody BulkCloseRequest request,
            Authentication authentication) {
        
        log.info("Bulk closing {} cases by user: {}", 
                request.getCaseIds().size(), authentication.getName());
        
        BulkOperationResponse response = caseService.bulkCloseCases(
                request.getCaseIds(), request.getResolution(), request.getNotes());
        return ResponseEntity.ok(response);
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
        log.debug("Getting assigned users for case: {}, assignedTo field: {}",
                caseEntity.getCaseNumber(), caseEntity.getAssignedTo());
        
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        if (assignmentInfo == null || !assignmentInfo.hasAssignments()) {
            log.debug("No assignment info found for case: {}", caseEntity.getCaseNumber());
            return new ArrayList<>();
        }
        
        log.debug("Assignment info for case {}: userIds={}, teamIds={}", 
                caseEntity.getCaseNumber(), assignmentInfo.getUserIds(), assignmentInfo.getTeamIds());
        
        List<UserSummaryDto> assignedUsers = new ArrayList<>();
        if (assignmentInfo.getUserIds() != null) {
            for (Long userId : assignmentInfo.getUserIds()) {
                userRepository.findById(userId).ifPresent(user -> {
                    log.debug("Found user {} for case {}", user.getName(), caseEntity.getCaseNumber());
                    assignedUsers.add(UserSummaryDto.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build());
                });
            }
        }
        return assignedUsers;
    }

    /**
     * Get assigned teams for a case
     */
    private List<TeamSummaryDto> getAssignedTeams(Case caseEntity) {
        // Debug logging
        log.debug("Getting assigned teams for case: {}, assignedTo field: {}", 
                caseEntity.getCaseNumber(), caseEntity.getAssignedTo());
        
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        if (assignmentInfo == null || !assignmentInfo.hasAssignments()) {
            log.debug("No assignment info found for case: {}", caseEntity.getCaseNumber());
            return new ArrayList<>();
        }
        
        log.debug("Assignment info for case {}: userIds={}, teamIds={}", 
                caseEntity.getCaseNumber(), assignmentInfo.getUserIds(), assignmentInfo.getTeamIds());
        
        List<TeamSummaryDto> assignedTeams = new ArrayList<>();
        if (assignmentInfo.getTeamIds() != null) {
            for (Long teamId : assignmentInfo.getTeamIds()) {
                teamRepository.findById(teamId).ifPresent(team -> {
                    log.debug("Found team {} for case {}", team.getName(), caseEntity.getCaseNumber());
                    assignedTeams.add(TeamSummaryDto.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .description(team.getDescription())
                        .memberCount(team.getMemberCount())
                        .department(team.getDepartment())
                        .leadId(team.getLead() != null ? team.getLead().getId() : null)
                        .leadName(team.getLead() != null ? team.getLead().getName() : null)
                        .isActive(team.getIsActive())
                        .build());
                });
            }
        }
        return assignedTeams;
    }

    private boolean isAdminOrManager(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority().toUpperCase())
                .anyMatch(auth -> auth.equals("ROLE_ADMIN") || auth.equals("ROLE_MANAGER") || auth.equals("ADMIN") || auth.equals("MANAGER"));
    }

    private List<Case.CaseStatus> parseStatuses(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        List<Case.CaseStatus> statuses = new ArrayList<>();
        for (String value : status.split(",")) {
            try {
                statuses.add(Case.CaseStatus.valueOf(value.trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Ignoring invalid status filter: {}", value);
            }
        }
        return statuses.isEmpty() ? null : statuses;
    }

    private List<Case.Severity> parseSeverities(String severity) {
        if (severity == null || severity.isBlank()) {
            return null;
        }
        List<Case.Severity> severities = new ArrayList<>();
        for (String value : severity.split(",")) {
            try {
                severities.add(Case.Severity.valueOf(value.trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Ignoring invalid severity filter: {}", value);
            }
        }
        return severities.isEmpty() ? null : severities;
    }

    private List<Integer> parsePriorities(String priority) {
        if (priority == null || priority.isBlank()) {
            return null;
        }
        List<Integer> priorities = new ArrayList<>();
        for (String value : priority.split(",")) {
            try {
                priorities.add(Integer.parseInt(value.trim()));
            } catch (NumberFormatException e) {
                log.warn("Ignoring invalid priority filter: {}", value);
            }
        }
        return priorities.isEmpty() ? null : priorities;
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return java.time.OffsetDateTime.parse(value).toLocalDateTime();
        } catch (Exception e) {
            log.warn("Ignoring invalid date filter: {}", value);
            return null;
        }
    }

    private User resolveCurrentUser(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        return userRepository.findByLogin(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    /**
     * Resolve a case
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Resolve a case", description = "Mark a case as resolved")
    public ResponseEntity<CaseResponse> resolveCase(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String resolution = request.get("resolution");
        log.info("Resolving case {} with resolution: {}", id, resolution);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Update case status to RESOLVED
            caseEntity.setStatus(Case.CaseStatus.RESOLVED);
            caseEntity.setResolvedAt(LocalDateTime.now());
            caseEntity.setUpdatedAt(LocalDateTime.now());
            caseEntity.setResolutionActions(resolution);
            
            // Add activity
            AddCommentRequest commentRequest = new AddCommentRequest();
            commentRequest.setContent("Case resolved: " + resolution);
            commentRequest.setIsInternal(false);
            caseService.addComment(id, commentRequest);
            
            UpdateCaseRequest updateReq = new UpdateCaseRequest();
            updateReq.setStatus(caseEntity.getStatus());
            Case updatedCase = caseService.updateCase(id, updateReq);
            return ResponseEntity.ok(convertToResponse(updatedCase));
        } catch (Exception e) {
            log.error("Failed to resolve case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Reopen a case
     */
    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Reopen a case", description = "Reopen a closed or resolved case")
    public ResponseEntity<CaseResponse> reopenCase(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String reason = request.get("reason");
        log.info("Reopening case {} with reason: {}", id, reason);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Update case status to IN_PROGRESS
            caseEntity.setStatus(Case.CaseStatus.IN_PROGRESS);
            caseEntity.setResolvedAt(null);
            caseEntity.setClosedAt(null);
            caseEntity.setUpdatedAt(LocalDateTime.now());
            
            // Add activity
            AddCommentRequest reopenComment = new AddCommentRequest();
            reopenComment.setContent("Case reopened: " + reason);
            reopenComment.setIsInternal(false);
            caseService.addComment(id, reopenComment);
            
            UpdateCaseRequest updateReq = new UpdateCaseRequest();
            updateReq.setStatus(caseEntity.getStatus());
            Case updatedCase = caseService.updateCase(id, updateReq);
            return ResponseEntity.ok(convertToResponse(updatedCase));
        } catch (Exception e) {
            log.error("Failed to reopen case", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update case status
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Update case status", description = "Update the status of a case")
    public ResponseEntity<CaseResponse> updateCaseStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String status = request.get("status");
        log.info("Updating case {} status to: {}", id, status);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Map string status to enum - handle additional frontend statuses
            Case.CaseStatus newStatus;
            try {
                // Map frontend-specific statuses to backend statuses
                switch (status.toUpperCase()) {
                    case "PENDING_CUSTOMER":
                    case "PENDING_VENDOR":
                        newStatus = Case.CaseStatus.IN_PROGRESS;
                        // Store original status in description or notes if needed
                        // Since metadata field doesn't exist on Case entity
                        break;
                    default:
                        newStatus = Case.CaseStatus.valueOf(status.toUpperCase());
                        break;
                }
            } catch (IllegalArgumentException e) {
                log.error("Invalid status value: {}", status);
                return ResponseEntity.badRequest().build();
            }
            
            // Update status
            caseEntity.setStatus(newStatus);
            caseEntity.setUpdatedAt(LocalDateTime.now());
            
            // Update timestamps based on status
            if (newStatus == Case.CaseStatus.RESOLVED) {
                caseEntity.setResolvedAt(LocalDateTime.now());
            } else if (newStatus == Case.CaseStatus.CLOSED) {
                caseEntity.setClosedAt(LocalDateTime.now());
            }
            
            // Add activity  
            AddCommentRequest statusComment = new AddCommentRequest();
            statusComment.setContent("Status changed to: " + status);
            statusComment.setIsInternal(false);
            caseService.addComment(id, statusComment);
            
            UpdateCaseRequest updateReq = new UpdateCaseRequest();
            updateReq.setStatus(caseEntity.getStatus());
            Case updatedCase = caseService.updateCase(id, updateReq);
            return ResponseEntity.ok(convertToResponse(updatedCase));
        } catch (Exception e) {
            log.error("Failed to update case status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
