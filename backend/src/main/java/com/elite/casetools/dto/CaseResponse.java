package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for case response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseResponse {
    private Long id;
    private String caseNumber;
    private String title;
    private String description;
    private String status;
    private String severity;
    private Integer priority;
    private String category;
    private List<UserSummaryDto> assignedUsers;
    private List<TeamSummaryDto> assignedTeams;
    private UserSummaryDto assignedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime assignedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private LocalDateTime slaDeadline;
    private Boolean slaBreached;
    private String rootCause;
    private String resolutionActions;
    private String preventiveMeasures;
    private String closureReason;
    private BigDecimal estimatedLoss;
    private BigDecimal actualLoss;
    private String affectedServices;
    private Integer affectedCustomers;
    private List<String> tags;
    private String customFields;
    private Long alertId;
    private String grafanaAlertId;
    private String grafanaAlertUid;
    private String alertData;
    private Integer resolutionTimeMinutes;
}
