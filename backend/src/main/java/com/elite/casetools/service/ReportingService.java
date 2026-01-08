package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.*;
import com.elite.casetools.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating reports and analytics
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportingService {

    private final CaseRepository caseRepository;
    private final NotificationRepository notificationRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter REPORT_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Generate comprehensive case report
     */
    public CaseReportResponse generateCaseReport(CaseReportRequest request) {
        log.info("Generating case report for period: {} to {}", request.getStartDate(), request.getEndDate());

        LocalDateTime startDate = request.getStartDate();
        LocalDateTime endDate = request.getEndDate();

        // Get cases in date range
        List<Case> cases = caseRepository.findCasesByDateRange(startDate, endDate);
        
        // Calculate metrics
        CaseMetrics metrics = calculateCaseMetrics(cases, startDate, endDate);
        
        // Get trends data
        List<CaseTrend> trends = calculateCaseTrends(startDate, endDate);
        
        // Get team performance
        List<TeamPerformance> teamPerformance = calculateTeamPerformance(cases);
        
        // Get SLA compliance
        SlaComplianceData slaCompliance = calculateSlaCompliance(cases);

        return CaseReportResponse.builder()
                .reportId(UUID.randomUUID().toString())
                .generatedAt(LocalDateTime.now())
                .startDate(startDate)
                .endDate(endDate)
                .totalCases(cases.size())
                .metrics(metrics)
                .trends(trends)
                .teamPerformance(teamPerformance)
                .slaCompliance(slaCompliance)
                .cases(cases.stream().map(this::mapCaseToSummary).toList())
                .build();
    }

    /**
     * Generate alert analytics report
     */
    public AlertAnalyticsResponse generateAlertAnalytics(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Generating alert analytics for period: {} to {}", startDate, endDate);

        // Since GrafanaAlert is removed, we'll use Case data as a proxy for alert analytics
        List<Case> cases = caseRepository.findCasesByDateRange(startDate, endDate);
        
        // Calculate alert metrics based on cases
        long totalAlerts = cases.size();
        long firingAlerts = cases.stream().filter(c -> c.getStatus() == Case.CaseStatus.OPEN).count();
        long resolvedAlerts = cases.stream().filter(c -> c.getStatus() == Case.CaseStatus.CLOSED).count();
        long processedAlerts = cases.stream().filter(c -> c.getAssignedTo() != null).count();

        // Get severity distribution
        Map<String, Long> severityDistribution = cases.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getSeverity() != null ? c.getSeverity().name() : "MEDIUM",
                        Collectors.counting()
                ));

        // Generate simple daily trends based on case creation dates
        List<AlertTrend> alertTrends = new ArrayList<>();
        // This is a simplified implementation - in a real scenario you'd want more sophisticated trending
        
        return AlertAnalyticsResponse.builder()
                .generatedAt(LocalDateTime.now())
                .startDate(startDate)
                .endDate(endDate)
                .totalAlerts(Math.toIntExact(totalAlerts))
                .firingAlerts(Math.toIntExact(firingAlerts))
                .resolvedAlerts(Math.toIntExact(resolvedAlerts))
                .processedAlerts(Math.toIntExact(processedAlerts))
                .severityDistribution(severityDistribution)
                .alertTrends(alertTrends)
                .avgProcessingTime(calculateAvgCaseResolutionTime(cases))
                .build();
    }

    /**
     * Generate notification report
     */
    public NotificationReportResponse generateNotificationReport(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Generating notification report for period: {} to {}", startDate, endDate);

        Object notificationStats = notificationRepository.getNotificationStatistics(startDate);
        List<Object[]> channelStats = notificationRepository.getDeliveryStatisticsByChannel(startDate);
        List<Object[]> dailyCounts = notificationRepository.getDailyNotificationCounts(startDate);

        // Map channel statistics
        List<ChannelStatistics> channelStatistics = channelStats.stream()
                .map(row -> ChannelStatistics.builder()
                        .channel(row[0].toString())
                        .totalSent(((Number) row[1]).intValue())
                        .delivered(((Number) row[2]).intValue())
                        .avgDeliveryTime(row[3] != null ? ((Number) row[3]).doubleValue() : 0.0)
                        .build())
                .toList();

        // Map daily counts
        List<NotificationTrend> trends = dailyCounts.stream()
                .map(row -> NotificationTrend.builder()
                        .date(((java.sql.Timestamp) row[0]).toLocalDateTime().toLocalDate())
                        .totalNotifications(((Number) row[1]).intValue())
                        .successfulNotifications(((Number) row[2]).intValue())
                        .build())
                .toList();

        return NotificationReportResponse.builder()
                .generatedAt(LocalDateTime.now())
                .startDate(startDate)
                .endDate(endDate)
                .channelStatistics(channelStatistics)
                .trends(trends)
                .overallStatistics(mapNotificationStats(notificationStats))
                .build();
    }

    /**
     * Generate team performance report
     */
    public TeamPerformanceResponse generateTeamPerformanceReport(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Generating team performance report for period: {} to {}", startDate, endDate);

        List<Team> teams = teamRepository.findAll();
        List<TeamPerformanceDetail> teamDetails = new ArrayList<>();

        for (Team team : teams) {
            List<Case> teamCases = caseRepository.findCasesByTeamAndDateRange(team.getId(), startDate, endDate);
            TeamPerformanceDetail detail = calculateTeamDetailedPerformance(team, teamCases);
            teamDetails.add(detail);
        }

        return TeamPerformanceResponse.builder()
                .generatedAt(LocalDateTime.now())
                .startDate(startDate)
                .endDate(endDate)
                .teamPerformance(teamDetails)
                .build();
    }

    /**
     * Export report to CSV
     */
    public byte[] exportReportToCsv(String reportType, LocalDateTime startDate, LocalDateTime endDate) 
            throws IOException {
        log.info("Exporting {} report to CSV for period: {} to {}", reportType, startDate, endDate);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        
        switch (reportType.toLowerCase()) {
            case "cases" -> exportCasesToCsv(outputStream, startDate, endDate);
            case "alerts" -> exportAlertsToCsv(outputStream, startDate, endDate);
            case "notifications" -> exportNotificationsToCsv(outputStream, startDate, endDate);
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        }

        return outputStream.toByteArray();
    }

    /**
     * Export report to Excel
     */
    public byte[] exportReportToExcel(String reportType, LocalDateTime startDate, LocalDateTime endDate) 
            throws IOException {
        log.info("Exporting {} report to Excel for period: {} to {}", reportType, startDate, endDate);

        // For simplicity, returning CSV format - in production, use Apache POI for Excel
        return exportReportToCsv(reportType, startDate, endDate);
    }

    /**
     * Get dashboard metrics
     */
    public DashboardMetrics getDashboardMetrics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last30Days = now.minusDays(30);
        LocalDateTime last24Hours = now.minusHours(24);

        // Case metrics
        long totalCases = caseRepository.count();
        long openCases = caseRepository.countByStatus(Case.CaseStatus.OPEN);
        long casesLast24h = caseRepository.countCreatedAfter(last24Hours);
        long casesLast30Days = caseRepository.countCreatedAfter(last30Days);

        // Alert metrics (using cases as proxy since GrafanaAlert is removed)
        long totalAlerts = caseRepository.count();
        long firingAlerts = caseRepository.countByStatus(Case.CaseStatus.OPEN);
        long alertsLast24h = caseRepository.findCasesByDateRange(last24Hours, LocalDateTime.now()).size();

        // Notification metrics
        long totalNotifications = notificationRepository.count();
        long pendingNotifications = notificationRepository.findByStatusOrderByCreatedAtDesc(Notification.NotificationStatus.PENDING).size();
        long failedNotifications = notificationRepository.findFailedNotifications().size();

        // SLA metrics
        List<Case> allOpenCases = caseRepository.findByStatusIn(
                Arrays.asList(Case.CaseStatus.OPEN, Case.CaseStatus.ASSIGNED, Case.CaseStatus.IN_PROGRESS));
        long slaBreachedCases = allOpenCases.stream()
                .filter(c -> c.getSlaDeadline() != null && c.getSlaDeadline().isBefore(now))
                .count();

        return DashboardMetrics.builder()
                .totalCases(totalCases)
                .openCases(openCases)
                .casesLast24Hours(casesLast24h)
                .casesLast30Days(casesLast30Days)
                .totalAlerts(totalAlerts)
                .firingAlerts(firingAlerts)
                .alertsLast24Hours(alertsLast24h)
                .totalNotifications(totalNotifications)
                .pendingNotifications(pendingNotifications)
                .failedNotifications(failedNotifications)
                .slaBreachedCases(slaBreachedCases)
                .generatedAt(now)
                .build();
    }

    // Private helper methods

    private CaseMetrics calculateCaseMetrics(List<Case> cases, LocalDateTime startDate, LocalDateTime endDate) {
        long totalCases = cases.size();
        long openCases = cases.stream().filter(Case::isOpen).count();
        long closedCases = cases.stream().filter(Case::isClosed).count();
        long slaBreachedCases = cases.stream().filter(c -> c.getSlaBreached() != null && c.getSlaBreached()).count();

        // Calculate average resolution time
        double avgResolutionTime = cases.stream()
                .filter(c -> c.getResolutionTimeMinutes() != null)
                .mapToInt(Case::getResolutionTimeMinutes)
                .average()
                .orElse(0.0);

        // Severity distribution
        Map<String, Long> severityDistribution = cases.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getSeverity().toString(),
                        Collectors.counting()
                ));

        return CaseMetrics.builder()
                .totalCases(totalCases)
                .openCases(openCases)
                .closedCases(closedCases)
                .slaBreachedCases(slaBreachedCases)
                .avgResolutionTimeMinutes(avgResolutionTime)
                .severityDistribution(severityDistribution)
                .build();
    }

    private List<CaseTrend> calculateCaseTrends(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> dailyCounts = caseRepository.getDailyCaseCounts(startDate);
        return dailyCounts.stream()
                .map(row -> CaseTrend.builder()
                        .date(((java.sql.Timestamp) row[0]).toLocalDateTime().toLocalDate())
                        .createdCases(((Number) row[1]).intValue())
                        .closedCases(((Number) row[2]).intValue())
                        .build())
                .toList();
    }

    private List<TeamPerformance> calculateTeamPerformance(List<Case> cases) {
        // TODO: Implement team performance calculation with new assignment structure
        // The new assignment system stores assignments as JSON, requiring a different approach
        
        // For now, return empty list - this needs proper implementation
        return new ArrayList<>();
    }

    private SlaComplianceData calculateSlaCompliance(List<Case> cases) {
        long totalCasesWithSla = cases.stream().filter(c -> c.getSlaDeadline() != null).count();
        long slaCompliantCases = cases.stream()
                .filter(c -> c.getSlaDeadline() != null && (c.getSlaBreached() == null || !c.getSlaBreached()))
                .count();
        
        double complianceRate = totalCasesWithSla > 0 ? 
                (double) slaCompliantCases / totalCasesWithSla * 100 : 100.0;

        return SlaComplianceData.builder()
                .totalCasesWithSla(totalCasesWithSla)
                .slaCompliantCases(slaCompliantCases)
                .complianceRate(complianceRate)
                .build();
    }

    private TeamPerformanceDetail calculateTeamDetailedPerformance(Team team, List<Case> teamCases) {
        long totalCases = teamCases.size();
        long openCases = teamCases.stream().filter(Case::isOpen).count();
        long closedCases = teamCases.stream().filter(Case::isClosed).count();
        
        double avgResolutionTime = teamCases.stream()
                .filter(c -> c.getResolutionTimeMinutes() != null)
                .mapToInt(Case::getResolutionTimeMinutes)
                .average()
                .orElse(0.0);

        Map<String, Long> severityDistribution = teamCases.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getSeverity().toString(),
                        Collectors.counting()
                ));

        return TeamPerformanceDetail.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .memberCount(team.getMembers() != null ? team.getMembers().size() : 0)
                .totalCases(totalCases)
                .openCases(openCases)
                .closedCases(closedCases)
                .avgResolutionTimeMinutes(avgResolutionTime)
                .severityDistribution(severityDistribution)
                .build();
    }

    private CaseSummary mapCaseToSummary(Case caseEntity) {
        return CaseSummary.builder()
                .id(caseEntity.getId())
                .caseNumber(caseEntity.getCaseNumber())
                .title(caseEntity.getTitle())
                .status(caseEntity.getStatus().toString())
                .severity(caseEntity.getSeverity().toString())
                .assignedTo(getAssignedUserNames(caseEntity))
                .createdAt(caseEntity.getCreatedAt())
                .resolvedAt(caseEntity.getResolvedAt())
                .slaDeadline(caseEntity.getSlaDeadline())
                .slaBreached(caseEntity.getSlaBreached())
                .build();
    }

    private double calculateAvgCaseResolutionTime(List<Case> cases) {
        return cases.stream()
                .filter(c -> c.getCreatedAt() != null && c.getResolvedAt() != null)
                .mapToDouble(c -> {
                    // Calculate resolution time in minutes
                    long minutes = java.time.Duration.between(c.getCreatedAt(), c.getResolvedAt()).toMinutes();
                    return (double) minutes;
                })
                .average()
                .orElse(0.0);
    }

    private NotificationStatistics mapNotificationStats(Object stats) {
        // Map the raw statistics object to NotificationStatistics DTO
        // This would depend on the actual structure returned by the query
        return NotificationStatistics.builder()
                .totalNotifications(0L)
                .sentNotifications(0L)
                .failedNotifications(0L)
                .pendingNotifications(0L)
                .avgRetries(0.0)
                .build();
    }

    private void exportCasesToCsv(ByteArrayOutputStream outputStream, LocalDateTime startDate, LocalDateTime endDate) 
            throws IOException {
        List<Case> cases = caseRepository.findCasesByDateRange(startDate, endDate);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Case Number,Title,Status,Severity,Assigned To,Created At,Resolved At,SLA Deadline,SLA Breached\n");
        
        for (Case c : cases) {
            csv.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                    csvEscape(c.getCaseNumber()),
                    csvEscape(c.getTitle()),
                    c.getStatus(),
                    c.getSeverity(),
                    csvEscape(getAssignedUserNames(c)),
                    c.getCreatedAt() != null ? c.getCreatedAt().format(REPORT_DATE_FORMAT) : "",
                    c.getResolvedAt() != null ? c.getResolvedAt().format(REPORT_DATE_FORMAT) : "",
                    c.getSlaDeadline() != null ? c.getSlaDeadline().format(REPORT_DATE_FORMAT) : "",
                    c.getSlaBreached() != null ? c.getSlaBreached() : false
            ));
        }
        
        outputStream.write(csv.toString().getBytes());
    }

    private void exportAlertsToCsv(ByteArrayOutputStream outputStream, LocalDateTime startDate, LocalDateTime endDate) 
            throws IOException {
        // Since GrafanaAlert is removed, we'll export Case data instead
        List<Case> cases = caseRepository.findCasesByDateRange(startDate, endDate);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Case Number,Title,Status,Severity,Created At,Assigned To\n");
        
        for (Case c : cases) {
            csv.append(String.format("%s,%s,%s,%s,%s,%s\n",
                    csvEscape(c.getCaseNumber()),
                    csvEscape(c.getTitle()),
                    c.getStatus() != null ? c.getStatus().name() : "",
                    c.getSeverity() != null ? c.getSeverity().name() : "",
                    c.getCreatedAt() != null ? c.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                    getAssignedUserNames(c)
            ));
        }
        
        outputStream.write(csv.toString().getBytes());
    }

    private void exportNotificationsToCsv(ByteArrayOutputStream outputStream, LocalDateTime startDate, LocalDateTime endDate) 
            throws IOException {
        List<Notification> notifications = notificationRepository.findByDateRange(startDate, endDate, Pageable.unpaged()).getContent();
        
        StringBuilder csv = new StringBuilder();
        csv.append("Recipient,Channel,Type,Status,Subject,Sent At,Delivered At\n");
        
        for (Notification n : notifications) {
            csv.append(String.format("%s,%s,%s,%s,%s,%s,%s\n",
                    csvEscape(n.getRecipientEmail() != null ? n.getRecipientEmail() : n.getRecipientName()),
                    n.getChannel(),
                    n.getNotificationType(),
                    n.getStatus(),
                    csvEscape(n.getSubject()),
                    n.getSentAt() != null ? n.getSentAt().format(REPORT_DATE_FORMAT) : "",
                    n.getDeliveredAt() != null ? n.getDeliveredAt().format(REPORT_DATE_FORMAT) : ""
            ));
        }
        
        outputStream.write(csv.toString().getBytes());
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
    
    /**
     * Helper method to get assigned user names
     */
    private String getAssignedUserNames(Case caseEntity) {
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        if (!assignmentInfo.hasAssignments()) {
            return "";
        }
        
        List<String> userNames = new ArrayList<>();
        for (Long userId : assignmentInfo.getUserIds()) {
            userRepository.findById(userId)
                    .ifPresent(user -> userNames.add(user.getName()));
        }
        
        return String.join(", ", userNames);
    }
}