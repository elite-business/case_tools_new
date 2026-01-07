package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Response DTO for Grafana alert rule
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaAlertRuleResponse {
    private String uid;
    private String title;
    private String folderUID;
    private String folderTitle;
    private String ruleGroup;
    private String condition;
    private Map<String, Object> data;
    private Integer noDataState;
    private Integer execErrState;
    private String for_;  // Duration string like "5m"
    private Map<String, String> annotations;
    private Map<String, String> labels;
    private LocalDateTime updated;
    private String updatedBy;
    private LocalDateTime created;
    private String createdBy;
    private String provenance;
    private Boolean isPaused;
}