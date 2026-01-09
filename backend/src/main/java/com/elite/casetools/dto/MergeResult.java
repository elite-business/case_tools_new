package com.elite.casetools.dto;

import com.elite.casetools.entity.Case;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Result of merging multiple cases
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MergeResult {
    private Case primaryCase;
    private Integer mergedCount;
    private List<String> mergedCaseNumbers;
    private String performedBy;
    private LocalDateTime performedAt;
}