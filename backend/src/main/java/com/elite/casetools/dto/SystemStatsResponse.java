package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for system statistics response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemStatsResponse {
    private Long totalUsers;
    private Long activeUsers;
    private Long totalCases;
    private Long openCases;
    private Long totalAlerts;
    private Long activeAlerts;
    private Long totalTeams;
    private Long totalRules;
    private Long activeRules;
    private Double averageResponseTime;
    private Double systemUptime;
    private LocalDateTime lastRestart;
    private String version;
    private String environment;
}