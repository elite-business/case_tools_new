package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.GrafanaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Grafana integration operations
 */
@RestController
@RequestMapping("/grafana")
@RequiredArgsConstructor
@Tag(name = "Grafana", description = "Grafana integration endpoints")
@Slf4j
public class GrafanaController {

    private final GrafanaService grafanaService;

    /**
     * Get Grafana settings
     */
    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get Grafana settings")
    public ResponseEntity<GrafanaSettingsResponse> getSettings() {
        GrafanaSettingsResponse settings = grafanaService.getGrafanaSettings();
        return ResponseEntity.ok(settings);
    }

    /**
     * Update Grafana settings
     */
    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update Grafana settings")
    public ResponseEntity<GrafanaSettingsResponse> updateSettings(
            @Valid @RequestBody UpdateGrafanaSettingsRequest request,
            Authentication authentication) {

        log.info("Updating Grafana settings by user: {}", authentication.getName());
        GrafanaSettingsResponse settings = grafanaService.updateGrafanaSettings(request, authentication.getName());
        return ResponseEntity.ok(settings);
    }

    /**
     * Test Grafana connection
     */
    @PostMapping("/test-connection")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Test Grafana connection")
    public ResponseEntity<TestConnectionResponse> testConnection(
            @RequestBody(required = false) TestGrafanaConnectionRequest request,
            Authentication authentication) {

        log.info("Testing Grafana connection by user: {}", authentication.getName());
        TestConnectionResponse result = grafanaService.testGrafanaConnection(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Sync with Grafana
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sync with Grafana")
    public ResponseEntity<GrafanaSyncResponse> sync(Authentication authentication) {
        log.info("Syncing with Grafana by user: {}", authentication.getName());
        GrafanaSyncResponse result = grafanaService.syncWithGrafana();
        return ResponseEntity.ok(result);
    }

    /**
     * Get Grafana dashboards
     */
    @GetMapping("/dashboards")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get Grafana dashboards")
    public ResponseEntity<List<GrafanaDashboardResponse>> getDashboards() {
        List<GrafanaDashboardResponse> dashboards = grafanaService.getGrafanaDashboards();
        return ResponseEntity.ok(dashboards);
    }

    /**
     * Sync specific dashboard
     */
    @PostMapping("/dashboards/{uid}/sync")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sync specific dashboard")
    public ResponseEntity<GrafanaSyncResponse> syncDashboard(
            @PathVariable String uid,
            Authentication authentication) {

        log.info("Syncing Grafana dashboard {} by user: {}", uid, authentication.getName());
        GrafanaSyncResponse result = grafanaService.syncDashboard(uid);
        return ResponseEntity.ok(result);
    }

    /**
     * Get Grafana connection status
     */
    @GetMapping("/connection-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get Grafana connection status")
    public ResponseEntity<GrafanaConnectionStatusResponse> getConnectionStatus() {
        GrafanaConnectionStatusResponse status = grafanaService.getGrafanaConnectionStatus();
        return ResponseEntity.ok(status);
    }

    /**
     * Get all Grafana alert rules
     */
    @GetMapping("/alert-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get all Grafana alert rules")
    public ResponseEntity<List<GrafanaAlertRuleResponse>> getAlertRules() {
        log.info("Fetching Grafana alert rules");
        List<GrafanaAlertRuleResponse> rules = grafanaService.getAlertRules();
        return ResponseEntity.ok(rules);
    }

    /**
     * Get a specific Grafana alert rule
     */
    @GetMapping("/alert-rules/{uid}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get a specific Grafana alert rule")
    public ResponseEntity<GrafanaAlertRuleResponse> getAlertRule(@PathVariable String uid) {
        log.info("Fetching Grafana alert rule: {}", uid);
        GrafanaAlertRuleResponse rule = grafanaService.getAlertRule(uid);
        return ResponseEntity.ok(rule);
    }

    /**
     * Create a new Grafana alert rule
     */
    @PostMapping("/alert-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new Grafana alert rule")
    public ResponseEntity<GrafanaAlertRuleResponse> createAlertRule(
            @Valid @RequestBody CreateGrafanaAlertRuleRequest request,
            Authentication authentication) {
        log.info("Creating Grafana alert rule by user: {}", authentication.getName());
        GrafanaAlertRuleResponse rule = grafanaService.createAlertRule(request, authentication.getName());
        return ResponseEntity.ok(rule);
    }

    /**
     * Update an existing Grafana alert rule
     */
    @PutMapping("/alert-rules/{uid}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update an existing Grafana alert rule")
    public ResponseEntity<GrafanaAlertRuleResponse> updateAlertRule(
            @PathVariable String uid,
            @Valid @RequestBody UpdateGrafanaAlertRuleRequest request,
            Authentication authentication) {
        log.info("Updating Grafana alert rule {} by user: {}", uid, authentication.getName());
        GrafanaAlertRuleResponse rule = grafanaService.updateAlertRule(uid, request, authentication.getName());
        return ResponseEntity.ok(rule);
    }

    /**
     * Delete a Grafana alert rule
     */
    @DeleteMapping("/alert-rules/{uid}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a Grafana alert rule")
    public ResponseEntity<Void> deleteAlertRule(
            @PathVariable String uid,
            Authentication authentication) {
        log.info("Deleting Grafana alert rule {} by user: {}", uid, authentication.getName());
        grafanaService.deleteAlertRule(uid);
        return ResponseEntity.noContent().build();
    }

    /**
     * Test a Grafana alert rule query
     */
    @PostMapping("/alert-rules/test")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Test a Grafana alert rule query")
    public ResponseEntity<TestAlertRuleResponse> testAlertRule(
            @Valid @RequestBody TestAlertRuleRequest request,
            Authentication authentication) {
        log.info("Testing Grafana alert rule query by user: {}", authentication.getName());
        TestAlertRuleResponse result = grafanaService.testAlertRule(request);
        return ResponseEntity.ok(result);
    }
    
}