package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for test connection response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestConnectionResponse {
    private Boolean success;
    private String message;
    private Long responseTime;
    private LocalDateTime timestamp;
    private String errorDetails;
}