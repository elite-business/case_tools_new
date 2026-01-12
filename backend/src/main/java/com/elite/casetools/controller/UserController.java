package com.elite.casetools.controller;

import com.elite.casetools.dto.CreateUserRequest;
import com.elite.casetools.dto.ResetPasswordRequest;
import com.elite.casetools.dto.UpdateUserRequest;
import com.elite.casetools.dto.UserActivityResponse;
import com.elite.casetools.dto.UserDto;
import com.elite.casetools.entity.CaseActivity;
import com.elite.casetools.entity.User;
import com.elite.casetools.repository.CaseActivityRepository;
import com.elite.casetools.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final CaseActivityRepository caseActivityRepository;

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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
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
     * Get recent activity for a specific user
     */
    @GetMapping("/{id}/activity")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #id == authentication.principal.id")
    public ResponseEntity<List<UserActivityResponse>> getUserActivity(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User user = userService.getUserById(id);
        Page<CaseActivity> activities = caseActivityRepository
                .findByPerformedByOrderByPerformedAtDesc(user, PageRequest.of(page, size));

        List<UserActivityResponse> response = activities.stream()
                .map(this::convertToUserActivity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
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

    private UserActivityResponse convertToUserActivity(CaseActivity activity) {
        return UserActivityResponse.builder()
                .action(activity.getActivityType().name())
                .type(activity.getActivityType().name())
                .description(activity.getDescription() != null
                        ? activity.getDescription()
                        : activity.getDetails())
                .timestamp(activity.getPerformedAt() != null
                        ? activity.getPerformedAt()
                        : activity.getCreatedAt())
                .caseId(activity.getCaseEntity() != null ? activity.getCaseEntity().getId() : null)
                .caseNumber(activity.getCaseEntity() != null ? activity.getCaseEntity().getCaseNumber() : null)
                .build();
    }
}

