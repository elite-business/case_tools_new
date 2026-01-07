package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for alert trend data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertTrend {
    private LocalDate date;
    private int alertCount;
}
