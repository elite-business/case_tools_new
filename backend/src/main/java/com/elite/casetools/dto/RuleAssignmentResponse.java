package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for rule assignments
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleAssignmentResponse {
    
    private Long id;
    private String grafanaRuleUid;
    private String grafanaRuleName;
    private String grafanaFolderUid;
    private String grafanaFolderName;
    private String datasourceUid;
    private String description;
    private String severity;
    private String category;
    private Boolean active;
    private Boolean autoAssignEnabled;
    private String assignmentStrategy;
    
    // Assignment details
    private List<UserSummaryDto> assignedUsers;
    private List<TeamSummaryDto> assignedTeams;
    private Integer assignedUserCount;
    private Integer assignedTeamCount;
    private Integer totalAssignedUsers; // Including team members
    
    // Audit fields
    private UserSummaryDto createdBy;
    private UserSummaryDto updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Statistics (optional)
    private Integer caseCount;
    private Integer openCaseCount;
    private LocalDateTime lastAlertAt;
}