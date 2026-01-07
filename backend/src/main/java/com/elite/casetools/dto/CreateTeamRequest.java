package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for creating a team request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTeamRequest {
    @NotBlank(message = "Team name is required")
    private String name;
    
    private String description;
    private Long leadId;
    private List<Long> memberIds;
    private String department;
    private Boolean isActive;
    private String location;
    private String contactEmail;
    private String phone;
    private String specialization;
}