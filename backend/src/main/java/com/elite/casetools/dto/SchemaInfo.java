package com.elite.casetools.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemaInfo {
    private String name;
    private String owner;
    private String type;
    private List<TableInfo> tables;
}