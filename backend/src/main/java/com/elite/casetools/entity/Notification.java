package com.elite.casetools.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Entity to track sent notifications (email, webhook, etc.)
 * Maps to casemanagement.notification table
 */
@Entity
@Table(name = "notification", schema = "casemanagement",
       indexes = {
           @Index(name = "idx_notification_case_id", columnList = "case_id"),
           @Index(name = "idx_notification_user_id", columnList = "recipient_user_id"),
           @Index(name = "idx_notification_type", columnList = "notification_type"),
           @Index(name = "idx_notification_status", columnList = "status"),
           @Index(name = "idx_notification_sent_at", columnList = "sent_at"),
           @Index(name = "idx_notification_channel", columnList = "channel")
       })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id")
    private Case caseEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id")
    private User recipientUser;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 255)
    private String recipientName;

    @Column(name = "notification_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private NotificationType notificationType;

    @Column(name = "channel", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private NotificationChannel channel;

    @Column(name = "priority", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    @Column(name = "subject", length = 500)
    private String subject;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "template_id", length = 100)
    private String templateId;

    @Column(name = "template_variables", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> templateVariables;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    // External service tracking
    @Column(name = "external_id", length = 255)
    private String externalId;

    @Column(name = "external_reference", length = 255)
    private String externalReference;

    @Column(name = "provider_response", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> providerResponse;

    // Webhook specific
    @Column(name = "webhook_url", columnDefinition = "TEXT")
    private String webhookUrl;

    @Column(name = "webhook_method", length = 10)
    private String webhookMethod;

    @Column(name = "webhook_headers", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> webhookHeaders;

    @Column(name = "webhook_payload", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> webhookPayload;

    // SMS specific
    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    // Slack specific
    @Column(name = "slack_channel", length = 100)
    private String slackChannel;

    @Column(name = "slack_user_id", length = 50)
    private String slackUserId;

    // Teams specific
    @Column(name = "teams_channel", length = 100)
    private String teamsChannel;

    // Metadata
    @Column(name = "tracking_id", length = 100, unique = true)
    private String trackingId;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "batch_id", length = 100)
    private String batchId;

    @Column(name = "additional_metadata", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> additionalMetadata;

    // Cost tracking
    @Column(name = "cost_cents")
    private Integer costCents;

    @Column(name = "cost_currency", length = 3)
    private String costCurrency;

    public enum NotificationType {
        CASE_CREATED,
        CASE_ASSIGNED,
        CASE_UPDATED,
        CASE_ESCALATED,
        CASE_RESOLVED,
        CASE_CLOSED,
        SLA_BREACH,
        SLA_WARNING,
        COMMENT_ADDED,
        ALERT_FIRED,
        ALERT_RESOLVED,
        REMINDER,
        DIGEST,
        CUSTOM
    }

    public enum NotificationChannel {
        EMAIL,
        SMS,
        SLACK,
        TEAMS,
        WEBHOOK,
        PUSH,
        IN_APP,
        DISCORD,
        TELEGRAM
    }

    public enum NotificationStatus {
        PENDING,
        SENDING,
        SENT,
        DELIVERED,
        READ,
        FAILED,
        CANCELLED,
        EXPIRED
    }

    public enum Priority {
        LOW(1),
        NORMAL(2),
        HIGH(3),
        URGENT(4),
        CRITICAL(5);

        private final int level;

        Priority(int level) {
            this.level = level;
        }

        public int getLevel() {
            return level;
        }
    }

    // Helper methods
    public boolean isPending() {
        return status == NotificationStatus.PENDING;
    }

    public boolean isSent() {
        return status == NotificationStatus.SENT || status == NotificationStatus.DELIVERED || status == NotificationStatus.READ;
    }

    public boolean isFailed() {
        return status == NotificationStatus.FAILED;
    }

    public boolean isDelivered() {
        return status == NotificationStatus.DELIVERED || status == NotificationStatus.READ;
    }

    public boolean isRead() {
        return status == NotificationStatus.READ;
    }

    public boolean canRetry() {
        return (status == NotificationStatus.FAILED || status == NotificationStatus.PENDING) 
               && retryCount < maxRetries;
    }

    public void incrementRetryCount() {
        this.retryCount++;
    }

    public boolean hasExceededMaxRetries() {
        return retryCount >= maxRetries;
    }

    public void markAsSent() {
        this.status = NotificationStatus.SENT;
        this.sentAt = LocalDateTime.now();
        this.errorMessage = null;
        this.errorCode = null;
    }

    public void markAsDelivered() {
        this.status = NotificationStatus.DELIVERED;
        this.deliveredAt = LocalDateTime.now();
    }

    public void markAsRead() {
        this.status = NotificationStatus.READ;
        this.readAt = LocalDateTime.now();
    }

    public void markAsFailed(String errorMessage, String errorCode) {
        this.status = NotificationStatus.FAILED;
        this.errorMessage = errorMessage;
        this.errorCode = errorCode;
        incrementRetryCount();
    }

    public void markAsCancelled() {
        this.status = NotificationStatus.CANCELLED;
    }

    public String getDisplayChannel() {
        return switch (channel) {
            case EMAIL -> "📧 Email";
            case SMS -> "📱 SMS";
            case SLACK -> "💬 Slack";
            case TEAMS -> "👥 Teams";
            case WEBHOOK -> "🔗 Webhook";
            case PUSH -> "🔔 Push";
            case IN_APP -> "📱 In-App";
            case DISCORD -> "🎮 Discord";
            case TELEGRAM -> "✈️ Telegram";
        };
    }
}