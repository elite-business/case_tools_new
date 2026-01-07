package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for assigning users and teams to rules
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignRuleRequest {
    
    private List<Long> userIds;
    private List<Long> teamIds;
    private String reason;
}