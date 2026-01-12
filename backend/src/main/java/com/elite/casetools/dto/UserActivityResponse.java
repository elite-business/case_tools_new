package com.elite.casetools.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserActivityResponse {
    private String action;
    private String description;
    private String type;
    private LocalDateTime timestamp;
    private Long caseId;
    private String caseNumber;
}
