package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for system log response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemLogResponse {
    private Long id;
    private String level; // ERROR, WARN, INFO, DEBUG
    private String component;
    private String message;
    private String exception;
    private String traceId;
    private String userId;
    private String sessionId;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime timestamp;
}