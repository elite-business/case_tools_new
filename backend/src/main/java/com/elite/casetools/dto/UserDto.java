package com.elite.casetools.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

@lombok.Data
@lombok.Builder
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class UserDto {
    private Long id;
    
    @JsonProperty("fullName")
    private String name;
    
    @JsonProperty("username")
    private String login;
    
    private String email;
    private String matricule;
    private String role;
    
    @JsonProperty("isActive")
    private Boolean status; // Will be converted to boolean in controller
    
    private String department;
    private String phone;
    private java.time.LocalDateTime lastLogin;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
    private PermissionsDto permissions;

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PermissionsDto {
        private Boolean domainControl;
        private Boolean revenueStream;
        private Boolean historiqueAlert;
        private Boolean adminAdd;
        private Boolean raRule;
        private Boolean stat;
        private Boolean assignedTo;
        private Boolean reAssignedTo;
        private Boolean closed;
    }
}
