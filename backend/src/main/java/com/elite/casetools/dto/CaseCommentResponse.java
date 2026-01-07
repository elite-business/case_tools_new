package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for case comment response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseCommentResponse {
    private Long id;
    private String comment;
    private String commentType;
    private Boolean isInternal;
    private UserSummaryDto user;
    private LocalDateTime createdAt;
    private String attachments;
}