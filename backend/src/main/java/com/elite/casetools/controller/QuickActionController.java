package com.elite.casetools.controller;

import com.elite.casetools.dto.MergeResult;
import com.elite.casetools.dto.QuickActionRequest;
import com.elite.casetools.dto.QuickActionResponse;
import com.elite.casetools.service.QuickActionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for quick actions on cases
 */
@RestController
@RequestMapping("/quick-actions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Quick Actions", description = "Quick action endpoints for case management")
@SecurityRequirement(name = "JWT")
public class QuickActionController {

    private final QuickActionService quickActionService;

    /**
     * Acknowledge a case
     */
    @PostMapping("/acknowledge/{caseId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Acknowledge a case", description = "Mark a case as acknowledged")
    public ResponseEntity<QuickActionResponse> acknowledgeCase(
            @PathVariable Long caseId,
            @Parameter(description = "User ID performing the action") @RequestParam Long userId,
            @Parameter(description = "Optional notes") @RequestParam(required = false) String notes) {
        
        log.info("Acknowledging case {} by user {}", caseId, userId);
        QuickActionResponse response = quickActionService.acknowledge(caseId, userId, notes);
        return ResponseEntity.ok(response);
    }

    /**
     * Mark case as false positive
     */
    @PostMapping("/false-positive/{caseId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Mark as false positive", description = "Close a case as false positive")
    public ResponseEntity<QuickActionResponse> markFalsePositive(
            @PathVariable Long caseId,
            @Parameter(description = "User ID performing the action") @RequestParam Long userId,
            @Parameter(description = "Reason for false positive") @RequestParam String reason) {
        
        log.info("Marking case {} as false positive by user {}", caseId, userId);
        QuickActionResponse response = quickActionService.markFalsePositive(caseId, userId, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * Escalate a case
     */
    @PostMapping("/escalate/{caseId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Escalate a case", description = "Escalate a case to higher priority")
    public ResponseEntity<QuickActionResponse> escalateCase(
            @PathVariable Long caseId,
            @Parameter(description = "User ID performing the action") @RequestParam Long userId,
            @Parameter(description = "Reason for escalation") @RequestParam String reason) {
        
        log.info("Escalating case {} by user {}", caseId, userId);
        QuickActionResponse response = quickActionService.escalate(caseId, userId, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * Merge multiple cases
     */
    @PostMapping("/merge")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Merge cases", description = "Merge multiple cases into a primary case")
    public ResponseEntity<MergeResult> mergeCases(
            @Parameter(description = "Primary case ID") @RequestParam Long primaryCaseId,
            @Parameter(description = "Secondary case IDs to merge") @RequestParam List<Long> secondaryCaseIds,
            @Parameter(description = "User ID performing the action") @RequestParam Long userId) {
        
        log.info("Merging {} cases into case {} by user {}", secondaryCaseIds.size(), primaryCaseId, userId);
        MergeResult result = quickActionService.mergeSimilarCases(primaryCaseId, secondaryCaseIds, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * Perform a quick action using request body
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Perform quick action", description = "Perform a quick action based on request")
    public ResponseEntity<?> performQuickAction(@RequestBody QuickActionRequest request) {
        log.info("Performing quick action: {} on case {}", request.getAction(), request.getCaseId());
        
        return switch (request.getAction().toUpperCase()) {
            case "ACKNOWLEDGE" -> ResponseEntity.ok(
                quickActionService.acknowledge(request.getCaseId(), request.getUserId(), request.getNotes())
            );
            case "FALSE_POSITIVE" -> ResponseEntity.ok(
                quickActionService.markFalsePositive(request.getCaseId(), request.getUserId(), request.getReason())
            );
            case "ESCALATE" -> ResponseEntity.ok(
                quickActionService.escalate(request.getCaseId(), request.getUserId(), request.getReason())
            );
            case "MERGE" -> ResponseEntity.ok(
                quickActionService.mergeSimilarCases(request.getCaseId(), request.getSecondaryCaseIds(), request.getUserId())
            );
            default -> ResponseEntity.badRequest().body(
                QuickActionResponse.builder()
                    .success(false)
                    .message("Invalid action: " + request.getAction())
                    .build()
            );
        };
    }
}