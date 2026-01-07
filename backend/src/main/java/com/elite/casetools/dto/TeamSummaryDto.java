package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryDto {
    
    private Long id;
    private String name;
    private String description;
    private Integer memberCount;
    private String department;
    private Long leadId;
    private String leadName;
    private boolean isActive;
}