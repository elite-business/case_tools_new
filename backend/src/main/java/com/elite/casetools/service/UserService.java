package com.elite.casetools.service;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.User;
import com.elite.casetools.entity.Team;
import com.elite.casetools.exception.ResourceNotFoundException;
import com.elite.casetools.exception.DuplicateResourceException;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Service for user management operations
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TeamRepository teamRepository;

    /**
     * Load user by username for Spring Security
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByLogin(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    /**
     * Create a new user
     */
    public User createUser(CreateUserRequest request) {
        log.info("Creating new user: {}", request.getLogin());
        
        // Check for duplicates
        if (userRepository.existsByLogin(request.getLogin())) {
            throw new DuplicateResourceException("User with login already exists: " + request.getLogin());
        }
        
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User with email already exists: " + request.getEmail());
        }
        
        User user = User.builder()
                .name(request.getName())
                .login(request.getLogin())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .department(request.getDepartment())
                .phone(request.getPhone())
                .status(Boolean.TRUE.equals(request.getActive()) ? User.UserStatus.ACTIVE : User.UserStatus.INACTIVE)
                .domainControl(request.getDomainControl())
                .revenueStream(request.getRevenueStream())
                .historiqueAlert(request.getHistoriqueAlert())
                .adminAdd(request.getAdminAdd())
                .raRule(request.getRaRule())
                .stat(request.getStat())
                .assignedTo(request.getAssignedTo())
                .reAssignedTo(request.getReAssignedTo())
                .closed(request.getClosed())
                .createdBy(getCurrentUsername())
                .build();
        
        return userRepository.save(user);
    }

    /**
     * Update user information
     */
    public User updateUser(Long userId, UpdateUserRequest request) {
        log.info("Updating user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        // Update fields
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already in use: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getLogin() != null && !request.getLogin().equals(user.getLogin())) {
            if (userRepository.existsByLogin(request.getLogin())) {
                throw new DuplicateResourceException("Username already in use: " + request.getLogin());
            }
            user.setLogin(request.getLogin());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getActive() != null) {
            user.setStatus(Boolean.TRUE.equals(request.getActive()) ? 
                User.UserStatus.ACTIVE : User.UserStatus.INACTIVE);
        }
        
        // Update permissions
        if (request.getDomainControl() != null) {
            user.setDomainControl(request.getDomainControl());
        }
        if (request.getRevenueStream() != null) {
            user.setRevenueStream(request.getRevenueStream());
        }
        if (request.getHistoriqueAlert() != null) {
            user.setHistoriqueAlert(request.getHistoriqueAlert());
        }
        if (request.getAdminAdd() != null) {
            user.setAdminAdd(request.getAdminAdd());
        }
        if (request.getRaRule() != null) {
            user.setRaRule(request.getRaRule());
        }
        if (request.getStat() != null) {
            user.setStat(request.getStat());
        }
        if (request.getAssignedTo() != null) {
            user.setAssignedTo(request.getAssignedTo());
        }
        if (request.getReAssignedTo() != null) {
            user.setReAssignedTo(request.getReAssignedTo());
        }
        if (request.getClosed() != null) {
            user.setClosed(request.getClosed());
        }
        
        return userRepository.save(user);
    }

    /**
     * Change user password
     */
    public void changePassword(Long userId, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        // Verify old password
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid old password");
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    /**
     * Reset user password (admin function)
     */
    public void resetPassword(Long userId, String newPassword) {
        log.info("Resetting password for user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        userRepository.save(user);
    }

    /**
     * Get user by ID
     */
    @Transactional(readOnly = true)
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    /**
     * Get user by login
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserByLogin(String login) {
        return userRepository.findByLogin(login);
    }

    /**
     * Find user by username (alias for getUserByLogin)
     */
    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        return userRepository.findByLogin(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    /**
     * Get all users with pagination
     */
    @Transactional(readOnly = true)
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    /**
     * Get users available for case assignment
     */
    @Transactional(readOnly = true)
    public List<User> getAvailableForAssignment() {
        return userRepository.findAvailableForAssignment();
    }

    /**
     * Get all active users (for team creation, etc.)
     */
    @Transactional(readOnly = true)
    public List<User> getActiveUsers() {
        return userRepository.findByStatus(User.UserStatus.ACTIVE);
    }

    /**
     * Get user with least active cases for auto-assignment
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserForAutoAssignment() {
        return userRepository.findUserWithLeastActiveCases();
    }

    /**
     * Search users
     */
    @Transactional(readOnly = true)
    public List<User> searchUsers(String query) {
        return userRepository.searchUsers(query);
    }

    /**
     * Update last login timestamp
     */
    public void updateLastLogin(Long userId) {
        userRepository.updateLastLogin(userId, LocalDateTime.now());
    }

    /**
     * Handle failed login attempt
     */
    public void handleFailedLogin(String login) {
        userRepository.findByLogin(login).ifPresent(user -> {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            
            // Lock account after 5 failed attempts
            if (attempts >= 5) {
                user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(30));
                log.warn("Account locked for user: {}", login);
            }
            
            userRepository.save(user);
        });
    }

    /**
     * Handle successful login
     */
    public void handleSuccessfulLogin(String login) {
        userRepository.findByLogin(login).ifPresent(user -> {
            user.setFailedLoginAttempts(0);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    /**
     * Delete user (soft delete)
     */
    public void deleteUser(Long userId) {
        log.info("Deleting user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        user.setStatus(User.UserStatus.INACTIVE);
        userRepository.save(user);
    }

    /**
     * Get current username from security context
     */
    private String getCurrentUsername() {
        // This will be implemented with SecurityContext
        return "system";
    }
    
    /**
     * Get current user ID from security context
     */
    public Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            User user = (User) auth.getPrincipal();
            return user.getId();
        }
        throw new ResourceNotFoundException("Current user not found");
    }
    
    /**
     * Get team IDs for a specific user
     * Returns list of team IDs the user belongs to
     */
    @Transactional(readOnly = true)
    public List<Long> getUserTeamIds(Long userId) {
        User user = getUserById(userId);
        
        // Query teams where user is a member
        List<Team> userTeams = teamRepository.findByMembersContaining(user);
        
        if (!userTeams.isEmpty()) {
            return userTeams.stream()
                    .map(Team::getId)
                    .collect(Collectors.toList());
        }
        
        return new ArrayList<>();
    }
}