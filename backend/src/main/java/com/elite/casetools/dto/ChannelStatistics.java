package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for notification channel statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelStatistics {
    private String channel;
    private int totalSent;
    private int delivered;
    private double avgDeliveryTime;
}
