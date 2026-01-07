package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for testing a Grafana alert rule query
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestAlertRuleRequest {
    
    @NotBlank(message = "Query is required")
    private String query;
    
    @NotBlank(message = "Datasource UID is required")
    private String datasourceUID;
    
    private Map<String, Object> thresholds;
    
    private String from; // Time range start
    
    private String to;   // Time range end
}