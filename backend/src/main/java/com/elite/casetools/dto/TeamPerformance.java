package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for team performance metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformance {
    private String teamName;
    private long totalCases;
    private long closedCases;
    private double closeRate;
    private double avgResolutionTimeMinutes;
}
