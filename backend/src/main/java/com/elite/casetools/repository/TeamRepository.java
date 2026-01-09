package com.elite.casetools.repository;

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
 * Repository interface for Team entity
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    /**
     * Find teams by name containing search string (case insensitive)
     */
    @Query("SELECT t FROM Team t WHERE " +
           "LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Team> findBySearchTerm(@Param("search") String search, Pageable pageable);
    
    /**
     * Find team with members fetched
     */
    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.members WHERE t.id = :id")
    Optional<Team> findByIdWithMembers(@Param("id") Long id);

    /**
     * Find all active teams
     */
    List<Team> findByActiveTrue();

    /**
     * Find teams by active status
     */
    List<Team> findByActive(Boolean active);

    /**
     * Find team by name (case insensitive)
     */
    Optional<Team> findByNameIgnoreCase(String name);

    /**
     * Find teams by department
     */
    List<Team> findByDepartmentIgnoreCase(String department);

    /**
     * Find teams led by specific user
     */
    List<Team> findByLeaderId(Long leaderId);
    
    /**
     * Find teams containing specific member
     */
    @Query("SELECT t FROM Team t JOIN t.members m WHERE m = :user")
    List<Team> findByMembersContaining(@Param("user") com.elite.casetools.entity.User user);
    
    /**
     * Find teams by user (either as leader or member)
     */
    @Query("SELECT DISTINCT t FROM Team t LEFT JOIN t.members m WHERE t.leader = :user OR m = :user")
    List<Team> findByUser(@Param("user") com.elite.casetools.entity.User user);
}