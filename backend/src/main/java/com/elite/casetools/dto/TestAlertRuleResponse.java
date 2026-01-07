package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for testing a Grafana alert rule query
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestAlertRuleResponse {
    private Boolean success;
    private String message;
    private Integer rowCount;
    private List<Map<String, Object>> sampleData; // First few rows of results
    private Boolean thresholdMet;
    private String error;
}