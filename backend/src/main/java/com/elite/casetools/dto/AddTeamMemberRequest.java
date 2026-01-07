package com.elite.casetools.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for adding a team member request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddTeamMemberRequest {
    @NotNull(message = "User ID is required")
    private Long userId;
    
    private String role;
    private String specialization;
}