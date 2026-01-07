package com.elite.casetools.service;

import com.elite.casetools.entity.Case;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for WebSocket messaging
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Send message to specific user
     */
    public void sendToUser(Long userId, String event, Object payload) {
        try {
            String destination = "/user/" + userId + "/queue/notifications";
            
            WebSocketMessage message = WebSocketMessage.builder()
                    .event(event)
                    .payload(objectMapper.writeValueAsString(payload))
                    .timestamp(System.currentTimeMillis())
                    .build();
            
            messagingTemplate.convertAndSend(destination, message);
            log.debug("Sent WebSocket message to user {}: {}", userId, event);
        } catch (Exception e) {
            log.error("Failed to send WebSocket message to user {}", userId, e);
        }
    }

    /**
     * Broadcast message to all users
     */
    public void broadcast(String event, Object payload) {
        try {
            String destination = "/topic/notifications";
            
            WebSocketMessage message = WebSocketMessage.builder()
                    .event(event)
                    .payload(objectMapper.writeValueAsString(payload))
                    .timestamp(System.currentTimeMillis())
                    .build();
            
            messagingTemplate.convertAndSend(destination, message);
            log.debug("Broadcast WebSocket message: {}", event);
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket message", e);
        }
    }

    /**
     * Send message to specific channel (e.g., admin channel)
     */
    public void sendToChannel(String channel, String event, Object payload) {
        try {
            String destination = "/topic/" + channel;
            
            WebSocketMessage message = WebSocketMessage.builder()
                    .event(event)
                    .payload(objectMapper.writeValueAsString(payload))
                    .timestamp(System.currentTimeMillis())
                    .build();
            
            messagingTemplate.convertAndSend(destination, message);
            log.debug("Sent WebSocket message to channel {}: {}", channel, event);
        } catch (Exception e) {
            log.error("Failed to send WebSocket message to channel {}", channel, e);
        }
    }

    /**
     * Notify about new case creation
     */
    public void notifyNewCase(Case caseEntity) {
        sendToChannel("cases", "case.created", caseEntity);
        if (caseEntity.getAssignedTo() != null) {
            sendToUser(caseEntity.getAssignedTo().getId(), "case.assigned", caseEntity);
        }
        log.info("Sent new case WebSocket notifications for case {}", caseEntity.getCaseNumber());
    }

    /**
     * Notify about case update
     */
    public void notifyCaseUpdate(Case caseEntity) {
        sendToChannel("cases", "case.updated", caseEntity);
        if (caseEntity.getAssignedTo() != null) {
            sendToUser(caseEntity.getAssignedTo().getId(), "case.updated", caseEntity);
        }
        log.debug("Sent case update WebSocket notifications for case {}", caseEntity.getCaseNumber());
    }

    /**
     * WebSocket message structure
     */
    @lombok.Data
    @lombok.Builder
    public static class WebSocketMessage {
        private String event;
        private String payload;
        private Long timestamp;
    }
}