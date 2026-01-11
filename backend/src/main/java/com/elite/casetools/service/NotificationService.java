package com.elite.casetools.service;

import com.elite.casetools.entity.*;
import com.elite.casetools.dto.AssignmentInfo;
import com.elite.casetools.repository.NotificationRepository;
import com.elite.casetools.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for sending notifications
 */
@Service
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;
    private final WebSocketService webSocketService;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    
    public NotificationService(@Autowired(required = false) JavaMailSender mailSender, 
                              WebSocketService webSocketService,
                              UserRepository userRepository,
                              NotificationRepository notificationRepository) {
        this.mailSender = mailSender;
        this.webSocketService = webSocketService;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }
    
    @Value("${application.notification.email.enabled:true}")
    private boolean emailEnabled;
    
    @Value("${application.notification.email.from}")
    private String emailFrom;
    
    @Value("${application.notification.email.from-name}")
    private String emailFromName;
    
    @Value("${spring.application.name}")
    private String applicationName;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /**
     * Notify about new case creation
     */
    @Async
    public void sendCaseCreatedNotifications(Case caseEntity) {
        String subject = String.format("New Case Created: %s", caseEntity.getCaseNumber());
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("caseNumber", caseEntity.getCaseNumber());
        variables.put("caseTitle", caseEntity.getTitle());
        variables.put("severity", caseEntity.getSeverity());
        variables.put("description", caseEntity.getDescription());
        variables.put("slaDeadline", caseEntity.getSlaDeadline() != null ? 
                      caseEntity.getSlaDeadline().format(DATE_FORMAT) : "Not set");

        // Send notification to all assigned users
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        if (assignmentInfo.hasAssignments() && assignmentInfo.getUserIds() != null) {
            for (Long userId : assignmentInfo.getUserIds()) {
                User assignee = userRepository.findById(userId).orElse(null);
                if (assignee != null) {
                    variables.put("userName", assignee.getName());
                    
                    if (emailEnabled && assignee.getEmail() != null) {
                        sendEmailNotification(assignee.getEmail(), subject, "case-created", variables);
                    }
                    
                    persistInAppNotification(
                            assignee,
                            caseEntity,
                            Notification.NotificationType.CASE_CREATED,
                            subject,
                            String.format("Case %s created: %s", caseEntity.getCaseNumber(), caseEntity.getTitle()),
                            buildCaseMetadata(caseEntity, null)
                    );
                    webSocketService.sendToUser(assignee.getId(), "case.created", caseEntity);
                }
            }
        }
        
        // Send to admin channel
        webSocketService.sendToChannel("admin", "case.created", caseEntity);

        // Persist for admins and managers
        notifyRoleUsers(User.UserRole.ADMIN, caseEntity, subject, "CASE_CREATED");
        notifyRoleUsers(User.UserRole.MANAGER, caseEntity, subject, "CASE_CREATED");
        
        log.info("Sent case creation notifications for case {}", caseEntity.getCaseNumber());
    }

    /**
     * Notify about case resolution
     */
    @Async
    public void sendCaseResolvedNotifications(Case caseEntity) {
        String subject = String.format("Case Resolved: %s", caseEntity.getCaseNumber());
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("caseNumber", caseEntity.getCaseNumber());
        variables.put("caseTitle", caseEntity.getTitle());
        variables.put("severity", caseEntity.getSeverity());
        variables.put("resolutionActions", caseEntity.getResolutionActions());
        variables.put("resolvedAt", caseEntity.getResolvedAt() != null ? 
                      caseEntity.getResolvedAt().format(DATE_FORMAT) : "Unknown");

        // Send notification to assigned users if available
        if (caseEntity.getAssignedTo() != null) {
            AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
            
            // Notify assigned users
            for (Long userId : assignmentInfo.getUserIds()) {
                userRepository.findById(userId).ifPresent(assignee -> {
                    Map<String, Object> userVariables = new HashMap<>(variables);
                    userVariables.put("userName", assignee.getName());
                    
                    if (emailEnabled && assignee.getEmail() != null) {
                        sendEmailNotification(assignee.getEmail(), subject, "case-resolved", userVariables);
                    }
                    
                    persistInAppNotification(
                            assignee,
                            caseEntity,
                            Notification.NotificationType.CASE_RESOLVED,
                            subject,
                            String.format("Case %s resolved", caseEntity.getCaseNumber()),
                            buildCaseMetadata(caseEntity, null)
                    );
                    webSocketService.sendToUser(assignee.getId(), "case.resolved", caseEntity);
                });
            }
        }
        
        // Send to admin channel
        webSocketService.sendToChannel("admin", "case.resolved", caseEntity);
        
        log.info("Sent case resolution notifications for case {}", caseEntity.getCaseNumber());
    }

    /**
     * Notify about new case assignment
     */
    @Async
    public void notifyCaseAssigned(Case caseEntity) {
        if (caseEntity.getAssignedTo() == null) {
            return;
        }

        String subject = String.format("New Case Assigned: %s", caseEntity.getCaseNumber());
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        
        // Notify assigned users
        for (Long userId : assignmentInfo.getUserIds()) {
            userRepository.findById(userId).ifPresent(assignee -> {
                Map<String, Object> variables = new HashMap<>();
                variables.put("userName", assignee.getName());
                variables.put("caseNumber", caseEntity.getCaseNumber());
                variables.put("caseTitle", caseEntity.getTitle());
                variables.put("severity", caseEntity.getSeverity());
                variables.put("slaDeadline", caseEntity.getSlaDeadline().format(DATE_FORMAT));
                
                // Send email notification
                if (emailEnabled && assignee.getEmail() != null) {
                    sendEmailNotification(assignee.getEmail(), subject, "case-assigned", variables);
                }
                
                persistInAppNotification(
                        assignee,
                        caseEntity,
                        Notification.NotificationType.CASE_ASSIGNED,
                        subject,
                        String.format("Case %s assigned to you", caseEntity.getCaseNumber()),
                        buildCaseMetadata(caseEntity, null)
                );
                // Send WebSocket notification
                webSocketService.sendToUser(assignee.getId(), "case.assigned", caseEntity);
                
                log.info("Sent case assignment notification for case {} to user {}", 
                        caseEntity.getCaseNumber(), assignee.getName());
            });
        }
    }

    /**
     * Notify about SLA breach
     */
    @Async
    public void notifySlaBreached(Case caseEntity) {
        if (caseEntity.getAssignedTo() == null) {
            return;
        }

        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        String subject = String.format("SLA Breach Alert: %s", caseEntity.getCaseNumber());
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("caseNumber", caseEntity.getCaseNumber());
        variables.put("caseTitle", caseEntity.getTitle());
        variables.put("severity", caseEntity.getSeverity());
        variables.put("slaDeadline", caseEntity.getSlaDeadline().format(DATE_FORMAT));
        
        // Send notifications to all assigned users
        for (Long userId : assignmentInfo.getUserIds()) {
            userRepository.findById(userId).ifPresent(assignee -> {
                Map<String, Object> userVariables = new HashMap<>(variables);
                userVariables.put("userName", assignee.getName());
                
                // Send email notification
                if (emailEnabled && assignee.getEmail() != null) {
                    sendEmailNotification(assignee.getEmail(), subject, "sla-breach", userVariables);
                }
                
                persistInAppNotification(
                        assignee,
                        caseEntity,
                        Notification.NotificationType.SLA_BREACH,
                        subject,
                        String.format("SLA breached for case %s", caseEntity.getCaseNumber()),
                        buildCaseMetadata(caseEntity, null)
                );
                // Send WebSocket notification
                webSocketService.sendToUser(assignee.getId(), "case.sla-breach", caseEntity);
                
                log.warn("Sent SLA breach notification for case {} to user {}", 
                        caseEntity.getCaseNumber(), assignee.getName());
            });
        }
    }

    /**
     * Notify about case update
     */
    @Async
    public void notifyCaseUpdated(Case caseEntity, String updateType) {
        if (caseEntity.getAssignedTo() == null) {
            return;
        }

        // Send WebSocket notification
        Map<String, Object> update = new HashMap<>();
        update.put("case", caseEntity);
        update.put("updateType", updateType);
        
        // Send to all assigned users
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        for (Long userId : assignmentInfo.getUserIds()) {
            userRepository.findById(userId).ifPresent(user -> persistInAppNotification(
                    user,
                    caseEntity,
                    Notification.NotificationType.CASE_UPDATED,
                    "Case Updated: " + caseEntity.getCaseNumber(),
                    String.format("Case %s updated (%s)", caseEntity.getCaseNumber(), updateType),
                    buildCaseMetadata(caseEntity, updateType)
            ));
            webSocketService.sendToUser(userId, "case.updated", update);
        }
    }

    /**
     * Send simple email
     */
    public void sendSimpleEmail(String to, String subject, String text) {
        if (!emailEnabled || mailSender == null) {
            log.debug("Email notifications disabled or mail sender not configured, skipping email to: {}", to);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(emailFrom);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            
            mailSender.send(message);
            log.info("Sent email to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", to, e);
        }
    }

    /**
     * Send HTML email from template
     */
    private void sendEmailNotification(String to, String subject, String templateName, 
                                      Map<String, Object> variables) {
        if (!emailEnabled || mailSender == null) {
            log.debug("Email notifications disabled or mail sender not configured, skipping email to: {}", to);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(emailFrom, emailFromName);
            helper.setTo(to);
            helper.setSubject(subject);
            
            // Build HTML content
            String htmlContent = buildHtmlContent(templateName, variables);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            log.info("Sent HTML email to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send HTML email to: {}", to, e);
        }
    }

    /**
     * Notify all administrators
     */
    @Async
    public void notifyAdmins(String subject, String message) {
        // Get all admin users
        Map<String, Object> notification = new HashMap<>();
        notification.put("subject", subject);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());
        
        // Send WebSocket notification to admin channel
        webSocketService.sendToChannel("admin", "admin.notification", notification);
        
        log.info("Sent admin notification: {}", subject);
    }

    /**
     * Notify ONLY administrators about unassigned cases
     * This method ensures that unassigned cases are only visible to admins
     */
    @Async
    public void notifyAdminsOnly(String subject, String message, Case caseEntity) {
        // Create notification data for admins only
        Map<String, Object> notification = new HashMap<>();
        notification.put("subject", subject);
        notification.put("message", message);
        notification.put("caseId", caseEntity.getId());
        notification.put("caseNumber", caseEntity.getCaseNumber());
        notification.put("caseTitle", caseEntity.getTitle());
        notification.put("severity", caseEntity.getSeverity().toString());
        notification.put("isUnassigned", true);
        notification.put("timestamp", System.currentTimeMillis());
        
        // Send WebSocket notification ONLY to admin channel (single notification)
        webSocketService.sendToChannel("admin", "admin.unassigned-case", notification);

        // Persist for admins and managers so it appears in notification history
        notifyRoleUsers(User.UserRole.ADMIN, caseEntity, subject, "CASE_CREATED");
        notifyRoleUsers(User.UserRole.MANAGER, caseEntity, subject, "CASE_CREATED");
        
        log.info("Sent unassigned case notification to admins only for case: {}", caseEntity.getCaseNumber());
    }

    /**
     * Send generic notification to user
     */
    @Async
    public void sendNotification(User user, String subject, String message, String notificationType) {
        if (user == null) {
            log.warn("Cannot send notification - user is null");
            return;
        }
        
        log.info("Sending {} notification to user: {}", notificationType, user.getLogin());
        
        try {
            // Send email if enabled and user has email
            if (emailEnabled && user.getEmail() != null && mailSender != null) {
                sendSimpleEmail(user.getEmail(), subject, message);
            }
            
            Notification.NotificationType mappedType = mapNotificationType(notificationType);
            persistInAppNotification(
                    user,
                    null,
                    mappedType,
                    subject,
                    message,
                    Map.of("type", notificationType)
            );

            // Send WebSocket notification
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("type", notificationType);
            notificationData.put("subject", subject);
            notificationData.put("message", message);
            notificationData.put("timestamp", System.currentTimeMillis());
            
            webSocketService.sendToUser(user.getId(), "notification", notificationData);
            
            log.info("Successfully sent {} notification to user: {}", notificationType, user.getLogin());
        } catch (Exception e) {
            log.error("Failed to send notification to user {}: {}", user.getLogin(), e.getMessage(), e);
        }
    }

    /**
     * Send case notification and persist with case context
     */
    @Async
    public void sendCaseNotification(User user, Case caseEntity, String subject, String message, String notificationType,
                                     Map<String, Object> metadata) {
        if (user == null) {
            log.warn("Cannot send case notification - user is null");
            return;
        }

        try {
            if (emailEnabled && user.getEmail() != null && mailSender != null) {
                sendSimpleEmail(user.getEmail(), subject, message);
            }

            Map<String, Object> mergedMetadata = new HashMap<>();
            if (metadata != null) {
                mergedMetadata.putAll(metadata);
            }
            if (caseEntity != null) {
                mergedMetadata.putIfAbsent("caseId", caseEntity.getId());
                mergedMetadata.putIfAbsent("caseNumber", caseEntity.getCaseNumber());
            }

            persistInAppNotification(
                    user,
                    caseEntity,
                    mapNotificationType(notificationType),
                    subject,
                    message,
                    mergedMetadata
            );

            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("type", notificationType);
            notificationData.put("subject", subject);
            notificationData.put("message", message);
            notificationData.put("timestamp", System.currentTimeMillis());
            if (caseEntity != null) {
                notificationData.put("caseId", caseEntity.getId());
                notificationData.put("caseNumber", caseEntity.getCaseNumber());
            }
            notificationData.put("data", mergedMetadata);

            webSocketService.sendToUser(user.getId(), "notification", notificationData);
        } catch (Exception e) {
            log.error("Failed to send case notification to user {}: {}", user.getLogin(), e.getMessage(), e);
        }
    }

    private void notifyRoleUsers(User.UserRole role, Case caseEntity, String subject, String notificationType) {
        for (User admin : userRepository.findByRole(role)) {
            persistInAppNotification(
                    admin,
                    caseEntity,
                    mapNotificationType(notificationType),
                    subject,
                    String.format("Case %s created: %s", caseEntity.getCaseNumber(), caseEntity.getTitle()),
                    buildCaseMetadata(caseEntity, null)
            );
        }
    }

    private Notification persistInAppNotification(
            User user,
            Case caseEntity,
            Notification.NotificationType type,
            String subject,
            String message,
            Map<String, Object> metadata) {
        Notification notification = Notification.builder()
                .recipientUser(user)
                .recipientEmail(user.getEmail())
                .recipientName(user.getName())
                .caseEntity(caseEntity)
                .notificationType(type != null ? type : Notification.NotificationType.CUSTOM)
                .channel(Notification.NotificationChannel.IN_APP)
                .priority(Notification.Priority.NORMAL)
                .subject(subject)
                .message(message)
                .status(Notification.NotificationStatus.SENT)
                .sentAt(LocalDateTime.now())
                .additionalMetadata(metadata)
                .build();
        return notificationRepository.save(notification);
    }

    private Notification.NotificationType mapNotificationType(String rawType) {
        if (rawType == null) {
            return Notification.NotificationType.CUSTOM;
        }
        return switch (rawType.toUpperCase()) {
            case "CASE_CREATED" -> Notification.NotificationType.CASE_CREATED;
            case "CASE_ASSIGNED", "TEAM_CASE_CREATED" -> Notification.NotificationType.CASE_ASSIGNED;
            case "CASE_UPDATED", "CASE_REOPENED" -> Notification.NotificationType.CASE_UPDATED;
            case "CASE_RESOLVED", "CASE_CLOSED" -> Notification.NotificationType.CASE_RESOLVED;
            case "SLA_BREACH", "SLA_WARNING" -> Notification.NotificationType.SLA_BREACH;
            case "ALERT_FIRED", "ALERT_TRIGGERED" -> Notification.NotificationType.ALERT_FIRED;
            case "ALERT_RESOLVED" -> Notification.NotificationType.ALERT_RESOLVED;
            default -> Notification.NotificationType.CUSTOM;
        };
    }

    private Map<String, Object> buildCaseMetadata(Case caseEntity, String updateType) {
        if (caseEntity == null) {
            return new HashMap<>();
        }
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("caseId", caseEntity.getId());
        metadata.put("caseNumber", caseEntity.getCaseNumber());
        metadata.put("caseTitle", caseEntity.getTitle());
        metadata.put("severity", caseEntity.getSeverity() != null ? caseEntity.getSeverity().name() : null);
        metadata.put("status", caseEntity.getStatus() != null ? caseEntity.getStatus().name() : null);
        metadata.put("priority", caseEntity.getPriority());
        if (updateType != null) {
            metadata.put("updateType", updateType);
        }
        return metadata;
    }

    /**
     * Notify all team members about a case
     */
    @Async
    public void notifyTeam(Case caseEntity, String message) {
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        
        // Notify all assigned users
        if (assignmentInfo.getUserIds() != null) {
            for (Long userId : assignmentInfo.getUserIds()) {
                userRepository.findById(userId).ifPresent(user -> {
                    sendNotification(user, "Team Update: " + caseEntity.getCaseNumber(), message, "TEAM_UPDATE");
                });
            }
        }
        
        // Also send to team channels via WebSocket
        if (assignmentInfo.getTeamIds() != null) {
            for (Long teamId : assignmentInfo.getTeamIds()) {
                Map<String, Object> notification = new HashMap<>();
                notification.put("caseId", caseEntity.getId());
                notification.put("caseNumber", caseEntity.getCaseNumber());
                notification.put("message", message);
                notification.put("timestamp", System.currentTimeMillis());
                
                webSocketService.sendToChannel("team." + teamId, "team.update", notification);
            }
        }
        
        log.info("Sent team notifications for case: {}", caseEntity.getCaseNumber());
    }

    /**
     * Notify all managers
     */
    @Async
    public void notifyManagers(String subject, String message) {
        // Find all users with MANAGER or ADMIN role
        // For now, send to admin channel
        Map<String, Object> notification = new HashMap<>();
        notification.put("subject", subject);
        notification.put("message", message);
        notification.put("priority", "HIGH");
        notification.put("timestamp", System.currentTimeMillis());
        
        // Send to manager channel
        webSocketService.sendToChannel("managers", "manager.alert", notification);
        
        // Also send to admin channel
        webSocketService.sendToChannel("admin", "manager.alert", notification);
        
        log.info("Sent manager notification: {}", subject);
    }

    /**
     * Build HTML content for email
     */
    private String buildHtmlContent(String templateName, Map<String, Object> variables) {
        // Simple HTML template - in production, use Thymeleaf or similar
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html><head>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; }");
        html.append(".content { padding: 20px; }");
        html.append(".footer { background-color: #f8f9fa; padding: 10px; text-align: center; }");
        html.append("</style>");
        html.append("</head><body>");
        
        html.append("<div class='header'><h2>").append(applicationName).append("</h2></div>");
        html.append("<div class='content'>");
        
        switch (templateName) {
            case "case-created" -> {
                html.append("<p>Dear ").append(variables.getOrDefault("userName", "User")).append(",</p>");
                html.append("<p>A new case has been created:</p>");
                html.append("<ul>");
                html.append("<li><strong>Case Number:</strong> ").append(variables.get("caseNumber")).append("</li>");
                html.append("<li><strong>Title:</strong> ").append(variables.get("caseTitle")).append("</li>");
                html.append("<li><strong>Severity:</strong> ").append(variables.get("severity")).append("</li>");
                html.append("<li><strong>SLA Deadline:</strong> ").append(variables.get("slaDeadline")).append("</li>");
                html.append("</ul>");
                if (variables.get("description") != null) {
                    html.append("<p><strong>Description:</strong><br>").append(variables.get("description")).append("</p>");
                }
                html.append("<p>Please log in to the system to view and manage this case.</p>");
            }
            case "case-resolved" -> {
                html.append("<p>Dear ").append(variables.getOrDefault("userName", "User")).append(",</p>");
                html.append("<p><strong style='color: green;'>CASE RESOLVED</strong></p>");
                html.append("<p>The following case has been resolved:</p>");
                html.append("<ul>");
                html.append("<li><strong>Case Number:</strong> ").append(variables.get("caseNumber")).append("</li>");
                html.append("<li><strong>Title:</strong> ").append(variables.get("caseTitle")).append("</li>");
                html.append("<li><strong>Severity:</strong> ").append(variables.get("severity")).append("</li>");
                html.append("<li><strong>Resolved At:</strong> ").append(variables.get("resolvedAt")).append("</li>");
                html.append("</ul>");
                if (variables.get("resolutionActions") != null) {
                    html.append("<p><strong>Resolution Actions:</strong><br>").append(variables.get("resolutionActions")).append("</p>");
                }
                html.append("<p>Please review the resolution details in the system.</p>");
            }
            case "case-assigned" -> {
                html.append("<p>Dear ").append(variables.get("userName")).append(",</p>");
                html.append("<p>A new case has been assigned to you:</p>");
                html.append("<ul>");
                html.append("<li><strong>Case Number:</strong> ").append(variables.get("caseNumber")).append("</li>");
                html.append("<li><strong>Title:</strong> ").append(variables.get("caseTitle")).append("</li>");
                html.append("<li><strong>Severity:</strong> ").append(variables.get("severity")).append("</li>");
                html.append("<li><strong>SLA Deadline:</strong> ").append(variables.get("slaDeadline")).append("</li>");
                html.append("</ul>");
                html.append("<p>Please log in to the system to view and manage this case.</p>");
            }
            case "sla-breach" -> {
                html.append("<p>Dear ").append(variables.get("userName")).append(",</p>");
                html.append("<p><strong style='color: red;'>SLA BREACH ALERT</strong></p>");
                html.append("<p>The following case has breached its SLA:</p>");
                html.append("<ul>");
                html.append("<li><strong>Case Number:</strong> ").append(variables.get("caseNumber")).append("</li>");
                html.append("<li><strong>Title:</strong> ").append(variables.get("caseTitle")).append("</li>");
                html.append("<li><strong>Severity:</strong> ").append(variables.get("severity")).append("</li>");
                html.append("<li><strong>SLA Deadline:</strong> ").append(variables.get("slaDeadline")).append("</li>");
                html.append("</ul>");
                html.append("<p>Immediate action is required.</p>");
            }
        }
        
        html.append("</div>");
        html.append("<div class='footer'>");
        html.append("<p>This is an automated message from ").append(applicationName).append("</p>");
        html.append("</div>");
        html.append("</body></html>");
        
        return html.toString();
    }
}
