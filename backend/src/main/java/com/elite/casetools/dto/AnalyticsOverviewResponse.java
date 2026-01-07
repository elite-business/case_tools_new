package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}