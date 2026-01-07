package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for case report request parameters
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseReportRequest {
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<String> statuses;
    private List<String> severities;
    private List<Long> teamIds;
    private List<Long> assigneeIds;
    private boolean includeClosed;
    private boolean includeSlaBreached;
    private String sortBy;
    private String sortDirection;
}