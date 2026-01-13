package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for top alert rules in analytics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopAlertResponse {
    private String ruleName;
    private Long count;
    private String avgSeverity;
    private Double avgResolutionTime;
}
