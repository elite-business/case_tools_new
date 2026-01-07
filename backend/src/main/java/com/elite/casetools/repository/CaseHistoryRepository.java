package com.elite.casetools.repository;

import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.CaseHistory;
import com.elite.casetools.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for CaseHistory entity
 */
@Repository
public interface CaseHistoryRepository extends JpaRepository<CaseHistory, Long> {

    /**
     * Find all history for a specific case
     */
    List<CaseHistory> findByCaseEntityOrderByChangedAtDesc(Case caseEntity);

    /**
     * Find all history for a specific case with pagination
     */
    Page<CaseHistory> findByCaseEntityOrderByChangedAtDesc(Case caseEntity, Pageable pageable);

    /**
     * Find history by case ID
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.caseEntity.id = :caseId ORDER BY ch.changedAt DESC")
    List<CaseHistory> findByCaseId(@Param("caseId") Long caseId);

    /**
     * Find history by case ID with pagination
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.caseEntity.id = :caseId ORDER BY ch.changedAt DESC")
    Page<CaseHistory> findByCaseId(@Param("caseId") Long caseId, Pageable pageable);

    /**
     * Find history by change type
     */
    List<CaseHistory> findByChangeTypeOrderByChangedAtDesc(CaseHistory.ChangeType changeType);

    /**
     * Find history by user
     */
    List<CaseHistory> findByChangedByOrderByChangedAtDesc(User user);

    /**
     * Find history by user and date range
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changedBy = :user AND ch.changedAt BETWEEN :startDate AND :endDate ORDER BY ch.changedAt DESC")
    Page<CaseHistory> findByChangedByAndDateRange(
            @Param("user") User user,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Find history by change type and case
     */
    List<CaseHistory> findByCaseEntityAndChangeTypeOrderByChangedAtDesc(Case caseEntity, CaseHistory.ChangeType changeType);

    /**
     * Find status changes for a case
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.caseEntity = :caseEntity AND ch.changeType = 'STATUS_CHANGE' ORDER BY ch.changedAt DESC")
    List<CaseHistory> findStatusChangesByCaseEntity(@Param("caseEntity") Case caseEntity);

    /**
     * Find assignment changes for a case
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.caseEntity = :caseEntity AND ch.changeType = 'ASSIGNMENT_CHANGE' ORDER BY ch.changedAt DESC")
    List<CaseHistory> findAssignmentChangesByCaseEntity(@Param("caseEntity") Case caseEntity);

    /**
     * Find recent changes across all cases
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changedAt >= :since ORDER BY ch.changedAt DESC")
    List<CaseHistory> findRecentChanges(@Param("since") LocalDateTime since);

    /**
     * Count changes by type for a specific case
     */
    @Query("SELECT ch.changeType, COUNT(ch) FROM CaseHistory ch WHERE ch.caseEntity = :caseEntity GROUP BY ch.changeType")
    List<Object[]> countChangeTypesByCase(@Param("caseEntity") Case caseEntity);

    /**
     * Count changes by user
     */
    @Query("SELECT ch.changedBy, COUNT(ch) FROM CaseHistory ch WHERE ch.changedAt >= :since GROUP BY ch.changedBy ORDER BY COUNT(ch) DESC")
    List<Object[]> countChangesByUser(@Param("since") LocalDateTime since);

    /**
     * Find automated changes
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.automationTriggered = true ORDER BY ch.changedAt DESC")
    List<CaseHistory> findAutomatedChanges();

    /**
     * Find manual changes
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.automationTriggered = false ORDER BY ch.changedAt DESC")
    List<CaseHistory> findManualChanges();

    /**
     * Find changes that triggered notifications
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.notificationSent = true ORDER BY ch.changedAt DESC")
    List<CaseHistory> findChangesWithNotifications();

    /**
     * Find changes by date range
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changedAt BETWEEN :startDate AND :endDate ORDER BY ch.changedAt DESC")
    Page<CaseHistory> findByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Find changes by multiple change types
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changeType IN :changeTypes ORDER BY ch.changedAt DESC")
    List<CaseHistory> findByChangeTypes(@Param("changeTypes") List<CaseHistory.ChangeType> changeTypes);

    /**
     * Get change statistics for a case
     */
    @Query("""
            SELECT 
                COUNT(ch) as totalChanges,
                COUNT(CASE WHEN ch.automationTriggered = true THEN 1 END) as automatedChanges,
                COUNT(CASE WHEN ch.notificationSent = true THEN 1 END) as notificationsSent,
                COUNT(DISTINCT ch.changedBy) as uniqueUsers
            FROM CaseHistory ch 
            WHERE ch.caseEntity = :caseEntity
            """)
    Object getCaseStatistics(@Param("caseEntity") Case caseEntity);

    /**
     * Get daily change counts
     */
    @Query(value = """
            SELECT 
                DATE_TRUNC('day', ch.changed_at) as date,
                COUNT(*) as changeCount
            FROM casemanagement.case_history ch 
            WHERE ch.changed_at >= :since
            GROUP BY DATE_TRUNC('day', ch.changed_at)
            ORDER BY date DESC
            """, nativeQuery = true)
    List<Object[]> getDailyChangeCounts(@Param("since") LocalDateTime since);

    /**
     * Find last change of specific type for a case
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.caseEntity = :caseEntity AND ch.changeType = :changeType ORDER BY ch.changedAt DESC")
    List<CaseHistory> findLatestChangeByTypeAndCase(
            @Param("caseEntity") Case caseEntity, 
            @Param("changeType") CaseHistory.ChangeType changeType,
            Pageable pageable);

    /**
     * Find changes by field name
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.fieldName = :fieldName ORDER BY ch.changedAt DESC")
    List<CaseHistory> findByFieldName(@Param("fieldName") String fieldName);

    /**
     * Find case creation history
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changeType = 'STATUS_CHANGE' AND ch.oldStatus IS NULL ORDER BY ch.changedAt DESC")
    List<CaseHistory> findCaseCreationHistory();

    /**
     * Find escalation history
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changeType = 'ESCALATION' ORDER BY ch.changedAt DESC")
    List<CaseHistory> findEscalationHistory();

    /**
     * Count changes in date range
     */
    @Query("SELECT COUNT(ch) FROM CaseHistory ch WHERE ch.changedAt BETWEEN :startDate AND :endDate")
    long countChangesByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    /**
     * Find changes by IP address (for security auditing)
     */
    List<CaseHistory> findByIpAddressOrderByChangedAtDesc(String ipAddress);

    /**
     * Delete history older than specified date
     */
    @Query("DELETE FROM CaseHistory ch WHERE ch.changedAt < :cutoffDate")
    int deleteHistoryOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Find bulk update operations
     */
    @Query("SELECT ch FROM CaseHistory ch WHERE ch.changeType = 'BULK_UPDATE' ORDER BY ch.changedAt DESC")
    List<CaseHistory> findBulkUpdates();
}