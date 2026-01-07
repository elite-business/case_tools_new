package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for creating rule assignments
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRuleAssignmentRequest {
    
    @NotBlank(message = "Rule name is required")
    private String ruleName;
    
    private String folderUid;
    private String folderName;
    private String datasourceUid;
    private String description;
    private String severity;
    private String category;
    private String assignmentStrategy;
    
    @Builder.Default
    private Boolean active = true;
    
    @Builder.Default
    private Boolean autoAssignEnabled = true;
}