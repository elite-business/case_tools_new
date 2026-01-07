package com.elite.casetools.repository;

import com.elite.casetools.entity.RuleAssignment;
import com.elite.casetools.entity.User;
import com.elite.casetools.entity.Team;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for RuleAssignment entities
 */
@Repository
public interface RuleAssignmentRepository extends JpaRepository<RuleAssignment, Long> {

    /**
     * Find by Grafana rule UID
     */
    Optional<RuleAssignment> findByGrafanaRuleUid(String grafanaRuleUid);

    /**
     * Check if rule assignment exists by UID
     */
    boolean existsByGrafanaRuleUid(String grafanaRuleUid);

    /**
     * Find all active rule assignments
     */
    List<RuleAssignment> findByActiveTrue();

    /**
     * Find rule assignments by assigned user
     */
    @Query("SELECT ra FROM RuleAssignment ra JOIN ra.assignedUsers u WHERE u = :user AND ra.active = true")
    List<RuleAssignment> findByAssignedUser(@Param("user") User user);

    /**
     * Find rule assignments by assigned team
     */
    @Query("SELECT ra FROM RuleAssignment ra JOIN ra.assignedTeams t WHERE t = :team AND ra.active = true")
    List<RuleAssignment> findByAssignedTeam(@Param("team") Team team);

    /**
     * Find rule assignments where user is assigned directly or via team
     */
    @Query("SELECT DISTINCT ra FROM RuleAssignment ra " +
           "LEFT JOIN ra.assignedUsers u " +
           "LEFT JOIN ra.assignedTeams t " +
           "LEFT JOIN t.members tm " +
           "WHERE ra.active = true AND (u = :user OR tm = :user)")
    List<RuleAssignment> findByUserAssignment(@Param("user") User user);

    /**
     * Find rules with assignments filtered by search
     */
    @Query("SELECT ra FROM RuleAssignment ra WHERE " +
           "(:search IS NULL OR LOWER(ra.grafanaRuleName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(ra.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:active IS NULL OR ra.active = :active)")
    Page<RuleAssignment> findWithSearch(
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable);

    /**
     * Find by folder UID
     */
    List<RuleAssignment> findByGrafanaFolderUid(String grafanaFolderUid);

    /**
     * Find by severity
     */
    List<RuleAssignment> findBySeverity(RuleAssignment.CaseSeverity severity);

    /**
     * Find by category
     */
    List<RuleAssignment> findByCategory(RuleAssignment.CaseCategory category);

    /**
     * Count assignments by user
     */
    @Query("SELECT COUNT(DISTINCT ra) FROM RuleAssignment ra " +
           "LEFT JOIN ra.assignedUsers u " +
           "LEFT JOIN ra.assignedTeams t " +
           "LEFT JOIN t.members tm " +
           "WHERE ra.active = true AND (u = :user OR tm = :user)")
    long countByUserAssignment(@Param("user") User user);

    /**
     * Find unassigned rules
     */
    @Query("SELECT ra FROM RuleAssignment ra WHERE ra.assignedUsers IS EMPTY AND ra.assignedTeams IS EMPTY")
    List<RuleAssignment> findUnassignedRules();
}