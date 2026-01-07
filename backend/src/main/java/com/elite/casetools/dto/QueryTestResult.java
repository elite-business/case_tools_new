package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for query test results
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryTestResult {
    private boolean success;
    private List<String> columns;
    private int rowCount;
    private long executionTimeMs;
    private String errorMessage;
    private String message;
}