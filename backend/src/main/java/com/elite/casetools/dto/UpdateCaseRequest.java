package com.elite.casetools.dto;

import com.elite.casetools.entity.Case;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for updating case information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCaseRequest {
    
    private String title;
    private String description;
    private Integer priority;
    private Case.Severity severity;
    private Case.CaseStatus status;
    private Long assignedToId;
    private String resolution;
    private LocalDateTime dueDate;
    private String tags;
    private String rootCause;
    private String resolutionActions;
    private Double actualLoss;
}