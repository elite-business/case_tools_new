package com.elite.casetools.repository;

import com.elite.casetools.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Report entity
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    /**
     * Find reports with filtering
     */
    @Query("SELECT r FROM Report r WHERE " +
           "(:type IS NULL OR r.type = :type) AND " +
           "(:status IS NULL OR r.status = :status)")
    Page<Report> findWithFilters(@Param("type") String type,
                                @Param("status") String status,
                                Pageable pageable);

    /**
     * Find reports by created by user
     */
    Page<Report> findByCreatedById(Long userId, Pageable pageable);

    /**
     * Find reports by type
     */
    List<Report> findByType(String type);

    /**
     * Find reports by status
     */
    List<Report> findByStatus(String status);

    /**
     * Find completed reports
     */
    @Query("SELECT r FROM Report r WHERE r.status = 'COMPLETED' ORDER BY r.completedAt DESC")
    Page<Report> findCompletedReports(Pageable pageable);
}