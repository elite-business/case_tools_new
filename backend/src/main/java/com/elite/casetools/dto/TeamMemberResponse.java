package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for team member response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberResponse {
    private Long id;
    private UserSummaryDto user;
    private String username;
    private String fullName;
    private String email;
    private String role;
    private LocalDateTime joinedAt;
    private LocalDateTime updatedAt;
    private Boolean active;
    private String specialization;
}