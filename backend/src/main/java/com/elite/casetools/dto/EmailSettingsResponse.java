package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for email settings response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailSettingsResponse {
    private String smtpHost;
    private Integer smtpPort;
    private Boolean smtpSsl;
    private Boolean smtpTls;
    private String smtpUsername;
    private String fromAddress;
    private String fromName;
    private String replyToAddress;
    private Boolean enabled;
    private Integer timeout;
    private Integer retryAttempts;
    private String defaultTemplate;
    private LocalDateTime lastTested;
    private String testStatus;
    private LocalDateTime updatedAt;
    private UserSummaryDto updatedBy;
}