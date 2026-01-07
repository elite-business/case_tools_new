package com.elite.casetools.dto;

import com.elite.casetools.entity.User;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating a new user
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    
    @NotBlank(message = "Full name is required")
    @JsonProperty("fullName")
    private String name;
    
    @NotBlank(message = "Username is required")
    @JsonProperty("username")
    private String login;
    
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "Password is required")
    private String password;
    
    @NotNull(message = "Role is required")
    private User.UserRole role;
    
    private String department;
    private String phone;
    private String matricule;
    
    @JsonProperty("isActive")
    @Builder.Default
    private Boolean active = true;
    
    // Permissions
    @Builder.Default
    private Boolean domainControl = false;
    
    @Builder.Default
    private Boolean revenueStream = false;
    
    @Builder.Default
    private Boolean historiqueAlert = false;
    
    @Builder.Default
    private Boolean adminAdd = false;
    
    @Builder.Default
    private Boolean raRule = false;
    
    @Builder.Default
    private Boolean stat = false;
    
    @Builder.Default
    private Boolean assignedTo = false;
    
    @Builder.Default
    private Boolean reAssignedTo = false;
    
    @Builder.Default
    private Boolean closed = false;
}