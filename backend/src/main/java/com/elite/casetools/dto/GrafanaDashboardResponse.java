package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Grafana dashboard response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaDashboardResponse {
    private Long id;
    private String uid;
    private String title;
    private String url;
    private String folderUid;
    private String folderTitle;
    private Boolean isStarred;
    private List<String> tags;
    private String version;
    private LocalDateTime created;
    private LocalDateTime updated;
    private String createdBy;
    private String updatedBy;
    private Boolean synced;
    private LocalDateTime lastSync;
}