package com.elite.casetools.repository;

import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.Notification;
import com.elite.casetools.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Notification entity
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Find notifications by tracking ID
     */
    Optional<Notification> findByTrackingId(String trackingId);

    /**
     * Find notifications for a specific case
     */
    List<Notification> findByCaseEntityOrderByCreatedAtDesc(Case caseEntity);

    /**
     * Find notifications for a specific user
     */
    Page<Notification> findByRecipientUserOrderByCreatedAtDesc(User user, Pageable pageable);

    /**
     * Find notifications by email
     */
    List<Notification> findByRecipientEmailOrderByCreatedAtDesc(String email);

    /**
     * Find notifications by status
     */
    List<Notification> findByStatusOrderByCreatedAtDesc(Notification.NotificationStatus status);

    /**
     * Find pending notifications (ready to send)
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'PENDING' AND (n.scheduledAt IS NULL OR n.scheduledAt <= :now) ORDER BY n.priority DESC, n.createdAt ASC")
    List<Notification> findPendingNotifications(@Param("now") LocalDateTime now);

    /**
     * Find notifications ready for retry
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'FAILED' AND n.retryCount < n.maxRetries AND (n.nextRetryAt IS NULL OR n.nextRetryAt <= :now) ORDER BY n.priority DESC, n.nextRetryAt ASC")
    List<Notification> findNotificationsForRetry(@Param("now") LocalDateTime now);

    /**
     * Find notifications by channel
     */
    List<Notification> findByChannelOrderByCreatedAtDesc(Notification.NotificationChannel channel);

    /**
     * Find notifications by type
     */
    List<Notification> findByNotificationTypeOrderByCreatedAtDesc(Notification.NotificationType type);

    /**
     * Find notifications by priority
     */
    List<Notification> findByPriorityOrderByCreatedAtDesc(Notification.Priority priority);

    /**
     * Find failed notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'FAILED' ORDER BY n.createdAt DESC")
    List<Notification> findFailedNotifications();

    /**
     * Find notifications by case and type
     */
    List<Notification> findByCaseEntityAndNotificationType(Case caseEntity, Notification.NotificationType type);

    /**
     * Find notifications by user and type
     */
    List<Notification> findByRecipientUserAndNotificationType(User user, Notification.NotificationType type);

    /**
     * Count notifications by status
     */
    @Query("SELECT n.status, COUNT(n) FROM Notification n GROUP BY n.status")
    List<Object[]> countNotificationsByStatus();

    /**
     * Count notifications by channel
     */
    @Query("SELECT n.channel, COUNT(n) FROM Notification n GROUP BY n.channel")
    List<Object[]> countNotificationsByChannel();

    /**
     * Count notifications by type
     */
    @Query("SELECT n.notificationType, COUNT(n) FROM Notification n GROUP BY n.notificationType")
    List<Object[]> countNotificationsByType();

    /**
     * Find unread notifications for user
     */
    @Query("SELECT n FROM Notification n WHERE n.recipientUser = :user AND n.status NOT IN ('READ', 'CANCELLED') ORDER BY n.createdAt DESC")
    List<Notification> findUnreadNotificationsByUser(@Param("user") User user);

    /**
     * Count unread notifications for user
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipientUser = :user AND n.status NOT IN ('read', 'CANCELLED')")
    long countUnreadNotificationsByUser(@Param("user") User user);

    /**
     * Find notifications by date range
     */
    @Query("SELECT n FROM Notification n WHERE n.createdAt BETWEEN :startDate AND :endDate ORDER BY n.createdAt DESC")
    Page<Notification> findByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Find notifications sent today
     */
    @Query("SELECT n FROM Notification n WHERE n.sentAt >= :startOfDay AND n.sentAt < :endOfDay")
    List<Notification> findNotificationsSentToday(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay);

    /**
     * Find notifications by template
     */
    List<Notification> findByTemplateId(String templateId);

    /**
     * Find notifications by external ID
     */
    Optional<Notification> findByExternalId(String externalId);

    /**
     * Find notifications by correlation ID
     */
    List<Notification> findByCorrelationId(String correlationId);

    /**
     * Find notifications by batch ID
     */
    List<Notification> findByBatchId(String batchId);

    /**
     * Find high priority notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.priority IN ('HIGH', 'URGENT', 'CRITICAL') ORDER BY n.priority DESC, n.createdAt ASC")
    List<Notification> findHighPriorityNotifications();

    /**
     * Find scheduled notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.scheduledAt > :now ORDER BY n.scheduledAt ASC")
    List<Notification> findScheduledNotifications(@Param("now") LocalDateTime now);

    /**
     * Find expired notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'PENDING' AND n.createdAt < :expirationDate")
    List<Notification> findExpiredNotifications(@Param("expirationDate") LocalDateTime expirationDate);

    /**
     * Get notification statistics
     */
    @Query("""
            SELECT 
                COUNT(n) as total,
                SUM(CASE WHEN n.status = 'SENT' OR n.status = 'DELIVERED' OR n.status = 'READ' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN n.status = 'FAILED' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN n.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                AVG(n.retryCount) as avgRetries
            FROM Notification n
            WHERE n.createdAt >= :since
            """)
    Object getNotificationStatistics(@Param("since") LocalDateTime since);

    /**
     * Get delivery statistics by channel
     */
    @Query(value = """
            SELECT 
                n.channel,
                COUNT(*) as total,
                SUM(CASE WHEN n.status IN ('SENT', 'DELIVERED', 'READ') THEN 1 ELSE 0 END) as delivered,
                AVG(EXTRACT(EPOCH FROM (n.sent_at - n.created_at))) as avgDeliveryTimeSeconds
            FROM casemanagement.notification n 
            WHERE n.created_at >= :since
            GROUP BY n.channel
            """, nativeQuery = true)
    List<Object[]> getDeliveryStatisticsByChannel(@Param("since") LocalDateTime since);

    /**
     * Find duplicate notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.correlationId = :correlationId AND n.recipientEmail = :email AND n.notificationType = :type AND n.createdAt >= :since")
    List<Notification> findPotentialDuplicates(
            @Param("correlationId") String correlationId,
            @Param("email") String email,
            @Param("type") Notification.NotificationType type,
            @Param("since") LocalDateTime since);

    /**
     * Find notifications for cleanup (old and processed)
     */
    @Query("SELECT n FROM Notification n WHERE n.createdAt < :cutoffDate AND n.status IN ('DELIVERED', 'READ', 'CANCELLED', 'EXPIRED')")
    List<Notification> findNotificationsForCleanup(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Get daily notification counts
     */
    @Query(value = """
            SELECT 
                DATE_TRUNC('day', n.created_at) as date,
                COUNT(*) as totalNotifications,
                SUM(CASE WHEN n.status IN ('SENT', 'DELIVERED', 'READ') THEN 1 ELSE 0 END) as successfulNotifications
            FROM casemanagement.notification n 
            WHERE n.created_at >= :since
            GROUP BY DATE_TRUNC('day', n.created_at)
            ORDER BY date DESC
            """, nativeQuery = true)
    List<Object[]> getDailyNotificationCounts(@Param("since") LocalDateTime since);

    /**
     * Find notifications by webhook URL
     */
    List<Notification> findByWebhookUrlOrderByCreatedAtDesc(String webhookUrl);

    /**
     * Find notifications by phone number
     */
    List<Notification> findByPhoneNumberOrderByCreatedAtDesc(String phoneNumber);

    /**
     * Find notifications by Slack channel
     */
    List<Notification> findBySlackChannelOrderByCreatedAtDesc(String slackChannel);

    /**
     * Find cost statistics
     */
    @Query("""
            SELECT 
                n.channel,
                COUNT(*) as count,
                SUM(COALESCE(n.costCents, 0)) as totalCostCents,
                AVG(COALESCE(n.costCents, 0)) as avgCostCents
            FROM Notification n
            WHERE n.createdAt >= :since AND n.costCents IS NOT NULL
            GROUP BY n.channel
            """)
    List<Object[]> getCostStatistics(@Param("since") LocalDateTime since);

    /**
     * Delete old notifications
     */
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate AND n.status IN ('DELIVERED', 'READ', 'CANCELLED', 'EXPIRED')")
    int deleteOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);
}