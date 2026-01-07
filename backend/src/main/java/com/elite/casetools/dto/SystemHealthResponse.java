package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO for system health response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemHealthResponse {
    private String status; // UP, DOWN, DEGRADED
    private LocalDateTime timestamp;
    private Map<String, ServiceHealthStatus> services;
    private SystemMetrics metrics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceHealthStatus {
        private String status;
        private String message;
        private Long responseTime;
        private LocalDateTime lastChecked;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemMetrics {
        private Double cpuUsage;
        private Double memoryUsage;
        private Double diskUsage;
        private Long activeConnections;
        private Long totalRequests;
        private Double averageResponseTime;
    }
}