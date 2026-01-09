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
     * Find by fingerprint
     */
    Optional<AlertHistory> findByFingerprint(String fingerprint);

    /**
     * Find by Grafana rule UID
     */
    List<AlertHistory> findByGrafanaRuleUid(String grafanaRuleUid);

    /**
     * Find alerts received between dates
     */
    Page<AlertHistory> findByReceivedAtBetween(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Find alerts by status
     */
    List<AlertHistory> findByStatus(AlertHistory.AlertHistoryStatus status);

    /**
     * Count alerts by status
     */
    @Query("SELECT a.status, COUNT(a) FROM AlertHistory a GROUP BY a.status")
    List<Object[]> countAlertsByStatus();

    /**
     * Count alerts by status
     */
    long countByStatus(AlertHistory.AlertHistoryStatus status);
    
    /**
     * Find alerts by case ID
     */
    Optional<AlertHistory> findByCaseId(Long caseId);
    
    /**
     * Find recent alerts
     */
    List<AlertHistory> findTop100ByOrderByReceivedAtDesc();
    
    /**
     * Check if duplicate alert exists within time window
     */
    boolean existsByFingerprintAndReceivedAtAfter(String fingerprint, LocalDateTime afterTime);
}