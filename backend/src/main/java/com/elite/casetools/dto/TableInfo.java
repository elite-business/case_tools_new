package com.elite.casetools.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableInfo {
    private String name;
    private String type;
    private String schema;
    private String size;
    private String comment;
    private List<ColumnInfo> columns;
}