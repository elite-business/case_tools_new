package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO for generating a report request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateReportRequest {
    @NotBlank(message = "Report type is required")
    private String type;
    
    private String name;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String format;
    private Map<String, Object> parameters;
    private Long teamId;
    private String emailRecipients;
    private Boolean scheduleEnabled;
    private String scheduleExpression;
}