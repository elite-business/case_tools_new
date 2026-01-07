package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for updating a Grafana alert rule
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGrafanaAlertRuleRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String folderUID;
    
    private String ruleGroup;
    
    private String query;
    
    private String datasourceUID;
    
    private String condition;
    
    private String evaluationInterval;
    
    private String for_;
    
    private Map<String, String> annotations;
    
    private Map<String, String> labels;
    
    private Integer noDataState;
    
    private Integer execErrState;
    
    private Map<String, Object> thresholds;
    
    private Boolean isPaused;
}