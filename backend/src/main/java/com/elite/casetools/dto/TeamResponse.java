package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for team response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponse {
    private Long id;
    private String name;
    private String description;
    private UserSummaryDto leader;
    private UserSummaryDto lead;        // Add lead field for frontend compatibility
    private String department;
    private String location;
    private String contactEmail;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean active;
    private Boolean isActive;           // Add isActive for frontend compatibility
    private List<TeamMemberResponse> members;
    private Integer memberCount;
    private String specialization;
    private TeamPerformanceResponse.TeamPerformanceData performance;
}
