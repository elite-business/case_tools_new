package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for quick actions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickActionResponse {
    private boolean success;
    private String action;
    private Long caseId;
    private String caseNumber;
    private String message;
    private String performedBy;
    private LocalDateTime performedAt;
    private Object additionalData; // For action-specific data
}