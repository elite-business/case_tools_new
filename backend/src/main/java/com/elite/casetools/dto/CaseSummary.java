package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for case summary information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseSummary {
    private Long id;
    private String caseNumber;
    private String title;
    private String status;
    private String severity;
    private String assignedTo;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime slaDeadline;
    private Boolean slaBreached;
}
