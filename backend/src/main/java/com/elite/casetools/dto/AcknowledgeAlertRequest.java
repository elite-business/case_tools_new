package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for acknowledging alert
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcknowledgeAlertRequest {
    private String notes;
}