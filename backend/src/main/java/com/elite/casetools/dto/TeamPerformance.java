package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Enhanced DTO for comprehensive team performance metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformance {
    
    // Team identification
    private Long teamId;
    private String teamName;
    
    // Time period
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private LocalDateTime calculatedAt;
    
    // Core metrics
    private Long totalCases;
    private Long resolvedCases;
    private Long openCases;
    private Long inProgressCases;
    private Double avgResolutionTimeMinutes;
    private Double slaCompliance;
    private Double falsePositiveRate;
    private Double escalationRate;
    
    // Workload and distribution
    private Map<String, Integer> workloadDistribution;
    private Map<String, MemberPerformance> memberPerformance;
    
    // Activity metrics
    private Long totalActivities;
    private Long commentsCount;
    
    // Trends
    private List<TrendPoint> resolutionTrend;
    private List<TrendPoint> caseTrend;
    
    // Calculated properties
    public Double getResolutionRate() {
        if (totalCases == null || totalCases == 0) {
            return 0.0;
        }
        return (resolvedCases != null ? resolvedCases.doubleValue() : 0.0) / totalCases * 100.0;
    }
    
    public Double getCloseRate() {
        return getResolutionRate(); // Alias for backwards compatibility
    }
    
    public Long getClosedCases() {
        return resolvedCases; // Alias for backwards compatibility
    }
    
    /**
     * Individual team member performance
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberPerformance {
        private Long userId;
        private String userName;
        private Integer totalCases;
        private Integer resolvedCases;
        private Integer activeCases;
        private Double avgResolutionTime;
        private Double slaCompliance;
        private Double resolutionRate;
    }
    
    /**
     * Trend data point
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TrendPoint {
        private String date;
        private Double value;
    }
}
