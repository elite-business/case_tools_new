package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating system setting request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSystemSettingRequest {
    @NotBlank(message = "Value is required")
    private String value;
}