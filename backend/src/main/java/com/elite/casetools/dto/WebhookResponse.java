package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for webhook response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookResponse {
    
    private boolean success;
    private String message;
    private List<CaseInfo> cases;
    private Integer processingTime;
    private Integer notificationsSent;
    private String error;
    private LocalDateTime timestamp;
    
    public static WebhookResponse success(String message, List<CaseInfo> cases, Integer notificationsSent) {
        return WebhookResponse.builder()
                .success(true)
                .message(message)
                .cases(cases)
                .notificationsSent(notificationsSent)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    public static WebhookResponse error(String error) {
        return WebhookResponse.builder()
                .success(false)
                .error(error)
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CaseInfo {
        private Long caseId;
        private String caseNumber;
        private String alertFingerprint;
        private String status;
        private UserInfo assignedTo;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String name;
    }
}