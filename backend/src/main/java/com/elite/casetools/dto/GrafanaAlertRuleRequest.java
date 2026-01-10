package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * General request DTO for Grafana alert rule operations
 * Can be used for both create and update operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaAlertRuleRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String uid; // For updates
    
    @NotBlank(message = "Folder UID is required")
    private String folderUID;
    
    @NotBlank(message = "Rule group is required")
    private String ruleGroup;
    
    @NotBlank(message = "Query is required")
    private String query;
    
    @NotBlank(message = "Datasource UID is required")
    private String datasourceUID;
    
    private String condition;
    
    private String evaluationInterval; // e.g., "1m", "5m"
    
    private String for_; // Duration string like "5m"
    
    private Map<String, String> annotations;
    
    private Map<String, String> labels;
    
    private Integer noDataState; // 0=NoDataNoData, 1=NoDataAlerting, 2=NoDataOK
    
    private Integer execErrState; // 0=AlertingState, 1=OK
    
    private Map<String, Object> thresholds;
    
    private String description;
    
    private String severity; // critical, high, medium, low
    
    private Boolean enabled;
}