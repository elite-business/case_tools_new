package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * REST controller for analytics and reporting
 */
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Analytics and reporting endpoints")
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Get analytics overview
     */
    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get analytics overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Long teamId) {

        AnalyticsOverviewResponse overview = analyticsService.getOverview(period, teamId);
        return ResponseEntity.ok(overview);
    }

    /**
     * Get trends data
     */
    @GetMapping("/trends")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get analytics trends")
    public ResponseEntity<AnalyticsTrendsResponse> getTrends(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String metric,
            @RequestParam(required = false) Long teamId) {

        AnalyticsTrendsResponse trends = analyticsService.getTrends(period, metric, teamId);
        return ResponseEntity.ok(trends);
    }

    /**
     * Get team performance data
     */
    @GetMapping("/team-performance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get team performance analytics")
    public ResponseEntity<TeamPerformanceResponse> getTeamPerformance(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Long teamId) {

        TeamPerformanceResponse performance = analyticsService.getTeamPerformance(period, teamId);
        return ResponseEntity.ok(performance);
    }

    /**
     * Get all reports with pagination
     */
    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Get all reports")
    public ResponseEntity<Page<ReportResponse>> getReports(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        Page<ReportResponse> reports = analyticsService.getReports(pageable, type, status);
        return ResponseEntity.ok(reports);
    }

    /**
     * Generate a new report
     */
    @PostMapping("/reports/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Generate new report")
    public ResponseEntity<ReportResponse> generateReport(
            @RequestBody GenerateReportRequest request,
            Authentication authentication) {

        log.info("Generating report of type {} by user: {}", request.getType(), authentication.getName());
        ReportResponse report = analyticsService.generateReport(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    /**
     * Export report
     */
    @GetMapping("/reports/{id}/export")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ANALYST')")
    @Operation(summary = "Export report")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "pdf") String format,
            Authentication authentication) {

        log.info("Exporting report {} in {} format by user: {}", id, format, authentication.getName());
        byte[] reportData = analyticsService.exportReport(id, format);

        String filename = "report_" + id + "_" + LocalDateTime.now().toString().substring(0, 19).replace(":", "-") + "." + format.toLowerCase();
        String mediaType = switch (format.toLowerCase()) {
            case "pdf" -> "application/pdf";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "csv" -> "text/csv";
            default -> "application/octet-stream";
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(mediaType))
                .body(reportData);
    }
}