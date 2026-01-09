package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Simple count response DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CountResponse {
    private Long count;
}