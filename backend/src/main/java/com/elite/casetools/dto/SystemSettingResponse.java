package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for system setting response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSettingResponse {
    private Long id;
    private String key;
    private String value;
    private String defaultValue;
    private String category;
    private String description;
    private String dataType;
    private Boolean required;
    private Boolean encrypted;
    private String validationRules;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserSummaryDto updatedBy;
}