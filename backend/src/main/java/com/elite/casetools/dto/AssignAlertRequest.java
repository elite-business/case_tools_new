package com.elite.casetools.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for assigning alert to user
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignAlertRequest {
    @NotNull(message = "User ID is required")
    private Long userId;
}