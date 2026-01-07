package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.User;
import com.elite.casetools.service.RuleAssignmentService;
import com.elite.casetools.service.UserService;
import com.elite.casetools.service.GrafanaService;
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

import java.util.List;
import java.util.Map;

/**
 * Controller for managing Grafana rule assignments
 */
@RestController
@RequestMapping("/rule-assignments")
@RequiredArgsConstructor
@Tag(name = "Rule Assignments", description = "Grafana rule assignment management")
@Slf4j
public class RuleAssignmentController {

    private final RuleAssignmentService ruleAssignmentService;
    private final UserService userService;
    private final GrafanaService grafanaService;

    /**
     * Get all rule assignments with pagination and filtering
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get rule assignments with filtering")
    public ResponseEntity<Page<RuleAssignmentResponse>> getRuleAssignments(
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        Page<RuleAssignmentResponse> assignments = ruleAssignmentService.getRuleAssignments(
                search, active, pageable, currentUser);
        
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get Grafana rules that can be assigned
     */
    @GetMapping("/grafana-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get available Grafana rules for assignment")
    public ResponseEntity<List<GrafanaRuleInfo>> getGrafanaRules() {
        List<GrafanaRuleInfo> rules = grafanaService.getAllRulesInfo();
        return ResponseEntity.ok(rules);
    }

    /**
     * Create or update rule assignment for a Grafana rule
     */
    @PutMapping("/grafana-rule/{grafanaRuleUid}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create or update rule assignment")
    public ResponseEntity<RuleAssignmentResponse> createOrUpdateRuleAssignment(
            @PathVariable String grafanaRuleUid,
            @Valid @RequestBody CreateRuleAssignmentRequest request,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        RuleAssignmentResponse response = ruleAssignmentService.createOrUpdateRuleAssignment(
                grafanaRuleUid, request, currentUser);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get rule assignment by Grafana UID
     */
    @GetMapping("/grafana-rule/{grafanaRuleUid}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get rule assignment by Grafana UID")
    public ResponseEntity<RuleAssignmentResponse> getRuleAssignmentByGrafanaUid(
            @PathVariable String grafanaRuleUid) {
        
        try {
            RuleAssignmentResponse response = ruleAssignmentService.getRuleAssignmentByGrafanaUid(grafanaRuleUid);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Rule assignment not found for Grafana UID: {}", grafanaRuleUid);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Assign users and teams to a rule
     */
    @PostMapping("/grafana-rule/{grafanaRuleUid}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assign users and teams to a rule")
    public ResponseEntity<RuleAssignmentResponse> assignUsersAndTeams(
            @PathVariable String grafanaRuleUid,
            @Valid @RequestBody AssignRuleRequest request,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        RuleAssignmentResponse response = ruleAssignmentService.assignUsersAndTeams(
                grafanaRuleUid, request, currentUser);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Remove assignments from a rule
     */
    @DeleteMapping("/grafana-rule/{grafanaRuleUid}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Remove assignments from a rule")
    public ResponseEntity<RuleAssignmentResponse> removeAssignments(
            @PathVariable String grafanaRuleUid,
            @Valid @RequestBody RemoveRuleAssignmentsRequest request,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        RuleAssignmentResponse response = ruleAssignmentService.removeAssignments(
                grafanaRuleUid, request, currentUser);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get rule assignments for current user
     */
    @GetMapping("/my-assignments")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get rule assignments for current user")
    public ResponseEntity<List<RuleAssignmentResponse>> getMyRuleAssignments(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<RuleAssignmentResponse> assignments = ruleAssignmentService.getRuleAssignmentsForUser(currentUser);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Sync rule assignments from Grafana
     */
    @PostMapping("/sync-from-grafana")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sync rule assignments from Grafana")
    public ResponseEntity<Map<String, String>> syncFromGrafana(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        
        try {
            ruleAssignmentService.syncRuleAssignmentsFromGrafana();
            return ResponseEntity.ok(Map.of(
                "message", "Rule assignments synced successfully",
                "syncedBy", currentUser.getLogin(),
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to sync rule assignments from Grafana", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to sync rule assignments: " + e.getMessage()));
        }
    }

    /**
     * Get assignment statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get rule assignment statistics")
    public ResponseEntity<Map<String, Object>> getAssignmentStatistics() {
        // This would be implemented to return assignment statistics
        return ResponseEntity.ok(Map.of(
                "totalRules", 0,
                "assignedRules", 0,
                "unassignedRules", 0,
                "totalAssignments", 0
        ));
    }

    private User getCurrentUser(Authentication authentication) {
        return userService.findByUsername(authentication.getName());
    }
}