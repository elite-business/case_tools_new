package com.elite.casetools.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for bulk case assignment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAssignRequest {
    
    @NotEmpty(message = "Case IDs cannot be empty")
    private List<Long> caseIds;
    
    @NotNull(message = "User ID is required")
    private Long userId;
    
    private String notes;
}