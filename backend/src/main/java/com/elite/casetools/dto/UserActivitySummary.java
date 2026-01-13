package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for analytics user activity summary
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivitySummary {
    private String userName;
    private Long actionsCount;
    private LocalDateTime lastActivity;
    private Boolean isOnline;
}
