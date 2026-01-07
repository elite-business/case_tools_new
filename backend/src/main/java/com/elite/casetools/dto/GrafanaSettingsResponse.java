package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Grafana settings response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaSettingsResponse {
    private String url;
    private String apiKey;
    private String username;
    private String organizationId;
    private String datasourceUid;
    private String datasourceName;
    private String notificationChannelUid;
    private String contactPointName;
    private String folderUid;
    private String folderName;
    private Boolean enabled;
    private Integer timeout;
    private Boolean verifySSL;
    private String webhookUrl;
    private String webhookSecret;
    private LocalDateTime lastSync;
    private String syncStatus;
    private LocalDateTime updatedAt;
    private UserSummaryDto updatedBy;
}