package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.SystemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for system management operations
 */
@RestController
@RequestMapping("/system")
@RequiredArgsConstructor
@Tag(name = "System", description = "System management endpoints")
@Slf4j
public class SystemController {

    private final SystemService systemService;

    /**
     * Get system health status
     */
    @GetMapping("/health")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get system health status")
    public ResponseEntity<SystemHealthResponse> getHealth() {
        SystemHealthResponse health = systemService.getSystemHealth();
        return ResponseEntity.ok(health);
    }

    /**
     * Get system settings
     */
    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system settings")
    public ResponseEntity<Page<SystemSettingResponse>> getSettings(
            @PageableDefault(size = 50, sort = "category", direction = Sort.Direction.ASC) Pageable pageable,
            @RequestParam(required = false) String category) {

        Page<SystemSettingResponse> settings = systemService.getSettings(pageable, category);
        return ResponseEntity.ok(settings);
    }

    /**
     * Update system setting
     */
    @PutMapping("/settings/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update system setting")
    public ResponseEntity<SystemSettingResponse> updateSetting(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSystemSettingRequest request,
            Authentication authentication) {

        log.info("Updating system setting {} by user: {}", id, authentication.getName());
        SystemSettingResponse setting = systemService.updateSetting(id, request, authentication.getName());
        return ResponseEntity.ok(setting);
    }

    /**
     * Get email settings
     */
    @GetMapping("/settings/email")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get email settings")
    public ResponseEntity<EmailSettingsResponse> getEmailSettings() {
        EmailSettingsResponse emailSettings = systemService.getEmailSettings();
        return ResponseEntity.ok(emailSettings);
    }

    /**
     * Update email settings
     */
    @PutMapping("/settings/email")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update email settings")
    public ResponseEntity<EmailSettingsResponse> updateEmailSettings(
            @Valid @RequestBody UpdateEmailSettingsRequest request,
            Authentication authentication) {

        log.info("Updating email settings by user: {}", authentication.getName());
        EmailSettingsResponse settings = systemService.updateEmailSettings(request, authentication.getName());
        return ResponseEntity.ok(settings);
    }

    /**
     * Test email connection
     */
    @PostMapping("/settings/email/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Test email connection")
    public ResponseEntity<TestConnectionResponse> testEmailConnection(
            Authentication authentication) {

        log.info("Testing email connection by user: {}", authentication.getName());
        TestConnectionResponse result = systemService.testEmailConnection();
        return ResponseEntity.ok(result);
    }

    /**
     * Get system logs
     */
    @GetMapping("/logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system logs")
    public ResponseEntity<Page<SystemLogResponse>> getLogs(
            @PageableDefault(size = 100, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String component,
            @RequestParam(required = false) String search) {

        Page<SystemLogResponse> logs = systemService.getLogs(pageable, level, component, search);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get system statistics
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get system statistics")
    public ResponseEntity<SystemStatsResponse> getSystemStats() {
        SystemStatsResponse stats = systemService.getSystemStats();
        return ResponseEntity.ok(stats);
    }
}