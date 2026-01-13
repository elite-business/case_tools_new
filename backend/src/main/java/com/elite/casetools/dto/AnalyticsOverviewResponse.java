package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO for analytics overview response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsOverviewResponse {
    private Long totalCases;
    private Long openCases;
    private Long criticalAlerts;
    private Double averageResolutionTime;
    private Long totalAlerts;
    private Long resolvedAlerts;
    private Long acknowledgedAlerts;
    private Long pendingAlerts;
    private Double alertResolutionRate;
    private Double slaBreachRate;
    private Long activeUsers;
    private Long totalReports;
    
    // Additional fields for dashboard metrics
    private Long activeRules;
    private Long systemUsers;
    private Double alertsGrowth;
    private Double rulesGrowth;
    private Double usersGrowth;
    private List<SeverityDistribution> severityDistribution;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeverityDistribution {
        private String severity;
        private Long value;
    }
}