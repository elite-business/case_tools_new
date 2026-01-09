package com.elite.casetools.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for bulk case closing
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCloseRequest {
    
    @NotEmpty(message = "Case IDs cannot be empty")
    private List<Long> caseIds;
    
    @NotBlank(message = "Resolution is required")
    private String resolution;
    
    private String notes;
}