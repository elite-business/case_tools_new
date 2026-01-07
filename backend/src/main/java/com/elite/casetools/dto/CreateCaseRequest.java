package com.elite.casetools.dto;

import com.elite.casetools.entity.Case;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for creating a new case
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCaseRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    @NotNull(message = "Severity is required")
    private Case.Severity severity;
    
    private Integer priority;
    
    private Case.Category category;
    
    private Long alertId;
    private String grafanaAlertId;
    private String grafanaAlertUid;
    
    private String affectedServices;
    private Integer affectedCustomers;
    private BigDecimal estimatedLoss;
    
    private String[] tags;
    private String customFields;
    
    private Long assignedToId;
}