package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.TeamService;
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

/**
 * REST controller for team management operations
 */
@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management endpoints")
@Slf4j
public class TeamController {

    private final TeamService teamService;

    /**
     * Get all teams with pagination
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get all teams with pagination")
    public ResponseEntity<Page<TeamResponse>> getAllTeams(
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable,
            @RequestParam(required = false) String search) {

        Page<TeamResponse> teams = teamService.getAllTeams(pageable, search);
        return ResponseEntity.ok(teams);
    }

    /**
     * Get team by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get team by ID")
    public ResponseEntity<TeamResponse> getTeamById(@PathVariable Long id) {
        TeamResponse team = teamService.getTeamById(id);
        return ResponseEntity.ok(team);
    }

    /**
     * Create new team
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create new team")
    public ResponseEntity<TeamResponse> createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication) {

        log.info("Creating new team by user: {}", authentication.getName());
        TeamResponse team = teamService.createTeam(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(team);
    }

    /**
     * Update team
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update team")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTeamRequest request,
            Authentication authentication) {

        log.info("Updating team {} by user: {}", id, authentication.getName());
        TeamResponse team = teamService.updateTeam(id, request, authentication.getName());
        return ResponseEntity.ok(team);
    }

    /**
     * Delete team
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete team")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long id,
            Authentication authentication) {

        log.info("Deleting team {} by user: {}", id, authentication.getName());
        teamService.deleteTeam(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Add member to team
     */
    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Add member to team")
    public ResponseEntity<TeamMemberResponse> addMember(
            @PathVariable Long id,
            @Valid @RequestBody AddTeamMemberRequest request,
            Authentication authentication) {

        log.info("Adding member {} to team {} with role {} by user: {}", 
                request.getUserId(), id, request.getRole(), authentication.getName());
        TeamMemberResponse member = teamService.addMember(id, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    /**
     * Remove member from team
     */
    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Remove member from team")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId,
            Authentication authentication) {

        log.info("Removing member {} from team {} by user: {}", userId, id, authentication.getName());
        teamService.removeMember(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update member role in team
     */
    @PutMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update member role in team")
    public ResponseEntity<TeamMemberResponse> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateTeamMemberRoleRequest request,
            Authentication authentication) {

        log.info("Updating member {} role to {} in team {} by user: {}", 
                userId, request.getRole(), id, authentication.getName());
        TeamMemberResponse member = teamService.updateMemberRole(id, userId, request, authentication.getName());
        return ResponseEntity.ok(member);
    }

    /**
     * Get team performance
     */
    @GetMapping("/{id}/performance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get team performance metrics")
    public ResponseEntity<TeamPerformanceResponse.TeamPerformanceData> getTeamPerformance(
            @PathVariable Long id,
            @RequestParam(required = false) String period) {

        TeamPerformanceResponse.TeamPerformanceData performance = teamService.getTeamPerformance(id, period);
        return ResponseEntity.ok(performance);
    }
}