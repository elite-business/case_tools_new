package com.elite.casetools.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating email settings request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmailSettingsRequest {
    @NotBlank(message = "SMTP host is required")
    private String smtpHost;
    
    private Integer smtpPort;
    private Boolean smtpSsl;
    private Boolean smtpTls;
    private String smtpUsername;
    private String smtpPassword;
    
    @Email(message = "Valid email address is required")
    @NotBlank(message = "From address is required")
    private String fromAddress;
    
    private String fromName;
    private String replyToAddress;
    private Boolean enabled;
    private Integer timeout;
    private Integer retryAttempts;
    private String defaultTemplate;
}