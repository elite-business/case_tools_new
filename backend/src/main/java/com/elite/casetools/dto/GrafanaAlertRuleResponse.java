package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for Grafana alert rule with complete information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaAlertRuleResponse {
    private Long id;
    private String uid;
    private Long orgID;
    private String title;
    private String folderUID;
    private String folderTitle;
    private String ruleGroup;
    private String condition;
    
    // Data array containing queries and conditions
    private List<GrafanaRuleData> data;
    
    // Alert timing
    private String for_;  // Duration string like "5m"
    private String keepFiringFor;  // Duration to keep firing
    
    // Alert states
    private String state;  // Current state: Normal, Pending, Alerting
    private String noDataState;  // NoData, Alerting, OK
    private String execErrState;  // Error, Alerting, OK
    
    // Metadata
    private Map<String, String> annotations;
    private Map<String, String> labels;
    private LocalDateTime updated;
    private String updatedBy;
    private LocalDateTime created;
    private String createdBy;
    private String provenance;
    
    // Status
    private Boolean isPaused;
    
    // Notification settings
    private Map<String, Object> notificationSettings;
    private String record;
    
    // Nested class for rule data
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GrafanaRuleData {
        private String refId;
        private String queryType;
        private Map<String, Integer> relativeTimeRange;
        private String datasourceUid;
        private GrafanaRuleModel model;
    }
    
    // Nested class for model data
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GrafanaRuleModel {
        // For SQL queries
        private String rawSql;
        private String dataset;
        private String table;
        private String editorMode;
        private String format;
        
        // For expressions
        private String expression;
        private String reducer;
        private String datasource;
        
        // Common fields
        private String refId;
        private Integer intervalMs;
        private Integer maxDataPoints;
        
        // For threshold conditions
        private List<Map<String, Object>> conditions;
        private Map<String, Object> sql;
    }
}