package com.elite.casetools.repository;

import com.elite.casetools.entity.User;
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
 * Repository for User entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    /**
     * Find user by login (username)
     */
    Optional<User> findByLogin(String login);

    /**
     * Find user by email
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if user with login exists
     */
    boolean existsByLogin(String login);

    /**
     * Check if user with email exists
     */
    boolean existsByEmail(String email);

    /**
     * Find all active users
     */
    List<User> findByStatus(User.UserStatus status);

    /**
     * Find users by role
     */
    List<User> findByRole(User.UserRole role);

    /**
     * Find users available for case assignment
     */
    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' AND u.assignedTo = true ")
    List<User> findAvailableForAssignment();

    /**
     * Find user with least active cases for auto-assignment
     */
    @Query(value = "SELECT u.* FROM casemanagement.userlogin u " +
           "LEFT JOIN (SELECT assigned_to, COUNT(*) as case_count FROM casemanagement.case " +
           "WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') GROUP BY assigned_to) cc " +
           "ON u.id = cc.assigned_to " +
           "WHERE u.etat = 'ACTIVE' AND u.assigned_to = true " +
           "ORDER BY COALESCE(cc.case_count, 0) ASC " +
           "LIMIT 1", nativeQuery = true)
    Optional<User> findUserWithLeastActiveCases();

    /**
     * Update last login timestamp
     */
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :timestamp WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId, @Param("timestamp") LocalDateTime timestamp);

    /**
     * Update failed login attempts
     */
    @Modifying
    @Query("UPDATE User u SET u.failedLoginAttempts = :attempts WHERE u.id = :userId")
    void updateFailedLoginAttempts(@Param("userId") Long userId, @Param("attempts") Integer attempts);

    /**
     * Lock user account
     */
    @Modifying
    @Query("UPDATE User u SET u.accountLockedUntil = :lockedUntil WHERE u.id = :userId")
    void lockUserAccount(@Param("userId") Long userId, @Param("lockedUntil") LocalDateTime lockedUntil);

    /**
     * Find users by department
     */
    List<User> findByDepartment(String department);

    /**
     * Search users by name or login
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.login) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<User> searchUsers(@Param("search") String search);

    /**
     * Count users by status
     */
    long countByStatus(User.UserStatus status);
}