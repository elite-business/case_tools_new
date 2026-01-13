package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for user summary information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String name;
    private String fullName;    // Add fullName for frontend compatibility
    private String email;
    private String login;
    private String username;    // Add username for frontend compatibility
    private String role;
    private String department;
}