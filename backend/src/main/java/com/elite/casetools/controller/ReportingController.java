package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.ReportingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Controller for reporting and analytics endpoints
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReportingController {

    private final ReportingService reportingService;

    /**
     * Generate comprehensive case report
     */
    @PostMapping("/cases")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<CaseReportResponse> generateCaseReport(@RequestBody CaseReportRequest request) {
        log.info("Generating case report for date range: {} to {}", request.getStartDate(), request.getEndDate());
        CaseReportResponse response = reportingService.generateCaseReport(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate alert analytics report
     */
    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<AlertAnalyticsResponse> generateAlertAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        log.info("Generating alert analytics for date range: {} to {}", startDate, endDate);
        AlertAnalyticsResponse response = reportingService.generateAlertAnalytics(startDate, endDate);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate notification report
     */
    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<NotificationReportResponse> generateNotificationReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        log.info("Generating notification report for date range: {} to {}", startDate, endDate);
        NotificationReportResponse response = reportingService.generateNotificationReport(startDate, endDate);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate team performance report
     */
    @GetMapping("/team-performance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ANALYST')")
    public ResponseEntity<TeamPerformanceResponse> generateTeamPerformanceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        log.info("Generating team performance report for date range: {} to {}", startDate, endDate);
        TeamPerformanceResponse response = reportingService.generateTeamPerformanceReport(startDate, endDate);
        return ResponseEntity.ok(response);
    }

    /**
     * Get dashboard metrics
     */
    @GetMapping("/dashboard-metrics")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'USER')")
    public ResponseEntity<DashboardMetrics> getDashboardMetrics() {
        log.info("Retrieving dashboard metrics");
        DashboardMetrics metrics = reportingService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Export report to CSV
     */
    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<byte[]> exportReportToCsv(
            @RequestParam String reportType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) throws IOException {
        log.info("Exporting {} report to CSV", reportType);
        byte[] csvData = reportingService.exportReportToCsv(reportType, startDate, endDate);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + reportType + "_report.csv\"")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE)
                .body(csvData);
    }

    /**
     * Export report to Excel
     */
    @GetMapping("/export/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<byte[]> exportReportToExcel(
            @RequestParam String reportType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) throws IOException {
        log.info("Exporting {} report to Excel", reportType);
        byte[] excelData = reportingService.exportReportToExcel(reportType, startDate, endDate);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + reportType + "_report.xlsx\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(excelData);
    }
}
