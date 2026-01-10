package com.elite.casetools.controller;

import com.elite.casetools.dto.AddCommentRequest;
import com.elite.casetools.dto.CaseFilterRequest;
import com.elite.casetools.dto.PaginatedResponse;
import com.elite.casetools.dto.UpdateCaseRequest;
import com.elite.casetools.entity.Case;
import com.elite.casetools.service.CaseService;
import com.elite.casetools.service.SimplifiedAlertService;
import com.elite.casetools.service.WebSocketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for managing alerts and alert history
 */
@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Alerts", description = "Alert management and history endpoints")
public class AlertController {

    private final CaseService caseService;
    private final SimplifiedAlertService alertService;
    private final WebSocketService webSocketService;

    /**
     * Get alert history
     */
    @GetMapping("/history")
    @Operation(summary = "Get alert history", description = "Retrieve paginated alert history")
    public ResponseEntity<PaginatedResponse<AlertHistoryDto>> getAlertHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search) {
        
        log.info("Fetching alert history - page: {}, size: {}, filters: severity={}, status={}", 
            page, size, severity, status);
        
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            // Use getAllCases instead of searchCases - filtering can be done manually if needed
            // getCases needs a filter, create an empty one
            CaseFilterRequest filter = new CaseFilterRequest();
            Page<Case> cases = caseService.getCases(filter, pageable);
            
            List<AlertHistoryDto> alerts = cases.getContent().stream()
                .map(this::mapCaseToAlertHistory)
                .collect(Collectors.toList());
            
            PaginatedResponse<AlertHistoryDto> response = new PaginatedResponse<>();
            response.setContent(alerts);
            response.setTotalElements(cases.getTotalElements());
            response.setTotalPages(cases.getTotalPages());
            response.setNumber(cases.getNumber());
            response.setSize(cases.getSize());
            response.setFirst(cases.isFirst());
            response.setLast(cases.isLast());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch alert history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get single alert by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get alert by ID", description = "Retrieve a specific alert by its ID")
    public ResponseEntity<AlertHistoryDto> getAlert(@PathVariable Long id) {
        log.info("Fetching alert with ID: {}", id);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(mapCaseToAlertHistory(caseEntity));
        } catch (Exception e) {
            log.error("Failed to fetch alert", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Acknowledge alert
     */
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Acknowledge alert", description = "Acknowledge an alert")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String notes = request.get("notes");
        log.info("Acknowledging alert: {} with notes: {}", id, notes);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Update status to acknowledged (IN_PROGRESS)
            caseEntity.setStatus(Case.CaseStatus.IN_PROGRESS);
            caseEntity.setUpdatedAt(LocalDateTime.now());
            
            // Add acknowledgment as activity
            AddCommentRequest commentRequest = new AddCommentRequest();
            if (notes != null && !notes.isEmpty()) {
                commentRequest.setContent("Alert acknowledged: " + notes);
            } else {
                commentRequest.setContent("Alert acknowledged");
            }
            commentRequest.setIsInternal(false);
            caseService.addComment(id, commentRequest);
            
            UpdateCaseRequest updateRequest = new UpdateCaseRequest();
            updateRequest.setStatus(caseEntity.getStatus());
            caseService.updateCase(id, updateRequest);
            
            // Send WebSocket notification
            // Send notification to relevant users
            webSocketService.sendToChannel("alerts", "notification", "Alert " + id + " acknowledged");
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Alert acknowledged successfully",
                "alertId", id,
                "status", "ACKNOWLEDGED"
            ));
        } catch (Exception e) {
            log.error("Failed to acknowledge alert", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Resolve alert
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Resolve alert", description = "Mark an alert as resolved")
    public ResponseEntity<Map<String, Object>> resolveAlert(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String notes = request.get("notes");
        log.info("Resolving alert: {} with notes: {}", id, notes);
        
        try {
            Case caseEntity = caseService.getCaseById(id);
            if (caseEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Update status to resolved
            caseEntity.setStatus(Case.CaseStatus.RESOLVED);
            caseEntity.setResolvedAt(LocalDateTime.now());
            caseEntity.setUpdatedAt(LocalDateTime.now());
            
            // Add resolution as activity
            AddCommentRequest resolveComment = new AddCommentRequest();
            if (notes != null && !notes.isEmpty()) {
                resolveComment.setContent("Alert resolved: " + notes);
            } else {
                resolveComment.setContent("Alert resolved");
            }
            resolveComment.setIsInternal(false);
            caseService.addComment(id, resolveComment);
            
            UpdateCaseRequest resolveUpdate = new UpdateCaseRequest();
            resolveUpdate.setStatus(caseEntity.getStatus());
            caseService.updateCase(id, resolveUpdate);
            
            // Send WebSocket notification
            // Send notification to relevant users
            webSocketService.sendToChannel("alerts", "notification", "Alert " + id + " resolved");
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Alert resolved successfully",
                "alertId", id,
                "status", "RESOLVED"
            ));
        } catch (Exception e) {
            log.error("Failed to resolve alert", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Assign alert to user
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assign alert", description = "Assign an alert to a user")
    public ResponseEntity<Map<String, Object>> assignAlert(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        
        Long userId = ((Number) request.get("userId")).longValue();
        log.info("Assigning alert: {} to user: {}", id, userId);
        
        try {
            // assignCaseToUser now takes IDs directly
            caseService.assignCaseToUser(id, userId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Alert assigned successfully",
                "alertId", id,
                "userId", userId
            ));
        } catch (Exception e) {
            log.error("Failed to assign alert", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Export alert history
     */
    @GetMapping("/history/export")
    @Operation(summary = "Export alert history", description = "Export alert history in CSV or JSON format")
    public ResponseEntity<byte[]> exportHistory(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "csv") String format) {
        
        log.info("Exporting alert history in {} format", format);
        
        try {
            Pageable pageable = PageRequest.of(0, 10000); // Export up to 10000 records
            // Use getAllCases instead of searchCases
            // getCases needs a filter, create an empty one
            CaseFilterRequest filter = new CaseFilterRequest();
            Page<Case> cases = caseService.getCases(filter, pageable);
            
            byte[] content;
            MediaType contentType;
            String filename;
            
            if ("json".equalsIgnoreCase(format)) {
                // Export as JSON
                List<AlertHistoryDto> alerts = cases.getContent().stream()
                    .map(this::mapCaseToAlertHistory)
                    .collect(Collectors.toList());
                
                content = alerts.toString().getBytes(StandardCharsets.UTF_8);
                contentType = MediaType.APPLICATION_JSON;
                filename = "alert-history.json";
            } else {
                // Export as CSV
                content = generateCsv(cases.getContent());
                contentType = MediaType.parseMediaType("text/csv");
                filename = "alert-history.csv";
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(contentType);
            headers.setContentDispositionFormData("attachment", filename);
            
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Failed to export alert history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get Grafana alerts (proxy to Grafana)
     */
    @GetMapping("/grafana")
    @Operation(summary = "Get Grafana alerts", description = "Retrieve alerts directly from Grafana")
    public ResponseEntity<List<Map<String, Object>>> getGrafanaAlerts(
            @RequestParam(required = false) String state) {
        
        log.info("Fetching Grafana alerts with state: {}", state);
        
        try {
            // This would proxy to Grafana API
            // For now, return empty list
            return ResponseEntity.ok(List.of());
        } catch (Exception e) {
            log.error("Failed to fetch Grafana alerts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Helper methods

    private AlertHistoryDto mapCaseToAlertHistory(Case caseEntity) {
        AlertHistoryDto dto = new AlertHistoryDto();
        dto.setId(caseEntity.getId());
        dto.setAlertName(caseEntity.getTitle());
        dto.setAlertDescription(caseEntity.getDescription());
        dto.setSeverity(mapPriorityToSeverity(caseEntity.getPriority()));
        dto.setStatus(caseEntity.getStatus().toString());
        dto.setSource("Grafana");
        dto.setCreatedAt(caseEntity.getCreatedAt());
        dto.setUpdatedAt(caseEntity.getUpdatedAt());
        dto.setResolvedAt(caseEntity.getResolvedAt());
        dto.setFingerprint(caseEntity.getGrafanaAlertUid());
        
        // Add labels from additional info if available
        Map<String, String> labels = new HashMap<>();
        // Could add labels from case details if needed
        dto.setLabels(labels);
        
        return dto;
    }

    private String mapPriorityToSeverity(Integer priority) {
        if (priority == null) return "medium";
        return switch (priority) {
            case 1 -> "critical";
            case 2 -> "high";
            case 3 -> "medium";
            case 4 -> "low";
            default -> "medium";
        };
    }

    private byte[] generateCsv(List<Case> cases) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(baos);
        
        // Write header
        writer.println("ID,Alert Name,Description,Severity,Status,Created At,Updated At,Resolved At");
        
        // Write data
        for (Case c : cases) {
            writer.printf("%d,\"%s\",\"%s\",%s,%s,%s,%s,%s%n",
                c.getId(),
                c.getTitle(),
                c.getDescription() != null ? c.getDescription().replace("\"", "\"\"") : "",
                mapPriorityToSeverity(c.getPriority()),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                c.getResolvedAt() != null ? c.getResolvedAt() : ""
            );
        }
        
        writer.flush();
        return baos.toByteArray();
    }

    /**
     * DTO for Alert History
     */
    public static class AlertHistoryDto {
        private Long id;
        private String alertName;
        private String alertDescription;
        private String severity;
        private String status;
        private String source;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime resolvedAt;
        private String fingerprint;
        private Map<String, String> labels;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getAlertName() { return alertName; }
        public void setAlertName(String alertName) { this.alertName = alertName; }

        public String getAlertDescription() { return alertDescription; }
        public void setAlertDescription(String alertDescription) { this.alertDescription = alertDescription; }

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

        public LocalDateTime getResolvedAt() { return resolvedAt; }
        public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

        public String getFingerprint() { return fingerprint; }
        public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }

        public Map<String, String> getLabels() { return labels; }
        public void setLabels(Map<String, String> labels) { this.labels = labels; }
    }
}