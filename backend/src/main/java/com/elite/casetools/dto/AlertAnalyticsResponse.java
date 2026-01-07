package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO for alert analytics response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertAnalyticsResponse {
    private LocalDateTime generatedAt;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private int totalAlerts;
    private int firingAlerts;
    private int resolvedAlerts;
    private int processedAlerts;
    private Map<String, Long> severityDistribution;
    private List<AlertTrend> alertTrends;
    private double avgProcessingTime;
}
