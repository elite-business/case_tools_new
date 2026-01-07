package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for analytics trends response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsTrendsResponse {
    private List<TrendDataPoint> trends;
    private String metric;
    private String period;
    private String startDate;
    private String endDate;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendDataPoint {
        private String timestamp;
        private Double value;
        private String label;
        private String category;
    }
}