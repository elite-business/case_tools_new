package com.elite.casetools.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColumnInfo {
    private String column_name;
    private String data_type;
    private String is_nullable; // 'YES' or 'NO'
    private Object column_default;
    private Integer character_maximum_length;
    private Integer numeric_precision;
    private Integer numeric_scale;
    private Integer ordinal_position;
    private Boolean is_primary_key;
    private Boolean is_foreign_key;
    private String referenced_table_name;
    private String referenced_column_name;
    private String comment;
    private Map<String, Object> type_info;
}