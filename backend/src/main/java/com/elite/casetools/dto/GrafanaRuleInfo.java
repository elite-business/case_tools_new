package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Grafana rule information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaRuleInfo {
    
    private String uid;
    private String title;
    private String folderUID;
    private String folderTitle;
    private String datasourceUid;
    private String query;
    private String condition;
    private String state;
    private String orgId;
    private String ruleGroup;
}