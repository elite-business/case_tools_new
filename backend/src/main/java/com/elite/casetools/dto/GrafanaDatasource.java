package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Grafana datasource information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaDatasource {
    private String uid;
    private String name;
    private String type;
    private String url;
    private boolean isDefault;
    private String database;
    private String user;
    private boolean basicAuth;
    private boolean withCredentials;
    private boolean isProxyAccess;
    private String access;
}