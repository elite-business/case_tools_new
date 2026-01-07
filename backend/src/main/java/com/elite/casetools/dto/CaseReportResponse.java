package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for comprehensive case report response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseReportResponse {
    private String reportId;
    private LocalDateTime generatedAt;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private int totalCases;
    private CaseMetrics metrics;
    private List<CaseTrend> trends;
    private List<TeamPerformance> teamPerformance;
    private SlaComplianceData slaCompliance;
    private List<CaseSummary> cases;
}
