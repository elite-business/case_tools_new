package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating Grafana settings request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGrafanaSettingsRequest {
    @NotBlank(message = "Grafana URL is required")
    private String url;
    
    private String apiKey;
    private String username;
    private String password;
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
}