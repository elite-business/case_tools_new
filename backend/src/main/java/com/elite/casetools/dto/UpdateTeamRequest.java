package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating a team request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTeamRequest {
    private String name;
    private String description;
    private Long leadId;
    private String department;
    private String location;
    private String contactEmail;
    private String phone;
    private String specialization;
    private Boolean isActive;
}