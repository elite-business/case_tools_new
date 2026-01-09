package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for bulk operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkOperationResponse {
    
    private Integer success;
    private Integer failed;
    private Integer total;
    
    private List<String> successfulCaseNumbers;
    private List<BulkOperationError> errors;
    
    private String message;
    private LocalDateTime processedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkOperationError {
        private Long caseId;
        private String caseNumber;
        private String error;
    }
    
    // Helper methods
    public static BulkOperationResponse success(int successCount, List<String> caseNumbers) {
        return BulkOperationResponse.builder()
                .success(successCount)
                .failed(0)
                .total(successCount)
                .successfulCaseNumbers(caseNumbers)
                .message("All operations completed successfully")
                .processedAt(LocalDateTime.now())
                .build();
    }
    
    public static BulkOperationResponse mixed(int successCount, int failedCount, 
                                            List<String> successCases, 
                                            List<BulkOperationError> errors) {
        return BulkOperationResponse.builder()
                .success(successCount)
                .failed(failedCount)
                .total(successCount + failedCount)
                .successfulCaseNumbers(successCases)
                .errors(errors)
                .message(String.format("%d successful, %d failed", successCount, failedCount))
                .processedAt(LocalDateTime.now())
                .build();
    }
}