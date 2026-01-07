package com.elite.casetools.dto;

@lombok.Data
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class ResetPasswordRequest {
    @jakarta.validation.constraints.NotBlank(message = "New password is required")
    private String newPassword;
}