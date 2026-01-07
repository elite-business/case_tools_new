package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for case trend data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseTrend {
    private LocalDate date;
    private int createdCases;
    private int closedCases;
}
