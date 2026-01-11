package com.elite.casetools.controller;

import com.elite.casetools.dto.PaginatedResponse;
import com.elite.casetools.entity.Notification;
import com.elite.casetools.entity.User;
import com.elite.casetools.repository.NotificationRepository;
import com.elite.casetools.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    private final UserService userService;
    private final NotificationRepository notificationRepository;

    /**
     * Get user notifications
     */
    @GetMapping
    @Operation(summary = "Get notifications", description = "Retrieve paginated notifications for the current user")
    public ResponseEntity<PaginatedResponse<NotificationDto>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        
        log.info("Fetching notifications - page: {}, size: {}, unreadOnly: {}, status: {}, type: {}, search: {}", 
            page, size, unreadOnly, status, type, search);
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Boolean resolvedUnreadOnly = unreadOnly;
            if (resolvedUnreadOnly == null && status != null && status.equalsIgnoreCase("PENDING")) {
                resolvedUnreadOnly = true;
            }

            Notification.NotificationType notificationType = null;
            if (type != null && !type.isBlank()) {
                try {
                    notificationType = Notification.NotificationType.valueOf(type.toUpperCase());
                } catch (IllegalArgumentException ex) {
                    notificationType = Notification.NotificationType.CUSTOM;
                }
            }

            PageRequest pageable = PageRequest.of(page, size);
            Page<Notification> notifications = notificationRepository.findUserNotifications(
                    currentUser.getId(),
                    resolvedUnreadOnly,
                    notificationType != null ? notificationType.name() : null,
                    search,
                    pageable
            );

            PaginatedResponse<NotificationDto> response = PaginatedResponse.fromPage(
                    notifications.map(this::toDto)
            );

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

            long unreadCount = notificationRepository.countUnreadNotificationsByUser(currentUser);
            
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

            Optional<Notification> notification = notificationRepository.findById(id);
            if (notification.isEmpty() || notification.get().getRecipientUser() == null
                    || !notification.get().getRecipientUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            Notification entity = notification.get();
            entity.markAsRead();
            notificationRepository.save(entity);

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

            List<Notification> unread = notificationRepository.findUnreadNotificationsByUser(currentUser);
            unread.forEach(Notification::markAsRead);
            notificationRepository.saveAll(unread);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "All notifications marked as read",
                    "count", unread.size()
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

            Optional<Notification> notification = notificationRepository.findById(id);
            if (notification.isEmpty() || notification.get().getRecipientUser() == null
                    || !notification.get().getRecipientUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            notificationRepository.delete(notification.get());
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

    private NotificationDto toDto(Notification notification) {
        Map<String, Object> data = new HashMap<>();
        if (notification.getAdditionalMetadata() != null) {
            data.putAll(notification.getAdditionalMetadata());
        }
        if (notification.getTemplateVariables() != null) {
            data.putAll(notification.getTemplateVariables());
        }
        if (notification.getCaseEntity() != null) {
            data.putIfAbsent("caseId", notification.getCaseEntity().getId());
            data.putIfAbsent("caseNumber", notification.getCaseEntity().getCaseNumber());
        }

        String severity = "INFO";
        Object severityValue = data.get("severity");
        if (severityValue instanceof String) {
            severity = ((String) severityValue).toUpperCase();
        }

        return NotificationDto.builder()
                .id(notification.getId())
                .userId(notification.getRecipientUser() != null ? notification.getRecipientUser().getId() : null)
                .type(notification.getNotificationType() != null ? notification.getNotificationType().name() : "CUSTOM")
                .title(notification.getSubject() != null ? notification.getSubject() : "Notification")
                .message(notification.getMessage())
                .severity(severity)
                .status(notification.getStatus() != null ? notification.getStatus().name() : "SENT")
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .data(data)
                .build();
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
        private String severity;
        private String status;
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

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

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

            public NotificationDtoBuilder severity(String severity) {
                dto.severity = severity;
                return this;
            }

            public NotificationDtoBuilder status(String status) {
                dto.status = status;
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
