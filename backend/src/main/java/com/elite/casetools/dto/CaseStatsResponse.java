package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for case statistics response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseStatsResponse {
    private Long total;
    private Long open;
    private Long inProgress;
    private Long resolved;
    private Long closed;
    private Long overdue;
    private Long breachedSla;
    private Double averageResolutionTime;
    private Double slaCompliance;
}
