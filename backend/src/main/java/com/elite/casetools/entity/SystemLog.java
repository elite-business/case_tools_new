package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * SystemLog entity representing application logs
 * Maps to casemanagement.system_log table
 */
@Entity
@Table(name = "system_log", schema = "casemanagement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemLog extends BaseEntity {

    @Column(name = "level", nullable = false, length = 20)
    private String level;

    @Column(name = "component", length = 100)
    private String component;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "exception", columnDefinition = "TEXT")
    private String exception;

    @Column(name = "trace_id", length = 50)
    private String traceId;

    @Column(name = "user_id", length = 50)
    private String userId;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "timestamp", nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}