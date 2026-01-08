package com.elite.casetools.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO representing assignment information for cases and alerts
 * Stored as JSONB in database
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AssignmentInfo {
    
    @Builder.Default
    private List<Long> userIds = new ArrayList<>();
    
    @Builder.Default
    private List<Long> teamIds = new ArrayList<>();
    
    /**
     * Check if there are any assignments
     */
    public boolean hasAssignments() {
        return (userIds != null && !userIds.isEmpty()) || 
               (teamIds != null && !teamIds.isEmpty());
    }
    
    /**
     * Check if a specific user is assigned
     */
    public boolean isUserAssigned(Long userId) {
        return userIds != null && userIds.contains(userId);
    }
    
    /**
     * Check if a specific team is assigned
     */
    public boolean isTeamAssigned(Long teamId) {
        return teamIds != null && teamIds.contains(teamId);
    }
    
    /**
     * Add a user assignment
     */
    public void addUser(Long userId) {
        if (userIds == null) {
            userIds = new ArrayList<>();
        }
        if (!userIds.contains(userId)) {
            userIds.add(userId);
        }
    }
    
    /**
     * Add a team assignment
     */
    public void addTeam(Long teamId) {
        if (teamIds == null) {
            teamIds = new ArrayList<>();
        }
        if (!teamIds.contains(teamId)) {
            teamIds.add(teamId);
        }
    }
}