package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * REST controller for alert history and management
 */
@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Alert history and management endpoints")
@Slf4j
public class AlertController {

    private final AlertService alertService;

    /**
     * Get alert history with pagination and filtering
     */
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get alert history with pagination and filtering")
    public ResponseEntity<Page<AlertHistoryResponse>> getAlertHistory(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate) {

        AlertHistoryFilterRequest filter = AlertHistoryFilterRequest.builder()
                .status(status)
                .severity(severity)
                .category(category)
                .assignedToId(assignedToId)
                .search(search)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        Page<AlertHistoryResponse> alerts = alertService.getAlertHistory(filter, pageable);
        return ResponseEntity.ok(alerts);
    }

    /**
     * Acknowledge alert
     */
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Acknowledge alert")
    public ResponseEntity<AlertHistoryResponse> acknowledgeAlert(
            @PathVariable Long id,
            @RequestBody AcknowledgeAlertRequest request,
            Authentication authentication) {

        log.info("Acknowledging alert {} by user: {}", id, authentication.getName());
        AlertHistoryResponse response = alertService.acknowledgeAlert(id, request, authentication.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * Resolve alert
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Resolve alert")
    public ResponseEntity<AlertHistoryResponse> resolveAlert(
            @PathVariable Long id,
            @RequestBody ResolveAlertRequest request,
            Authentication authentication) {

        log.info("Resolving alert {} by user: {}", id, authentication.getName());
        AlertHistoryResponse response = alertService.resolveAlert(id, request, authentication.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * Assign alert to user
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assign alert to user")
    public ResponseEntity<AlertHistoryResponse> assignAlert(
            @PathVariable Long id,
            @RequestBody AssignAlertRequest request,
            Authentication authentication) {

        log.info("Assigning alert {} to user {} by: {}", id, request.getUserId(), authentication.getName());
        AlertHistoryResponse response = alertService.assignAlert(id, request, authentication.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * Export alert history
     */
    @GetMapping("/history/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Export alert history")
    public ResponseEntity<byte[]> exportAlertHistory(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            Authentication authentication) {

        log.info("Exporting alert history in {} format by user: {}", format, authentication.getName());

        AlertHistoryFilterRequest filter = AlertHistoryFilterRequest.builder()
                .status(status)
                .severity(severity)
                .category(category)
                .assignedToId(assignedToId)
                .search(search)
                .startDate(startDate)
                .endDate(endDate)
                .build();

        byte[] exportData = alertService.exportAlertHistory(filter, format);
        
        String filename = "alert_history_" + LocalDateTime.now().toString().substring(0, 19).replace(":", "-") + "." + format.toLowerCase();
        String mediaType = format.equalsIgnoreCase("csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(mediaType))
                .body(exportData);
    }
}