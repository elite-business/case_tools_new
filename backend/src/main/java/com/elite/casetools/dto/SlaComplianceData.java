package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for SLA compliance metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaComplianceData {
    private long totalCasesWithSla;
    private long slaCompliantCases;
    private double complianceRate;
}
