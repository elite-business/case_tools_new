package com.elite.casetools.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrafanaContactPoint {
    private String uid;
    private String name;
    private String type;
    private Boolean disableResolveMessage;
    private Map<String, Object> settings;
}