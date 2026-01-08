package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for alert history response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertHistoryResponse {
    private Long id;
    private String alertId;
    private String grafanaAlertId;
    private String grafanaAlertUid;
    private String title;
    private String description;
    private String status;
    private String severity;
    private String category;
    private List<UserSummaryDto> assignedUsers;
    private List<TeamSummaryDto> assignedTeams;
    private UserSummaryDto acknowledgedBy;
    private UserSummaryDto resolvedBy;
    private LocalDateTime triggeredAt;
    private LocalDateTime createdAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime updatedAt;
    private String acknowledgeNotes;
    private String resolveNotes;
    private List<String> tags;
    private String customFields;
    private String source;
    private String ruleId;
    private String ruleName;
}