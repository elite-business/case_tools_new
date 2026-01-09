package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for quick actions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickActionRequest {
    private Long caseId;
    private Long userId;
    private String action; // ACKNOWLEDGE, FALSE_POSITIVE, ESCALATE, MERGE
    private String notes;
    private String reason;
    private List<Long> secondaryCaseIds; // For merge action
}