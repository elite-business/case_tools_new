package com.elite.casetools.dto;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrafanaFolder {
    private String uid;
    private String title;
    private String url;
    private Boolean canAdmin;
    private Boolean canEdit;
    private Boolean canSave;
    private Boolean canDelete;
    private String version;
}