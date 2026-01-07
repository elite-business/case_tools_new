package com.elite.casetools.dto;

import com.elite.casetools.entity.User;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating user information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    
    @JsonProperty("fullName")
    private String name;
    
    @JsonProperty("username")
    private String login;
    
    @Email(message = "Invalid email format")
    private String email;
    
    private User.UserRole role;
    
    @JsonProperty("isActive")
    private Boolean active;
    private String department;
    private String phone;
    private String matricule;
    
    // Permissions
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