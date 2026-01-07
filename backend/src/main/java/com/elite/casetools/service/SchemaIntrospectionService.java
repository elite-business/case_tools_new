package com.elite.casetools.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchemaIntrospectionService {
    
    private final JdbcTemplate jdbcTemplate;
    
    /**
     * Get list of available schemas (excluding system schemas)
     */
    public List<Map<String, Object>> getSchemas() {
        log.info("Fetching available database schemas");
        
        String sql = """
            SELECT schema_name, 
                   schema_owner,
                   'schema' as type
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 
                                     'pg_temp_1', 'pg_toast_temp_1', 'public')
               OR schema_name IN ('stat', 'cdrs_archives', 'tableref', 'grafana', 'casemanagement', 'public')
            ORDER BY 
                CASE 
                    WHEN schema_name IN ('casemanagement', 'stat', 'cdrs_archives') THEN 1
                    WHEN schema_name = 'public' THEN 2
                    WHEN schema_name IN ('tableref', 'grafana') THEN 3
                    ELSE 4
                END,
                schema_name
            """;
        
        try {
            List<Map<String, Object>> schemas = jdbcTemplate.queryForList(sql);
            log.info("Found {} schemas", schemas.size());
            return schemas;
        } catch (Exception e) {
            log.error("Error fetching schemas: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch database schemas: " + e.getMessage());
        }
    }
    
    /**
     * Get list of tables in a specific schema
     */
    public List<Map<String, Object>> getTables(String schemaName) {
        log.info("Fetching tables for schema: {}", schemaName);
        
        String sql = """
            SELECT t.table_name,
                   t.table_type,
                   pg_size_pretty(pg_total_relation_size(c.oid)) as size,
                   obj_description(c.oid, 'pg_class') as comment,
                   t.table_schema as schema_name
            FROM information_schema.tables t
            LEFT JOIN pg_class c ON c.relname = t.table_name
            LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
            WHERE t.table_schema = ?
              AND t.table_type IN ('BASE TABLE', 'VIEW')
            ORDER BY 
                CASE t.table_type 
                    WHEN 'BASE TABLE' THEN 1 
                    WHEN 'VIEW' THEN 2 
                    ELSE 3 
                END,
                t.table_name
            """;
        
        try {
            List<Map<String, Object>> tables = jdbcTemplate.queryForList(sql, schemaName);
            log.info("Found {} tables in schema {}", tables.size(), schemaName);
            return tables;
        } catch (Exception e) {
            log.error("Error fetching tables for schema {}: {}", schemaName, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch tables for schema " + schemaName + ": " + e.getMessage());
        }
    }
    
    /**
     * Get list of columns for a specific table
     */
    public List<Map<String, Object>> getColumns(String schemaName, String tableName) {
        log.info("Fetching columns for table: {}.{}", schemaName, tableName);
        
        String sql = """
            SELECT c.column_name,
                   c.data_type,
                   c.is_nullable,
                   c.column_default,
                   c.character_maximum_length,
                   c.numeric_precision,
                   c.numeric_scale,
                   c.ordinal_position,
                   CASE 
                       WHEN pk.column_name IS NOT NULL THEN true 
                       ELSE false 
                   END as is_primary_key,
                   CASE 
                       WHEN fk.column_name IS NOT NULL THEN true 
                       ELSE false 
                   END as is_foreign_key,
                   fk.referenced_table_name,
                   fk.referenced_column_name,
                   col_description(pgc.oid, c.ordinal_position) as comment
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.column_name, ku.table_name, ku.table_schema
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku 
                    ON tc.constraint_name = ku.constraint_name 
                    AND tc.table_schema = ku.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name 
                AND c.table_name = pk.table_name 
                AND c.table_schema = pk.table_schema
            LEFT JOIN (
                SELECT ku.column_name, ku.table_name, ku.table_schema,
                       ccu.table_name as referenced_table_name,
                       ccu.column_name as referenced_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku 
                    ON tc.constraint_name = ku.constraint_name
                    AND tc.table_schema = ku.table_schema
                JOIN information_schema.constraint_column_usage ccu 
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
            ) fk ON c.column_name = fk.column_name 
                AND c.table_name = fk.table_name 
                AND c.table_schema = fk.table_schema
            LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
            LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
            WHERE c.table_schema = ? AND c.table_name = ?
            ORDER BY c.ordinal_position
            """;
        
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(sql, schemaName, tableName);
            
            // Enhance column information with better type info
            for (Map<String, Object> column : columns) {
                enhanceColumnInfo(column);
            }
            
            log.info("Found {} columns for table {}.{}", columns.size(), schemaName, tableName);
            return columns;
        } catch (Exception e) {
            log.error("Error fetching columns for table {}.{}: {}", schemaName, tableName, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch columns for table " + schemaName + "." + tableName + ": " + e.getMessage());
        }
    }
    
    /**
     * Test SQL query and return sample results
     */
    public Map<String, Object> validateQuery(String query) {
        log.info("Validating SQL query against database");
        
        Map<String, Object> result = new HashMap<>();
        
        // Add LIMIT if not present to prevent large result sets
        String testQuery = query.trim();
        if (!testQuery.toLowerCase().contains("limit")) {
            testQuery += " LIMIT 10";
        }
        
        // Wrap in explain to check syntax without execution
        String explainQuery = "EXPLAIN " + testQuery;
        
        try {
            long startTime = System.currentTimeMillis();
            
            // First validate syntax
            List<Map<String, Object>> explainResult = jdbcTemplate.queryForList(explainQuery);
            result.put("valid", true);
            result.put("message", "Query syntax is valid");
            result.put("execution_plan", explainResult);
            
            // Then get sample data with execution time
            long dataStartTime = System.currentTimeMillis();
            List<Map<String, Object>> sampleData = jdbcTemplate.queryForList(testQuery);
            long executionTime = System.currentTimeMillis() - dataStartTime;
            
            result.put("sample_data", sampleData);
            result.put("row_count", sampleData.size());
            result.put("execution_time_ms", executionTime);
            result.put("validation_time_ms", System.currentTimeMillis() - startTime);
            
            // Get column info from result set
            if (!sampleData.isEmpty()) {
                List<Map<String, Object>> columns = new ArrayList<>();
                Map<String, Object> firstRow = sampleData.get(0);
                
                for (String columnName : firstRow.keySet()) {
                    Map<String, Object> colInfo = new HashMap<>();
                    colInfo.put("name", columnName);
                    Object value = firstRow.get(columnName);
                    colInfo.put("type", getColumnTypeFromValue(value));
                    colInfo.put("sample_value", value);
                    colInfo.put("is_numeric", value instanceof Number);
                    colInfo.put("is_null", value == null);
                    columns.add(colInfo);
                }
                result.put("columns", columns);
            }
            
            // Performance warning
            if (executionTime > 5000) {
                result.put("warning", "Query took " + executionTime + "ms to execute - consider optimizing for production use");
            }
            
        } catch (Exception e) {
            log.error("Query validation failed: {}", e.getMessage());
            result.put("valid", false);
            result.put("message", "Query validation failed: " + e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
            result.put("error_details", e.getMessage());
            
            // Try to provide more specific error messages
            String errorMsg = e.getMessage().toLowerCase();
            if (errorMsg.contains("relation") && errorMsg.contains("does not exist")) {
                result.put("suggestion", "Check if the table/schema name is correct and exists in the database");
            } else if (errorMsg.contains("column") && errorMsg.contains("does not exist")) {
                result.put("suggestion", "Check if all column names in the query are spelled correctly");
            } else if (errorMsg.contains("syntax error")) {
                result.put("suggestion", "Check SQL syntax - ensure proper quotes, commas, and operators");
            }
        }
        
        return result;
    }
    
    /**
     * Get table statistics including row counts and data distribution
     */
    public Map<String, Object> getTableStatistics(String schemaName, String tableName) {
        log.info("Getting statistics for table {}.{}", schemaName, tableName);
        
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // Get row count
            String countSql = String.format("SELECT COUNT(*) as row_count FROM %s.%s", schemaName, tableName);
            Long rowCount = jdbcTemplate.queryForObject(countSql, Long.class);
            stats.put("row_count", rowCount != null ? rowCount : 0);
            
            // Get table size
            String sizeSql = """
                SELECT pg_size_pretty(pg_total_relation_size(c.oid)) as size,
                       pg_size_pretty(pg_relation_size(c.oid)) as table_size,
                       pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_size
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = ? AND n.nspname = ?
                """;
            
            List<Map<String, Object>> sizeInfo = jdbcTemplate.queryForList(sizeSql, tableName, schemaName);
            if (!sizeInfo.isEmpty()) {
                stats.putAll(sizeInfo.get(0));
            }
            
            // Get recent activity (if timestamp column exists)
            try {
                List<Map<String, Object>> columns = getColumns(schemaName, tableName);
                String timestampColumn = null;
                
                for (Map<String, Object> column : columns) {
                    String columnName = (String) column.get("column_name");
                    String dataType = (String) column.get("data_type");
                    if (isDateType(dataType) && 
                        (columnName.toLowerCase().contains("timestamp") || 
                         columnName.toLowerCase().contains("created") ||
                         columnName.toLowerCase().contains("date"))) {
                        timestampColumn = columnName;
                        break;
                    }
                }
                
                if (timestampColumn != null) {
                    String activitySql = String.format(
                        "SELECT COUNT(*) as recent_count FROM %s.%s WHERE %s > NOW() - INTERVAL '24 hours'",
                        schemaName, tableName, timestampColumn
                    );
                    Long recentCount = jdbcTemplate.queryForObject(activitySql, Long.class);
                    stats.put("recent_24h_count", recentCount != null ? recentCount : 0);
                    stats.put("timestamp_column", timestampColumn);
                }
            } catch (Exception e) {
                log.debug("Could not get recent activity for {}.{}: {}", schemaName, tableName, e.getMessage());
            }
            
            // Get sample data
            String sampleSql = String.format("SELECT * FROM %s.%s LIMIT 3", schemaName, tableName);
            List<Map<String, Object>> sampleData = jdbcTemplate.queryForList(sampleSql);
            stats.put("sample_data", sampleData);
            
            log.info("Generated statistics for {}.{}: {} rows", schemaName, tableName, stats.get("row_count"));
            
        } catch (Exception e) {
            log.error("Error getting table statistics for {}.{}: {}", schemaName, tableName, e.getMessage());
            stats.put("error", e.getMessage());
        }
        
        return stats;
    }

    /**
     * Get suggested alert conditions based on column types and data
     */
    public List<Map<String, Object>> getSuggestedConditions(String schemaName, String tableName) {
        log.info("Generating suggested conditions for {}.{}", schemaName, tableName);
        
        List<Map<String, Object>> suggestions = new ArrayList<>();
        
        try {
            // Get numeric columns for threshold conditions
            String numericSql = """
                SELECT c.column_name, c.data_type
                FROM information_schema.columns c
                WHERE c.table_schema = ? AND c.table_name = ?
                  AND c.data_type IN ('integer', 'bigint', 'numeric', 'real', 'double precision', 'smallint', 'decimal')
                ORDER BY c.ordinal_position
                """;
            
            List<Map<String, Object>> numericColumns = jdbcTemplate.queryForList(numericSql, schemaName, tableName);
            
            for (Map<String, Object> column : numericColumns) {
                String columnName = (String) column.get("column_name");
                String dataType = (String) column.get("data_type");
                
                // Get statistical data
                try {
                    String statsSql = String.format(
                        "SELECT COUNT(*) as count, AVG(%s) as avg, MIN(%s) as min, MAX(%s) as max " +
                        "FROM %s.%s WHERE %s IS NOT NULL",
                        columnName, columnName, columnName, schemaName, tableName, columnName
                    );
                    
                    Map<String, Object> stats = jdbcTemplate.queryForMap(statsSql);
                    
                    // Create threshold suggestions
                    suggestions.add(createThresholdSuggestion(columnName, dataType, stats, "greater_than"));
                    suggestions.add(createThresholdSuggestion(columnName, dataType, stats, "less_than"));
                    
                } catch (Exception e) {
                    log.warn("Could not generate stats for column {}: {}", columnName, e.getMessage());
                }
            }
            
            // Get datetime columns for trend analysis
            String dateSql = """
                SELECT c.column_name, c.data_type
                FROM information_schema.columns c
                WHERE c.table_schema = ? AND c.table_name = ?
                  AND c.data_type IN ('timestamp', 'timestamp with time zone', 'date', 'time')
                ORDER BY c.ordinal_position
                """;
            
            List<Map<String, Object>> dateColumns = jdbcTemplate.queryForList(dateSql, schemaName, tableName);
            
            for (Map<String, Object> column : dateColumns) {
                String columnName = (String) column.get("column_name");
                suggestions.add(createTrendSuggestion(columnName, schemaName, tableName));
            }
            
        } catch (Exception e) {
            log.error("Error generating suggestions: {}", e.getMessage(), e);
        }
        
        return suggestions;
    }
    
    private void enhanceColumnInfo(Map<String, Object> column) {
        String dataType = (String) column.get("data_type");
        
        // Add user-friendly type information
        Map<String, Object> typeInfo = new HashMap<>();
        typeInfo.put("category", getTypeCategory(dataType));
        typeInfo.put("is_numeric", isNumericType(dataType));
        typeInfo.put("is_date", isDateType(dataType));
        typeInfo.put("is_text", isTextType(dataType));
        typeInfo.put("supports_aggregation", supportsAggregation(dataType));
        
        column.put("type_info", typeInfo);
    }
    
    private String getTypeCategory(String dataType) {
        if (isNumericType(dataType)) return "numeric";
        if (isDateType(dataType)) return "date";
        if (isTextType(dataType)) return "text";
        if (dataType.equals("boolean")) return "boolean";
        return "other";
    }
    
    private boolean isNumericType(String dataType) {
        return dataType.matches("(integer|bigint|smallint|numeric|decimal|real|double precision|money)");
    }
    
    private boolean isDateType(String dataType) {
        return dataType.matches("(timestamp.*|date|time.*)");
    }
    
    private boolean isTextType(String dataType) {
        return dataType.matches("(character.*|varchar.*|text|char.*)");
    }
    
    private boolean supportsAggregation(String dataType) {
        return isNumericType(dataType) || isDateType(dataType);
    }
    
    private String getColumnTypeFromValue(Object value) {
        if (value == null) return "unknown";
        if (value instanceof Number) return "numeric";
        if (value instanceof java.util.Date || value instanceof java.time.LocalDateTime) return "date";
        if (value instanceof Boolean) return "boolean";
        return "text";
    }
    
    private Map<String, Object> createThresholdSuggestion(String columnName, String dataType, 
                                                         Map<String, Object> stats, String operator) {
        Map<String, Object> suggestion = new HashMap<>();
        suggestion.put("type", "threshold");
        suggestion.put("column", columnName);
        suggestion.put("operator", operator);
        suggestion.put("description", String.format("Alert when %s is %s threshold", columnName, 
                      operator.equals("greater_than") ? "above" : "below"));
        
        // Calculate suggested threshold based on stats
        if (stats.get("avg") != null) {
            Double avg = ((Number) stats.get("avg")).doubleValue();
            Double max = stats.get("max") != null ? ((Number) stats.get("max")).doubleValue() : avg * 2;
            Double min = stats.get("min") != null ? ((Number) stats.get("min")).doubleValue() : 0.0;
            
            if (operator.equals("greater_than")) {
                suggestion.put("suggested_threshold", avg + (max - avg) * 0.2);
            } else {
                suggestion.put("suggested_threshold", avg - (avg - min) * 0.2);
            }
        }
        
        suggestion.put("stats", stats);
        return suggestion;
    }
    
    private Map<String, Object> createTrendSuggestion(String columnName, String schemaName, String tableName) {
        Map<String, Object> suggestion = new HashMap<>();
        suggestion.put("type", "trend");
        suggestion.put("column", columnName);
        suggestion.put("description", String.format("Monitor data trends over time using %s", columnName));
        suggestion.put("suggested_query", String.format(
            "SELECT COUNT(*) as record_count, DATE(%s) as day FROM %s.%s WHERE %s >= NOW() - INTERVAL '7 days' GROUP BY DATE(%s) ORDER BY day",
            columnName, schemaName, tableName, columnName, columnName
        ));
        return suggestion;
    }
}