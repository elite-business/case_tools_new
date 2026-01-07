package com.elite.casetools.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class QueryValidationRequest {
    
    @NotBlank(message = "SQL query is required")
    private String query;
    
    private Integer maxRows = 10;
    
    private Boolean includeStats = false;
}