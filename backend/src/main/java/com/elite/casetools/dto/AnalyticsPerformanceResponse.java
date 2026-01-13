package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for analytics performance metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsPerformanceResponse {
    private Double overallHealth;
    private Long alertProcessingSpeed;
    private Long dbResponseTime;
    private Long apiResponseTime;
}
