package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for team performance response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformanceResponse {
    // For ReportingService
    private LocalDateTime generatedAt;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<TeamPerformanceDetail> teamPerformance;
    
    // For TeamController and AnalyticsController
    private List<TeamPerformanceData> teams;
    private TeamPerformanceData overall;
    private String period;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamPerformanceData {
        private Long teamId;
        private String teamName;
        private Long totalCases;
        private Long resolvedCases;
        private Long openCases;
        private Double averageResolutionTime;
        private Double slaCompliance;
        private Long membersCount;
        private List<UserPerformanceData> members;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPerformanceData {
        private Long userId;
        private String userName;
        private Long casesHandled;
        private Long casesResolved;
        private Double averageResolutionTime;
        private Double slaCompliance;
    }
}