package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for resolving alert
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveAlertRequest {
    private String notes;
    private String resolution;
}