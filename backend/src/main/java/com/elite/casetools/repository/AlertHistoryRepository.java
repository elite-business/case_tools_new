package com.elite.casetools.repository;

import com.elite.casetools.entity.AlertHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for AlertHistory entities
 */
@Repository
public interface AlertHistoryRepository extends JpaRepository<AlertHistory, Long>, JpaSpecificationExecutor<AlertHistory> {

    /**
     * Find by alert ID
     */
    Optional<AlertHistory> findByAlertId(String alertId);

    /**
     * Find by Grafana alert ID
     */
    Optional<AlertHistory> findByGrafanaAlertId(String grafanaAlertId);

    /**
     * Find by status
     */
    Page<AlertHistory> findByStatus(AlertHistory.AlertStatus status, Pageable pageable);

    /**
     * Find by severity
     */
    Page<AlertHistory> findBySeverity(AlertHistory.AlertSeverity severity, Pageable pageable);

    /**
     * Find alerts by assigned user - using JSON contains
     */
    @Query("SELECT a FROM AlertHistory a WHERE CAST(a.assignedTo AS string) LIKE CONCAT('%\"userIds\":[%', :userId, '%]%')")
    Page<AlertHistory> findByAssignedUserId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Find alerts created between dates
     */
    Page<AlertHistory> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Find open alerts older than specified time
     */
    @Query("SELECT a FROM AlertHistory a WHERE a.status = 'OPEN' AND a.createdAt < :cutoffTime")
    List<AlertHistory> findStaleAlerts(@Param("cutoffTime") LocalDateTime cutoffTime);

    /**
     * Count alerts by status
     */
    @Query("SELECT a.status, COUNT(a) FROM AlertHistory a GROUP BY a.status")
    List<Object[]> countAlertsByStatus();

    /**
     * Count alerts by severity
     */
    @Query("SELECT a.severity, COUNT(a) FROM AlertHistory a GROUP BY a.severity")
    List<Object[]> countAlertsBySeverity();

    /**
     * Count alerts by status
     */
    long countByStatus(AlertHistory.AlertStatus status);

    /**
     * Count alerts by severity
     */
    long countBySeverity(AlertHistory.AlertSeverity severity);
    
    /**
     * Count alerts by assigned user and status - using JSON contains
     */
    @Query("SELECT COUNT(a) FROM AlertHistory a WHERE CAST(a.assignedTo AS string) LIKE CONCAT('%\"userIds\":[%', :userId, '%]%') AND a.status IN :statuses")
    long countByAssignedUserAndStatusIn(@Param("userId") Long userId, @Param("statuses") List<AlertHistory.AlertStatus> statuses);
    
    /**
     * Find alerts by assigned user and status - using JSON contains
     */
    @Query("SELECT a FROM AlertHistory a WHERE CAST(a.assignedTo AS string) LIKE CONCAT('%\"userIds\":[%', :userId, '%]%') AND a.status IN :statuses")
    List<AlertHistory> findByAssignedUserAndStatusIn(@Param("userId") Long userId, @Param("statuses") List<AlertHistory.AlertStatus> statuses);
    
    /**
     * Find recent alerts for user - using JSON contains
     */
    @Query("SELECT a FROM AlertHistory a WHERE CAST(a.assignedTo AS string) LIKE CONCAT('%\"userIds\":[%', :userId, '%]%') ORDER BY a.createdAt DESC")
    List<AlertHistory> findRecentAlertsForUser(@Param("userId") Long userId, Pageable pageable);
}