package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for testing Grafana connection request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestGrafanaConnectionRequest {
    private String url;
    private String apiKey;
    private String username;
    private String password;
    private Boolean verifySSL;
    private Integer timeout;
}