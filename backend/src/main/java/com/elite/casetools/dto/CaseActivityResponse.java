package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for case activity response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseActivityResponse {
    private Long id;
    private String activityType;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private String description;
    private UserSummaryDto user;
    private LocalDateTime createdAt;
}