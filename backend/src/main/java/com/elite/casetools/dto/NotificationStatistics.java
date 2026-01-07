package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for overall notification statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationStatistics {
    private Long totalNotifications;
    private Long sentNotifications;
    private Long failedNotifications;
    private Long pendingNotifications;
    private Double avgRetries;
}
