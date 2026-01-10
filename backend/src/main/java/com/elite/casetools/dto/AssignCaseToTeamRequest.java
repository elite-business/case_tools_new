package com.elite.casetools.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for assigning case to team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignCaseToTeamRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;
}