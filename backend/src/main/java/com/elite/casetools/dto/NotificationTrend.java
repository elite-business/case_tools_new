package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for notification trend data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTrend {
    private LocalDate date;
    private int totalNotifications;
    private int successfulNotifications;
}
