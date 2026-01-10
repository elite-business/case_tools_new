package com.elite.casetools.repository;

import com.elite.casetools.entity.Team;
import com.elite.casetools.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Team entity
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Long>, JpaSpecificationExecutor<Team> {

    /**
     * Find team by name
     */
    Optional<Team> findByName(String name);

    /**
     * Find all active teams
     */
    List<Team> findByIsActiveTrue();

    /**
     * Find teams by department
     */
    List<Team> findByDepartment(String department);

    /**
     * Find teams where user is a member
     */
    @Query("SELECT t FROM Team t JOIN t.members m WHERE m.id = :userId AND t.isActive = true")
    List<Team> findTeamsByMemberId(@Param("userId") Long userId);

    /**
     * Find teams where user is the lead
     */
    List<Team> findByLeadId(Long leadId);

    /**
     * Search teams by name or description
     */
    @Query("SELECT t FROM Team t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Team> searchTeams(@Param("search") String search);

    /**
     * Find teams with least active cases for auto-assignment
     */
    @Query(value = "SELECT t.* FROM casemanagement.team t " +
           "LEFT JOIN (SELECT jsonb_extract_path_text(assigned_to, 'teamIds') as team_ids, " +
           "COUNT(*) as case_count FROM casemanagement.case " +
           "WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') AND assigned_to IS NOT NULL) cc " +
           "ON t.id::text = ANY(string_to_array(cc.team_ids, ',')) " +
           "WHERE t.is_active = true " +
           "ORDER BY COALESCE(cc.case_count, 0) ASC " +
           "LIMIT 1", nativeQuery = true)
    Optional<Team> findTeamWithLeastActiveCases();

    /**
     * Count teams by active status
     */
    long countByIsActive(Boolean isActive);

    /**
     * Find teams by lead and active status
     */
    List<Team> findByLeadAndIsActive(User lead, Boolean isActive);

    List<Team> findByIsActive(boolean b);
}