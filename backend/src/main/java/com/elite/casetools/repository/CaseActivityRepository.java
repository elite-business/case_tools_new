package com.elite.casetools.repository;

import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.CaseActivity;
import com.elite.casetools.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for case activities
 */
@Repository
public interface CaseActivityRepository extends JpaRepository<CaseActivity, Long> {

    /**
     * Find all activities for a specific case
     */
    List<CaseActivity> findByCaseEntity(Case caseEntity);

    /**
     * Find all activities for a specific case ordered by performed date
     */
    List<CaseActivity> findByCaseEntityOrderByPerformedAtDesc(Case caseEntity);

    /**
     * Find activities by case and activity type
     */
    List<CaseActivity> findByCaseEntityAndActivityType(
            Case caseEntity, 
            CaseActivity.ActivityType activityType
    );

    /**
     * Find activities performed by a specific user
     */
    List<CaseActivity> findByPerformedBy(User user);

    /**
     * Find activities within a date range
     */
    @Query("SELECT a FROM CaseActivity a WHERE a.performedAt BETWEEN :startDate AND :endDate")
    List<CaseActivity> findActivitiesInDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Count activities by type for a case
     */
    @Query("SELECT COUNT(a) FROM CaseActivity a WHERE a.caseEntity = :caseEntity AND a.activityType = :type")
    Long countByTypeForCase(
            @Param("caseEntity") Case caseEntity,
            @Param("type") CaseActivity.ActivityType type
    );

    /**
     * Count activities by type and performed by user in date range
     */
    @Query("SELECT COUNT(a) FROM CaseActivity a WHERE a.activityType = :type " +
           "AND a.performedBy = :user AND a.performedAt BETWEEN :startDate AND :endDate")
    Long countByActivityTypeAndPerformedByAndPerformedAtBetween(
            @Param("type") CaseActivity.ActivityType type,
            @Param("user") User user,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Count activities by performed by users in date range
     */
    @Query("SELECT COUNT(a) FROM CaseActivity a WHERE a.performedBy.id IN :userIds " +
           "AND a.performedAt BETWEEN :startDate AND :endDate")
    Long countByPerformedByInAndPerformedAtBetween(
            @Param("userIds") List<Long> userIds,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}