package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for case history timeline
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseHistoryResponse {
    private Long id;
    private String action;
    private String description;
    private String details;
    private LocalDateTime timestamp;
    private UserSummaryDto performedBy;
    private String oldValue;
    private String newValue;
}