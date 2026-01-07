package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Grafana sync response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaSyncResponse {
    private Boolean success;
    private String message;
    private LocalDateTime timestamp;
    private LocalDateTime syncedAt;
    
    // Legacy fields
    private Integer rulesSync;
    private Integer dashboardsSync;
    private Integer contactPointsSync;
    
    // New comprehensive sync fields
    private Integer totalRules;
    private Integer createdRules;
    private Integer updatedRules;
    private Integer failedRules;
    private Integer grafanaRuleCount;
    
    private List<String> errors;
    private List<String> warnings;
    private List<String> orphanedInGrafana;
    private List<String> orphanedLocally;
    private Long duration;
}