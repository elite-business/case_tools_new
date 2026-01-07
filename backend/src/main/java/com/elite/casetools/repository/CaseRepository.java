package com.elite.casetools.repository;

import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Case entity
 */
@Repository
public interface CaseRepository extends JpaRepository<Case, Long>, JpaSpecificationExecutor<Case> {

    /**
     * Find case by case number
     */
    Optional<Case> findByCaseNumber(String caseNumber);

    /**
     * Find cases by status
     */
    List<Case> findByStatus(Case.CaseStatus status);

    /**
     * Find cases assigned to user
     */
    Page<Case> findByAssignedTo(User assignedTo, Pageable pageable);

    /**
     * Find open cases assigned to user
     */
    @Query("SELECT c FROM Case c WHERE c.assignedTo = :user AND c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')")
    List<Case> findOpenCasesByUser(@Param("user") User user);

    /**
     * Find cases by severity
     */
    List<Case> findBySeverity(Case.Severity severity);

    /**
     * Find cases with SLA breach
     */
    @Query("SELECT c FROM Case c WHERE c.slaBreached = true AND c.status NOT IN ('CLOSED', 'CANCELLED')")
    List<Case> findSlaBreachedCases();

    /**
     * Find cases nearing SLA deadline
     */
    @Query("SELECT c FROM Case c WHERE c.slaDeadline <= :threshold " +
           "AND c.status NOT IN ('CLOSED', 'CANCELLED', 'RESOLVED') " +
           "AND c.slaBreached = false")
    List<Case> findCasesNearingSla(@Param("threshold") LocalDateTime threshold);

    /**
     * Find cases by Grafana alert ID
     */
    Optional<Case> findByGrafanaAlertId(String grafanaAlertId);

    /**
     * Find cases by alert fingerprint
     */
    Optional<Case> findByGrafanaAlertUid(String grafanaAlertUid);

    /**
     * Count cases by status
     */
    Long countByStatus(Case.CaseStatus status);

    /**
     * Count open cases by user
     */
    @Query("SELECT COUNT(c) FROM Case c WHERE c.assignedTo = :user AND c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')")
    Long countOpenCasesByUser(@Param("user") User user);

    /**
     * Get case statistics
     */
    @Query("SELECT new map(" +
           "SUM(CASE WHEN c.status = 'OPEN' THEN 1 ELSE 0 END) as openCases, " +
           "SUM(CASE WHEN c.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressCases, " +
           "SUM(CASE WHEN c.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedCases, " +
           "SUM(CASE WHEN c.status = 'CLOSED' THEN 1 ELSE 0 END) as closedCases, " +
           "SUM(CASE WHEN c.slaBreached = true THEN 1 ELSE 0 END) as breachedCases, " +
           "AVG(c.resolutionTimeMinutes) as avgResolutionTime) " +
           "FROM Case c WHERE c.createdAt >= :startDate")
    Object getCaseStatistics(@Param("startDate") LocalDateTime startDate);

    /**
     * Find duplicate cases by alert characteristics
     */
    @Query("SELECT c FROM Case c WHERE c.grafanaAlertUid = :alertUid " +
           "AND c.status NOT IN ('CLOSED', 'CANCELLED') " +
           "AND c.createdAt >= :windowStart " +
           "ORDER BY c.createdAt DESC")
    List<Case> findDuplicateCases(@Param("alertUid") String alertUid, 
                                  @Param("windowStart") LocalDateTime windowStart);

    /**
     * Update case SLA breach status
     */
    @Modifying
    @Query("UPDATE Case c SET c.slaBreached = true WHERE c.slaDeadline < :now " +
           "AND c.status NOT IN ('CLOSED', 'CANCELLED', 'RESOLVED') " +
           "AND c.slaBreached = false")
    int updateSlaBreaches(@Param("now") LocalDateTime now);

    /**
     * Get cases for dashboard
     */
    @Query("SELECT c FROM Case c " +
           "LEFT JOIN FETCH c.assignedTo " +
           "LEFT JOIN FETCH c.assignedBy " +
           "WHERE (:status IS NULL OR c.status = :status) " +
           "AND (:severity IS NULL OR c.severity = :severity) " +
           "AND (:assignedTo IS NULL OR c.assignedTo = :assignedTo) " +
           "AND c.createdAt >= :startDate " +
           "ORDER BY c.severity ASC, c.createdAt DESC")
    Page<Case> findCasesForDashboard(@Param("status") Case.CaseStatus status,
                                     @Param("severity") Case.Severity severity,
                                     @Param("assignedTo") User assignedTo,
                                     @Param("startDate") LocalDateTime startDate,
                                     Pageable pageable);

    /**
     * Search cases
     */
    @Query("SELECT c FROM Case c WHERE " +
           "LOWER(c.caseNumber) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Case> searchCases(@Param("search") String search, Pageable pageable);

    /**
     * Generate next case number
     */
    @Query(value = "SELECT 'CASE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || " +
           "LPAD(CAST(COALESCE(MAX(CAST(SUBSTRING(case_number FROM 11) AS INTEGER)), 0) + 1 AS TEXT), 5, '0') " +
           "FROM casemanagement.case " +
           "WHERE case_number LIKE 'CASE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%'",
           nativeQuery = true)
    String generateNextCaseNumber();

    /**
     * Find cases by date range
     */
    @Query("SELECT c FROM Case c WHERE c.createdAt BETWEEN :startDate AND :endDate")
    List<Case> findCasesByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Get daily case counts
     */
    @Query(value = """
            SELECT 
                DATE_TRUNC('day', c.created_at) as date,
                COUNT(CASE WHEN c.created_at >= DATE_TRUNC('day', c.created_at) THEN 1 END) as createdCases,
                COUNT(CASE WHEN c.resolved_at >= DATE_TRUNC('day', c.created_at) AND c.resolved_at < DATE_TRUNC('day', c.created_at) + INTERVAL '1 day' THEN 1 END) as closedCases
            FROM casemanagement.case c
            WHERE c.created_at >= :since
            GROUP BY DATE_TRUNC('day', c.created_at)
            ORDER BY date DESC
            """, nativeQuery = true)
    List<Object[]> getDailyCaseCounts(@Param("since") LocalDateTime since);

    /**
     * Count cases created after a specific date
     */
    @Query("SELECT COUNT(c) FROM Case c WHERE c.createdAt >= :after")
    long countCreatedAfter(@Param("after") LocalDateTime after);

    /**
     * Find cases by status list
     */
    List<Case> findByStatusIn(List<Case.CaseStatus> statuses);

    /**
     * Find cases by team and date range
     */
    @Query(value = """
            SELECT c.* FROM casemanagement.case c
            INNER JOIN casemanagement.userlogin u ON c.assigned_to = u.id
            INNER JOIN casemanagement.team_members tm ON tm.user_id = u.id
            WHERE tm.team_id = :teamId 
            AND c.created_at BETWEEN :startDate AND :endDate
            """, nativeQuery = true)
    List<Case> findCasesByTeamAndDateRange(
            @Param("teamId") Long teamId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Check if case exists by Grafana alert UID within time window
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
           "FROM Case c WHERE c.grafanaAlertUid = :alertUid AND c.createdAt >= :after")
    boolean existsByGrafanaAlertUidAndCreatedAtAfter(
            @Param("alertUid") String alertUid, 
            @Param("after") LocalDateTime after);

    /**
     * Find most recent case by Grafana alert UID
     */
    Optional<Case> findFirstByGrafanaAlertUidOrderByCreatedAtDesc(String grafanaAlertUid);
}