package com.elite.casetools.repository;

import com.elite.casetools.entity.SystemLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repository interface for SystemLog entity
 */
@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {

    /**
     * Find logs with filtering
     */
    @Query("SELECT sl FROM SystemLog sl WHERE " +
           "(:level IS NULL OR sl.level = :level) AND " +
           "(:component IS NULL OR LOWER(sl.component) LIKE LOWER(CONCAT('%', :component, '%'))) AND " +
           "(:search IS NULL OR LOWER(sl.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<SystemLog> findWithFilters(@Param("level") String level,
                                   @Param("component") String component,
                                   @Param("search") String search,
                                   Pageable pageable);

    /**
     * Find logs by level
     */
    Page<SystemLog> findByLevel(String level, Pageable pageable);

    /**
     * Find logs by component
     */
    Page<SystemLog> findByComponent(String component, Pageable pageable);

    /**
     * Find logs after timestamp
     */
    Page<SystemLog> findByTimestampAfter(LocalDateTime timestamp, Pageable pageable);

    /**
     * Count logs by level in date range
     */
    @Query("SELECT COUNT(sl) FROM SystemLog sl WHERE sl.level = :level AND sl.timestamp BETWEEN :start AND :end")
    long countByLevelBetween(@Param("level") String level, 
                            @Param("start") LocalDateTime start, 
                            @Param("end") LocalDateTime end);
}