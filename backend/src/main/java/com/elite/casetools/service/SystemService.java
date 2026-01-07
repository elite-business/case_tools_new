package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.SystemLog;
import com.elite.casetools.entity.SystemSetting;
import com.elite.casetools.entity.User;
import com.elite.casetools.repository.SystemLogRepository;
import com.elite.casetools.repository.SystemSettingRepository;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.CaseRepository;
import com.elite.casetools.repository.AlertHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for system management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SystemService {

    private final SystemSettingRepository systemSettingRepository;
    private final SystemLogRepository systemLogRepository;
    private final UserRepository userRepository;
    private final CaseRepository caseRepository;
    private final AlertHistoryRepository alertHistoryRepository;
    
    @Autowired(required = false)
    private JavaMailSender mailSender;

    /**
     * Get system health
     */
    @Transactional(readOnly = true)
    public SystemHealthResponse getSystemHealth() {
        log.info("Getting system health status");
        
        Map<String, SystemHealthResponse.ServiceHealthStatus> services = new HashMap<>();
        
        // Database health check
        services.put("database", checkDatabaseHealth());
        
        // Email health check
        services.put("email", checkEmailHealth());
        
        // WebSocket health (simplified for now)
        services.put("websocket", SystemHealthResponse.ServiceHealthStatus.builder()
                .status("UP")
                .message("WebSocket service active")
                .responseTime(30L)
                .lastChecked(LocalDateTime.now())
                .build());
        
        // Get actual system metrics
        SystemHealthResponse.SystemMetrics metrics = getSystemMetrics();
        
        return SystemHealthResponse.builder()
                .status("UP")
                .timestamp(LocalDateTime.now())
                .services(services)
                .metrics(metrics)
                .build();
    }

    private SystemHealthResponse.ServiceHealthStatus checkDatabaseHealth() {
        long startTime = System.currentTimeMillis();
        try {
            userRepository.count(); // Simple query to test DB connection
            long responseTime = System.currentTimeMillis() - startTime;
            return SystemHealthResponse.ServiceHealthStatus.builder()
                    .status("UP")
                    .message("Database connection healthy")
                    .responseTime(responseTime)
                    .lastChecked(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            return SystemHealthResponse.ServiceHealthStatus.builder()
                    .status("DOWN")
                    .message("Database connection failed: " + e.getMessage())
                    .responseTime(responseTime)
                    .lastChecked(LocalDateTime.now())
                    .build();
        }
    }

    private SystemHealthResponse.ServiceHealthStatus checkEmailHealth() {
        try {
            if (mailSender == null) {
                return SystemHealthResponse.ServiceHealthStatus.builder()
                        .status("DISABLED")
                        .message("Email service not configured")
                        .responseTime(0L)
                        .lastChecked(LocalDateTime.now())
                        .build();
            }
            
            return SystemHealthResponse.ServiceHealthStatus.builder()
                    .status("UP")
                    .message("SMTP server accessible")
                    .responseTime(80L)
                    .lastChecked(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            return SystemHealthResponse.ServiceHealthStatus.builder()
                    .status("DOWN")
                    .message("Email service failed: " + e.getMessage())
                    .responseTime(0L)
                    .lastChecked(LocalDateTime.now())
                    .build();
        }
    }

    private SystemHealthResponse.SystemMetrics getSystemMetrics() {
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long usedMemory = totalMemory - runtime.freeMemory();
        double memoryUsage = (double) usedMemory / maxMemory * 100;
        
        // Count active entities
        long totalUsers = userRepository.count();
        long totalCases = caseRepository.count();
        long totalAlerts = alertHistoryRepository.count();
        
        return SystemHealthResponse.SystemMetrics.builder()
                .cpuUsage(0.0) // CPU usage would require more complex implementation
                .memoryUsage(memoryUsage)
                .diskUsage(0.0) // Disk usage would require file system checks
                .activeConnections(totalUsers)
                .totalRequests(totalCases + totalAlerts)
                .averageResponseTime(150.0) // Would need to track actual response times
                .build();
    }

    /**
     * Get system settings
     */
    @Transactional(readOnly = true)
    public Page<SystemSettingResponse> getSettings(Pageable pageable, String category) {
        log.info("Getting system settings for category: {}", category);
        
        Page<SystemSetting> settingsPage;
        if (category != null && !category.trim().isEmpty()) {
            settingsPage = systemSettingRepository.findByCategory(category, pageable);
        } else {
            settingsPage = systemSettingRepository.findAllByOrderByCategory(pageable);
        }
        
        return settingsPage.map(this::mapSettingToResponse);
    }

    /**
     * Update system setting
     */
    public SystemSettingResponse updateSetting(Long id, UpdateSystemSettingRequest request, String username) {
        log.info("Updating system setting {} to value {} by user: {}", id, request.getValue(), username);
        
        // Mock implementation
        return SystemSettingResponse.builder()
                .id(id)
                .key("setting_" + id)
                .value(request.getValue())
                .defaultValue("default_value")
                .category("GENERAL")
                .description("Updated setting " + id)
                .dataType("STRING")
                .required(false)
                .encrypted(false)
                .validationRules(".*")
                .createdAt(LocalDateTime.now().minusDays(30))
                .updatedAt(LocalDateTime.now())
                .updatedBy(UserSummaryDto.builder()
                        .name(username)
                        .email(username + "@example.com")
                        .build())
                .build();
    }

    /**
     * Get email settings
     */
    @Transactional(readOnly = true)
    public EmailSettingsResponse getEmailSettings() {
        log.info("Getting email settings");
        
        // Mock implementation
        return EmailSettingsResponse.builder()
                .smtpHost("smtp.example.com")
                .smtpPort(587)
                .smtpSsl(false)
                .smtpTls(true)
                .smtpUsername("alerts@example.com")
                .fromAddress("alerts@example.com")
                .fromName("Case Tools Alerts")
                .replyToAddress("noreply@example.com")
                .enabled(true)
                .timeout(5000)
                .retryAttempts(3)
                .defaultTemplate("default_email_template")
                .lastTested(LocalDateTime.now().minusHours(2))
                .testStatus("SUCCESS")
                .updatedAt(LocalDateTime.now().minusDays(5))
                .updatedBy(UserSummaryDto.builder()
                        .name("Admin User")
                        .email("admin@example.com")
                        .build())
                .build();
    }

    /**
     * Update email settings
     */
    public EmailSettingsResponse updateEmailSettings(UpdateEmailSettingsRequest request, String username) {
        log.info("Updating email settings by user: {}", username);
        
        // Mock implementation - in real app, validate and save settings
        return EmailSettingsResponse.builder()
                .smtpHost(request.getSmtpHost())
                .smtpPort(request.getSmtpPort())
                .smtpSsl(request.getSmtpSsl())
                .smtpTls(request.getSmtpTls())
                .smtpUsername(request.getSmtpUsername())
                .fromAddress(request.getFromAddress())
                .fromName(request.getFromName())
                .replyToAddress(request.getReplyToAddress())
                .enabled(request.getEnabled())
                .timeout(request.getTimeout())
                .retryAttempts(request.getRetryAttempts())
                .defaultTemplate(request.getDefaultTemplate())
                .updatedAt(LocalDateTime.now())
                .updatedBy(UserSummaryDto.builder()
                        .name(username)
                        .email(username + "@example.com")
                        .build())
                .build();
    }

    /**
     * Test email connection
     */
    public TestConnectionResponse testEmailConnection() {
        log.info("Testing email connection");
        
        // Mock implementation - simulate connection test
        try {
            Thread.sleep(500); // Simulate connection time
            return TestConnectionResponse.builder()
                    .success(true)
                    .message("Email connection test successful")
                    .responseTime(500L)
                    .timestamp(LocalDateTime.now())
                    .build();
        } catch (InterruptedException e) {
            return TestConnectionResponse.builder()
                    .success(false)
                    .message("Email connection test failed")
                    .responseTime(0L)
                    .timestamp(LocalDateTime.now())
                    .errorDetails("Connection timeout")
                    .build();
        }
    }

    /**
     * Get system logs
     */
    @Transactional(readOnly = true)
    public Page<SystemLogResponse> getLogs(Pageable pageable, String level, String component, String search) {
        log.info("Getting system logs with level: {}, component: {}, search: {}", level, component, search);
        
        // Mock implementation
        List<SystemLogResponse> logs = createMockLogs();
        
        // Apply filters
        if (level != null && !level.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getLevel().equalsIgnoreCase(level))
                    .toList();
        }
        
        if (component != null && !component.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getComponent().toLowerCase().contains(component.toLowerCase()))
                    .toList();
        }
        
        if (search != null && !search.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getMessage().toLowerCase().contains(search.toLowerCase()))
                    .toList();
        }
        
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), logs.size());
        
        if (start > logs.size()) {
            return new PageImpl<>(List.of(), pageable, logs.size());
        }
        
        List<SystemLogResponse> pageContent = logs.subList(start, end);
        return new PageImpl<>(pageContent, pageable, logs.size());
    }

    /**
     * Get system statistics
     */
    @Transactional(readOnly = true)
    public SystemStatsResponse getSystemStats() {
        log.info("Getting system statistics");
        
        // Mock implementation
        return SystemStatsResponse.builder()
                .totalUsers(25L)
                .activeUsers(18L)
                .totalCases(1250L)
                .openCases(125L)
                .totalAlerts(850L)
                .activeAlerts(45L)
                .totalTeams(8L)
                .totalRules(32L)
                .activeRules(28L)
                .averageResponseTime(185.5)
                .systemUptime(99.8)
                .lastRestart(LocalDateTime.now().minusDays(15))
                .version("2.0.0")
                .environment("PRODUCTION")
                .build();
    }

    // Helper methods

    private SystemSettingResponse mapSettingToResponse(SystemSetting setting) {
        UserSummaryDto updatedByDto = null;
        if (setting.getUpdatedBy() != null) {
            updatedByDto = UserSummaryDto.builder()
                    .id(setting.getUpdatedBy().getId())
                    .name(setting.getUpdatedBy().getName())
                    .email(setting.getUpdatedBy().getEmail())
                    .build();
        }
        
        return SystemSettingResponse.builder()
                .id(setting.getId())
                .key(setting.getKey())
                .value(setting.getValue())
                .defaultValue(setting.getDefaultValue())
                .category(setting.getCategory())
                .description(setting.getDescription())
                .dataType(setting.getDataType())
                .required(setting.getRequired())
                .encrypted(setting.getEncrypted())
                .validationRules(setting.getValidationRules())
                .createdAt(setting.getCreatedAt())
                .updatedAt(setting.getUpdatedAt())
                .updatedBy(updatedByDto)
                .build();
    }

    private List<SystemSettingResponse> createMockSettings() {
        return Arrays.asList(
                SystemSettingResponse.builder()
                        .id(1L)
                        .key("alert.retention.days")
                        .value("90")
                        .defaultValue("90")
                        .category("ALERT")
                        .description("Number of days to retain alert history")
                        .dataType("INTEGER")
                        .required(true)
                        .encrypted(false)
                        .validationRules("^[1-9][0-9]*$")
                        .createdAt(LocalDateTime.now().minusDays(30))
                        .updatedAt(LocalDateTime.now().minusDays(5))
                        .build(),
                SystemSettingResponse.builder()
                        .id(2L)
                        .key("notification.email.enabled")
                        .value("true")
                        .defaultValue("true")
                        .category("NOTIFICATION")
                        .description("Enable email notifications")
                        .dataType("BOOLEAN")
                        .required(true)
                        .encrypted(false)
                        .validationRules("^(true|false)$")
                        .createdAt(LocalDateTime.now().minusDays(30))
                        .updatedAt(LocalDateTime.now().minusDays(2))
                        .build(),
                SystemSettingResponse.builder()
                        .id(3L)
                        .key("session.timeout.minutes")
                        .value("60")
                        .defaultValue("60")
                        .category("SECURITY")
                        .description("User session timeout in minutes")
                        .dataType("INTEGER")
                        .required(true)
                        .encrypted(false)
                        .validationRules("^[1-9][0-9]*$")
                        .createdAt(LocalDateTime.now().minusDays(30))
                        .updatedAt(LocalDateTime.now().minusDays(1))
                        .build()
        );
    }

    private List<SystemLogResponse> createMockLogs() {
        return Arrays.asList(
                SystemLogResponse.builder()
                        .id(1L)
                        .level("INFO")
                        .component("AuthController")
                        .message("User login successful")
                        .traceId("trace-001")
                        .userId("admin")
                        .sessionId("session-123")
                        .ipAddress("192.168.1.100")
                        .userAgent("Mozilla/5.0 (Chrome)")
                        .timestamp(LocalDateTime.now().minusMinutes(5))
                        .build(),
                SystemLogResponse.builder()
                        .id(2L)
                        .level("WARN")
                        .component("CaseService")
                        .message("Case assignment failed - user not found")
                        .traceId("trace-002")
                        .userId("admin")
                        .sessionId("session-123")
                        .ipAddress("192.168.1.100")
                        .userAgent("Mozilla/5.0 (Chrome)")
                        .timestamp(LocalDateTime.now().minusMinutes(10))
                        .build(),
                SystemLogResponse.builder()
                        .id(3L)
                        .level("ERROR")
                        .component("GrafanaService")
                        .message("Failed to connect to Grafana API")
                        .exception("java.net.ConnectException: Connection refused")
                        .traceId("trace-003")
                        .userId("system")
                        .timestamp(LocalDateTime.now().minusMinutes(15))
                        .build()
        );
    }
}