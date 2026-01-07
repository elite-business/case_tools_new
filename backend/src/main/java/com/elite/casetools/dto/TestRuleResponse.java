package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestRuleResponse {
    
    private boolean success;
    private String message;
    private List<Map<String, Object>> testResults;
    private Integer resultCount;
    private Long executionTimeMs;
    private LocalDateTime testedAt;
    private String queryUsed;
    private boolean wouldTriggerAlert;
    private String alertCondition;
    private Double thresholdValue;
    private String error;
}