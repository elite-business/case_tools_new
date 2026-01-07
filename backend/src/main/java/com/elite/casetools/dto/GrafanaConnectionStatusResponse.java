package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Grafana connection status response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaConnectionStatusResponse {
    private Boolean connected;
    private String status; // CONNECTED, DISCONNECTED, ERROR, UNKNOWN
    private String message;
    private String version;
    private String url;
    private LocalDateTime lastCheck;
    private Long responseTime;
    private String errorDetails;
}