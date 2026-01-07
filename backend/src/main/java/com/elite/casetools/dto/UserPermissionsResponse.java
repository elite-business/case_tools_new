package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for user permissions response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissionsResponse {

    /**
     * Navigation permissions (what menu items user can see)
     */
    private Map<String, Boolean> navigation;

    /**
     * Action permissions (what buttons/actions user can perform)
     */
    private Map<String, Boolean> actions;

    /**
     * Data filtering information for the user
     */
    private Map<String, Object> dataFilters;

    /**
     * Whether user is admin
     */
    private Boolean isAdmin;

    /**
     * Whether user is manager
     */
    private Boolean isManager;
}