package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for detailed team performance information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformanceDetail {
    private Long teamId;
    private String teamName;
    private int memberCount;
    private long totalCases;
    private long openCases;
    private long closedCases;
    private double avgResolutionTimeMinutes;
    private Map<String, Long> severityDistribution;
}
