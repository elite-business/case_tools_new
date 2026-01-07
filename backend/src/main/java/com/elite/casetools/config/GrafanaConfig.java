package com.elite.casetools.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "grafana")
@Data
public class GrafanaConfig {

    private String url;
    private String apiToken;
    private String datasourceUid;
    private String folderUid;
    private String notificationChannelUid;
    private Integer timeout;
    private Boolean validateSsl;
    private String organizationId;

    public String getApiUrl() {
        return url.endsWith("/") ? url + "api" : url + "/api";
    }

    public String getAuthHeader() {
        return "Bearer " + apiToken;
    }
}