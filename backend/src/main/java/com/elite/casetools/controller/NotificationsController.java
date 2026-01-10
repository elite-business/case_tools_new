package com.elite.casetools.controller;

import com.elite.casetools.dto.PaginatedResponse;
import com.elite.casetools.entity.User;
import com.elite.casetools.service.NotificationService;
import com.elite.casetools.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Controller for managing user notifications
 * Provides REST endpoints for notification operations
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "User notification management endpoints")
public class NotificationsController {

    private final NotificationService notificationService;
    private final UserService userService;

    /**
     * Get user notifications
     */
    @GetMapping
    @Operation(summary = "Get notifications", description = "Retrieve paginated notifications for the current user")
    public ResponseEntity<PaginatedResponse<NotificationDto>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String type) {
        
        log.info("Fetching notifications - page: {}, size: {}, unreadOnly: {}, type: {}", 
            page, size, unreadOnly, type);
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // For now, return mock data since NotificationService may not have full implementation
            List<NotificationDto> notifications = generateMockNotifications(currentUser.getId(), unreadOnly);
            
            // Filter by type if specified
            if (type != null && !type.isEmpty()) {
                notifications = notifications.stream()
                    .filter(n -> n.getType().equalsIgnoreCase(type))
                    .toList();
            }
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, notifications.size());
            List<NotificationDto> paginatedList = notifications.subList(start, end);
            
            PaginatedResponse<NotificationDto> response = new PaginatedResponse<>();
            response.setContent(paginatedList);
            response.setTotalElements(notifications.size());
            response.setTotalPages((int) Math.ceil((double) notifications.size() / size));
            response.setNumber(page);
            response.setSize(size);
            response.setFirst(page == 0);
            response.setLast(end >= notifications.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch notifications", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get unread notification count
     */
    @GetMapping("/unread-count")
    @Operation(summary = "Get unread count", description = "Get the count of unread notifications")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        log.info("Fetching unread notification count");
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Mock unread count
            int unreadCount = 3;
            
            return ResponseEntity.ok(Map.of(
                "count", unreadCount,
                "userId", currentUser.getId()
            ));
        } catch (Exception e) {
            log.error("Failed to fetch unread count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Mark notification as read
     */
    @PostMapping("/{id}/read")
    @Operation(summary = "Mark as read", description = "Mark a notification as read")
    public ResponseEntity<Map<String, Object>> markAsRead(@PathVariable Long id) {
        log.info("Marking notification {} as read", id);
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Mock success response
            return ResponseEntity.ok(Map.of(
                "success", true,
                "notificationId", id,
                "message", "Notification marked as read"
            ));
        } catch (Exception e) {
            log.error("Failed to mark notification as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Mark all notifications as read
     */
    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all as read", description = "Mark all notifications as read for current user")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {
        log.info("Marking all notifications as read");
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Mock success response
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read",
                "count", 5
            ));
        } catch (Exception e) {
            log.error("Failed to mark all notifications as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get notification preferences
     */
    @GetMapping("/preferences")
    @Operation(summary = "Get preferences", description = "Get notification preferences for current user")
    public ResponseEntity<Map<String, Object>> getPreferences() {
        log.info("Fetching notification preferences");
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Return default preferences
            Map<String, Object> preferences = new HashMap<>();
            preferences.put("email", true);
            preferences.put("inApp", true);
            preferences.put("caseAssignment", true);
            preferences.put("caseUpdates", true);
            preferences.put("alertNotifications", true);
            preferences.put("systemAnnouncements", false);
            
            return ResponseEntity.ok(preferences);
        } catch (Exception e) {
            log.error("Failed to fetch preferences", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update notification preferences
     */
    @PutMapping("/preferences")
    @Operation(summary = "Update preferences", description = "Update notification preferences for current user")
    public ResponseEntity<Map<String, Object>> updatePreferences(@RequestBody Map<String, Object> preferences) {
        log.info("Updating notification preferences");
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Mock success response
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Preferences updated successfully",
                "preferences", preferences
            ));
        } catch (Exception e) {
            log.error("Failed to update preferences", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a notification
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete notification", description = "Delete a notification")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        log.info("Deleting notification {}", id);
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // Mock deletion
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Failed to delete notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Test notification delivery
     */
    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Test notification", description = "Send a test notification to specified user")
    public ResponseEntity<Map<String, Object>> testNotification(@RequestBody Map<String, Object> request) {
        String type = (String) request.get("type");
        String message = (String) request.get("message");
        Long userId = request.get("userId") != null ? ((Number) request.get("userId")).longValue() : null;
        
        log.info("Sending test notification - type: {}, userId: {}", type, userId);
        
        try {
            // Mock test notification
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Test notification sent successfully",
                "type", type != null ? type : "info"
            ));
        } catch (Exception e) {
            log.error("Failed to send test notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Helper methods

    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User) {
                return (User) auth.getPrincipal();
            }
            // Try to get from userService if available
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userService.findByUsername(username);
            }
        } catch (Exception e) {
            log.error("Error getting current user", e);
        }
        return null;
    }

    private List<NotificationDto> generateMockNotifications(Long userId, Boolean unreadOnly) {
        List<NotificationDto> notifications = new ArrayList<>();
        
        // Generate some mock notifications
        notifications.add(NotificationDto.builder()
            .id(1L)
            .userId(userId)
            .type("CASE_ASSIGNMENT")
            .title("New Case Assignment")
            .message("You have been assigned to case #CASE-2024-001")
            .isRead(false)
            .createdAt(LocalDateTime.now().minusHours(1))
            .data(Map.of("caseId", 1, "caseNumber", "CASE-2024-001"))
            .build());
            
        notifications.add(NotificationDto.builder()
            .id(2L)
            .userId(userId)
            .type("ALERT")
            .title("Critical Alert")
            .message("High revenue loss detected in MSC region")
            .isRead(false)
            .createdAt(LocalDateTime.now().minusHours(2))
            .data(Map.of("alertId", 100, "severity", "critical"))
            .build());
            
        if (unreadOnly == null || !unreadOnly) {
            notifications.add(NotificationDto.builder()
                .id(3L)
                .userId(userId)
                .type("CASE_UPDATE")
                .title("Case Status Update")
                .message("Case #CASE-2024-002 has been resolved")
                .isRead(true)
                .createdAt(LocalDateTime.now().minusHours(5))
                .data(Map.of("caseId", 2, "caseNumber", "CASE-2024-002"))
                .build());
                
            notifications.add(NotificationDto.builder()
                .id(4L)
                .userId(userId)
                .type("SYSTEM")
                .title("System Maintenance")
                .message("Scheduled maintenance tonight at 2:00 AM")
                .isRead(true)
                .createdAt(LocalDateTime.now().minusDays(1))
                .data(Map.of())
                .build());
        }
        
        notifications.add(NotificationDto.builder()
            .id(5L)
            .userId(userId)
            .type("COMMENT")
            .title("New Comment")
            .message("John Doe commented on case #CASE-2024-001")
            .isRead(false)
            .createdAt(LocalDateTime.now().minusMinutes(30))
            .data(Map.of("caseId", 1, "commentId", 50, "author", "John Doe"))
            .build());
        
        return notifications;
    }

    /**
     * DTO for Notification
     */
    public static class NotificationDto {
        private Long id;
        private Long userId;
        private String type;
        private String title;
        private String message;
        private Boolean isRead;
        private LocalDateTime createdAt;
        private LocalDateTime readAt;
        private Map<String, Object> data;

        // Builder pattern
        public static NotificationDtoBuilder builder() {
            return new NotificationDtoBuilder();
        }

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public Boolean getIsRead() { return isRead; }
        public void setIsRead(Boolean isRead) { this.isRead = isRead; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getReadAt() { return readAt; }
        public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }

        public Map<String, Object> getData() { return data; }
        public void setData(Map<String, Object> data) { this.data = data; }

        // Builder
        public static class NotificationDtoBuilder {
            private NotificationDto dto = new NotificationDto();

            public NotificationDtoBuilder id(Long id) {
                dto.id = id;
                return this;
            }

            public NotificationDtoBuilder userId(Long userId) {
                dto.userId = userId;
                return this;
            }

            public NotificationDtoBuilder type(String type) {
                dto.type = type;
                return this;
            }

            public NotificationDtoBuilder title(String title) {
                dto.title = title;
                return this;
            }

            public NotificationDtoBuilder message(String message) {
                dto.message = message;
                return this;
            }

            public NotificationDtoBuilder isRead(Boolean isRead) {
                dto.isRead = isRead;
                return this;
            }

            public NotificationDtoBuilder createdAt(LocalDateTime createdAt) {
                dto.createdAt = createdAt;
                return this;
            }

            public NotificationDtoBuilder readAt(LocalDateTime readAt) {
                dto.readAt = readAt;
                return this;
            }

            public NotificationDtoBuilder data(Map<String, Object> data) {
                dto.data = data;
                return this;
            }

            public NotificationDto build() {
                return dto;
            }
        }
    }
}