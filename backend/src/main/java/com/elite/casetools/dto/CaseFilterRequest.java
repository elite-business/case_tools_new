package com.elite.casetools.dto;

import com.elite.casetools.entity.Case;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for filtering cases
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseFilterRequest {
    
    private String status;
    private String severity;
    private String category;
    private String search;
    private List<Case.CaseStatus> statuses;
    private List<Case.Severity> severities;
    private List<Integer> priorities;
    private Long assignedToId;
    private Long createdById;
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private LocalDateTime updatedAfter;
    private LocalDateTime updatedBefore;
    private String searchText;
    private List<String> tags;
    private Long alertRuleId;
    private Boolean hasComments;
}