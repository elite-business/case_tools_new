package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for notification report response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationReportResponse {
    private LocalDateTime generatedAt;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<ChannelStatistics> channelStatistics;
    private List<NotificationTrend> trends;
    private NotificationStatistics overallStatistics;
}
