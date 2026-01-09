package com.elite.casetools.repository;

import com.elite.casetools.entity.AssignmentHistory;
import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.User;
import com.elite.casetools.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for assignment history tracking
 */
@Repository
public interface AssignmentHistoryRepository extends JpaRepository<AssignmentHistory, Long> {

    /**
     * Find all assignment history for a specific case
     */
    List<AssignmentHistory> findByCaseEntityOrderByAssignedAtDesc(Case caseEntity);

    /**
     * Find assignment history by user (either from or to)
     */
    @Query("SELECT ah FROM AssignmentHistory ah WHERE ah.fromUser = :user OR ah.toUser = :user")
    List<AssignmentHistory> findByUser(@Param("user") User user);

    /**
     * Find assignment history by team (either from or to)
     */
    @Query("SELECT ah FROM AssignmentHistory ah WHERE ah.fromTeam = :team OR ah.toTeam = :team")
    List<AssignmentHistory> findByTeam(@Param("team") Team team);

    /**
     * Find assignments within date range
     */
    List<AssignmentHistory> findByAssignedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find assignments by reason
     */
    List<AssignmentHistory> findByReason(AssignmentHistory.AssignmentReason reason);

    /**
     * Count assignments for user within time period
     */
    @Query("SELECT COUNT(ah) FROM AssignmentHistory ah WHERE ah.toUser = :user AND ah.assignedAt BETWEEN :start AND :end")
    Long countAssignmentsForUser(@Param("user") User user, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Count assignments for team within time period
     */
    @Query("SELECT COUNT(ah) FROM AssignmentHistory ah WHERE ah.toTeam = :team AND ah.assignedAt BETWEEN :start AND :end")
    Long countAssignmentsForTeam(@Param("team") Team team, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Get most recent assignment for a case
     */
    AssignmentHistory findFirstByCaseEntityOrderByAssignedAtDesc(Case caseEntity);

    /**
     * Find escalations within time period
     */
    @Query("SELECT ah FROM AssignmentHistory ah WHERE ah.reason = 'ESCALATION' AND ah.assignedAt BETWEEN :start AND :end")
    List<AssignmentHistory> findEscalationsInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Get workload distribution data
     */
    @Query("SELECT ah.toUser, COUNT(ah), AVG(CAST(ah.toUserOpenCases AS DOUBLE)) FROM AssignmentHistory ah " +
           "WHERE ah.assignedAt BETWEEN :start AND :end AND ah.toUser IS NOT NULL " +
           "GROUP BY ah.toUser")
    List<Object[]> getWorkloadDistribution(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Find assignments by assignor
     */
    List<AssignmentHistory> findByAssignedBy(User assignedBy);

    /**
     * Count total assignments made by user
     */
    Long countByAssignedBy(User assignedBy);

    /**
     * Find assignments by case and reason
     */
    List<AssignmentHistory> findByCaseEntityAndReason(Case caseEntity, AssignmentHistory.AssignmentReason reason);
}