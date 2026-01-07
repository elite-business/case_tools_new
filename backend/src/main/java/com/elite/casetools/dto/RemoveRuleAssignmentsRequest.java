package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for removing rule assignments
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemoveRuleAssignmentsRequest {
    
    private List<Long> userIds;
    private List<Long> teamIds;
    private String reason;
}