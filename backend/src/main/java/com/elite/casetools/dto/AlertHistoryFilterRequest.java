package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for filtering alert history
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertHistoryFilterRequest {
    private String status;
    private String severity;
    private String category;
    private String search;
    private Long assignedToId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String source;
    private String ruleId;
}