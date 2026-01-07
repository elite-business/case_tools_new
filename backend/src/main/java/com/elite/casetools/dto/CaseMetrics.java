package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for case metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseMetrics {
    private long totalCases;
    private long openCases;
    private long closedCases;
    private long slaBreachedCases;
    private double avgResolutionTimeMinutes;
    private Map<String, Long> severityDistribution;
}
