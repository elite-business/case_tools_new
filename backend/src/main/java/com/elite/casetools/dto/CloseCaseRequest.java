package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for closing a case
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloseCaseRequest {
    
    @NotBlank(message = "Resolution is required to close a case")
    private String resolution;
    
    private String closingNotes;
    private String closureReason;
    private String rootCause;
    private String resolutionActions;
    private String preventiveMeasures;
    private Double actualLoss;
}