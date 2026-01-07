package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for dashboard metrics display
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetrics {
    // Case metrics
    private long totalCases;
    private long openCases;
    private long casesLast24Hours;
    private long casesLast30Days;
    
    // Alert metrics
    private long totalAlerts;
    private long firingAlerts;
    private long alertsLast24Hours;
    
    // Notification metrics
    private long totalNotifications;
    private long pendingNotifications;
    private long failedNotifications;
    
    // SLA metrics
    private long slaBreachedCases;
    
    // Metadata
    private LocalDateTime generatedAt;
}
