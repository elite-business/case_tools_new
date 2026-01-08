package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.entity.User;
import com.elite.casetools.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for user management operations
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Get all users with pagination
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<UserDto>> getAllUsers(
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        
        Page<User> users = userService.getAllUsers(pageable);
        Page<UserDto> userDtos = users.map(this::convertToDto);
        return ResponseEntity.ok(userDtos);
    }

    /**
     * Get teams for a specific user
     */
    @GetMapping("/{id}/teams")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #id == authentication.principal.id")
    public ResponseEntity<List<Long>> getUserTeams(@PathVariable Long id) {
        log.info("Fetching teams for user: {}", id);
        List<Long> teamIds = userService.getUserTeamIds(id);
        return ResponseEntity.ok(teamIds);
    }
    
    /**
     * Get current user's teams
     */
    @GetMapping("/me/teams")
    public ResponseEntity<List<Long>> getMyTeams() {
        Long userId = userService.getCurrentUserId();
        log.info("Fetching teams for current user: {}", userId);
        List<Long> teamIds = userService.getUserTeamIds(userId);
        return ResponseEntity.ok(teamIds);
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(convertToDto(user));
    }

    /**
     * Create new user
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("Creating new user: {}", request.getLogin());
        User newUser = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(newUser));
    }

    /**
     * Update user
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        
        log.info("Updating user: {}", id);
        User updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(convertToDto(updatedUser));
    }

    /**
     * Delete user (soft delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Deleting user: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reset user password (admin function)
     */
    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @RequestBody ResetPasswordRequest request) {
        
        log.info("Resetting password for user: {}", id);
        userService.resetPassword(id, request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    /**
     * Search users
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam String query) {
        List<User> users = userService.searchUsers(query);
        List<UserDto> userDtos = users.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(userDtos);
    }

    /**
     * Get users available for case assignment
     */
    @GetMapping("/available-for-assignment")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SENIOR_ANALYST')")
    public ResponseEntity<List<UserDto>> getAvailableForAssignment() {
        List<User> users = userService.getAvailableForAssignment();
        List<UserDto> userDtos = users.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(userDtos);
    }

    /**
     * Get all active users for team management
     */
    @GetMapping("/list/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<UserDto>> getActiveUsers() {
        List<User> users = userService.getActiveUsers();
        List<UserDto> userDtos = users.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(userDtos);
    }

    /**
     * Convert User entity to DTO with frontend-compatible field names
     */
    private UserDto convertToDto(User user) {
        UserDto dto = UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .login(user.getLogin())
                .email(user.getEmail())
                .matricule(user.getMatricule())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() == User.UserStatus.ACTIVE) // Convert to boolean
                .department(user.getDepartment())
                .phone(user.getPhone())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .permissions(UserDto.PermissionsDto.builder()
                        .domainControl(user.getDomainControl())
                        .revenueStream(user.getRevenueStream())
                        .historiqueAlert(user.getHistoriqueAlert())
                        .adminAdd(user.getAdminAdd())
                        .raRule(user.getRaRule())
                        .stat(user.getStat())
                        .assignedTo(user.getAssignedTo())
                        .reAssignedTo(user.getReAssignedTo())
                        .closed(user.getClosed())
                        .build())
                .build();
        
        return dto;
    }
}

