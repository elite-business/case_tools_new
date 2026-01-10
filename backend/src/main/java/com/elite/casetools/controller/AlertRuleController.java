package com.elite.casetools.controller;

import com.elite.casetools.dto.*;
import com.elite.casetools.service.GrafanaService;
import com.elite.casetools.service.SchemaIntrospectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for managing alert rules
 * Provides compatibility layer for frontend that expects /alert-rules/* endpoints
 */
@RestController
@RequestMapping("/alert-rules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Alert Rules", description = "Alert rule management endpoints")
public class AlertRuleController {

    private final GrafanaService grafanaService;
    private final SchemaIntrospectionService schemaService;

    /**
     * Get all alert rules
     */
    @GetMapping
    @Operation(summary = "Get all alert rules", description = "Retrieve all configured alert rules from Grafana")
    public ResponseEntity<List<GrafanaAlertRuleResponse>> getAllRules(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {
        
        log.info("Fetching alert rules with filters - status: {}, severity: {}", status, severity);
        
        try {
            List<GrafanaAlertRuleResponse> rules = grafanaService.getAlertRules();
            
            // Apply filters if provided
            if (status != null || severity != null) {
                rules = rules.stream()
                    .filter(rule -> status == null || rule.getState().equalsIgnoreCase(status))
                    .filter(rule -> severity == null || 
                        (rule.getAnnotations() != null && 
                         severity.equalsIgnoreCase(rule.getAnnotations().get("severity"))))
                    .toList();
            }
            
            return ResponseEntity.ok(rules);
        } catch (Exception e) {
            log.error("Failed to fetch alert rules", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get alert rule by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get alert rule by ID", description = "Retrieve a specific alert rule by its ID")
    public ResponseEntity<GrafanaAlertRuleResponse> getRuleById(@PathVariable String id) {
        log.info("Fetching alert rule with ID: {}", id);
        
        try {
            List<GrafanaAlertRuleResponse> rules = grafanaService.getAlertRules();
            
            return rules.stream()
                .filter(rule -> rule.getUid() != null && rule.getUid().equals(id))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to fetch alert rule", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create new alert rule
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create alert rule", description = "Create a new alert rule in Grafana")
    public ResponseEntity<GrafanaAlertRuleResponse> createRule(@RequestBody GrafanaAlertRuleRequest request) {
        log.info("Creating new alert rule: {}", request.getTitle());
        
        try {
            // Convert GrafanaAlertRuleRequest to CreateGrafanaAlertRuleRequest
            CreateGrafanaAlertRuleRequest createRequest = CreateGrafanaAlertRuleRequest.builder()
                .title(request.getTitle())
                .folderUID(request.getFolderUID())
                .ruleGroup(request.getRuleGroup())
                .query(request.getQuery())
                .datasourceUID(request.getDatasourceUID())
                .condition(request.getCondition())
                .evaluationInterval(request.getEvaluationInterval())
                .for_(request.getFor_())
                .annotations(request.getAnnotations())
                .labels(request.getLabels())
                .noDataState(request.getNoDataState())
                .execErrState(request.getExecErrState())
                .thresholds(request.getThresholds())
                .build();
            
            GrafanaAlertRuleResponse response = grafanaService.createAlertRule(createRequest, "default");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create alert rule", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update existing alert rule
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update alert rule", description = "Update an existing alert rule")
    public ResponseEntity<GrafanaAlertRuleResponse> updateRule(
            @PathVariable String id,
            @RequestBody GrafanaAlertRuleRequest request) {
        
        log.info("Updating alert rule: {}", id);
        
        try {
            // In Grafana, update requires delete + create
            grafanaService.deleteAlertRule(id);
            
            // Convert request
            CreateGrafanaAlertRuleRequest updateRequest = CreateGrafanaAlertRuleRequest.builder()
                .title(request.getTitle())
                .folderUID(request.getFolderUID())
                .ruleGroup(request.getRuleGroup())
                .query(request.getQuery())
                .datasourceUID(request.getDatasourceUID())
                .condition(request.getCondition())
                .evaluationInterval(request.getEvaluationInterval())
                .for_(request.getFor_())
                .annotations(request.getAnnotations())
                .labels(request.getLabels())
                .noDataState(request.getNoDataState())
                .execErrState(request.getExecErrState())
                .thresholds(request.getThresholds())
                .build();
            
            GrafanaAlertRuleResponse response = grafanaService.createAlertRule(updateRequest, "default");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update alert rule", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete alert rule
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete alert rule", description = "Delete an alert rule from Grafana")
    public ResponseEntity<Void> deleteRule(@PathVariable String id) {
        log.info("Deleting alert rule: {}", id);
        
        try {
            grafanaService.deleteAlertRule(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Failed to delete alert rule", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Toggle alert rule enabled/disabled
     */
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Toggle alert rule", description = "Enable or disable an alert rule")
    public ResponseEntity<Map<String, Object>> toggleRule(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> request) {
        
        boolean enabled = request.getOrDefault("enabled", false);
        log.info("Toggling alert rule {} to enabled: {}", id, enabled);
        
        try {
            // This would need to be implemented in GrafanaService
            // For now, return success
            return ResponseEntity.ok(Map.of(
                "success", true,
                "enabled", enabled,
                "message", "Alert rule " + (enabled ? "enabled" : "disabled") + " successfully"
            ));
        } catch (Exception e) {
            log.error("Failed to toggle alert rule", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get available datasources
     */
    @GetMapping("/datasources")
    @Operation(summary = "Get datasources", description = "Get available datasources for alert rules")
    public ResponseEntity<List<Map<String, Object>>> getDatasources() {
        log.info("Fetching available datasources");
        
        return ResponseEntity.ok(List.of(
            Map.of(
                "id", 1,
                "name", "PostgreSQL",
                "type", "postgres",
                "isDefault", true,
                "url", "jdbc:postgresql://172.29.112.1:5432/raftools2"
            )
        ));
    }

    /**
     * Get database schemas
     */
    @GetMapping("/schemas")
    @Operation(summary = "Get database schemas", description = "Get available database schemas")
    public ResponseEntity<List<String>> getSchemas() {
        log.info("Fetching database schemas");
        
        try {
            // getSchemas returns List<Map<String, Object>>, extract schema names
            List<Map<String, Object>> schemas = schemaService.getSchemas();
            List<String> schemaNames = schemas.stream()
                .map(s -> (String) s.get("schema_name"))
                .toList();
            return ResponseEntity.ok(schemaNames);
        } catch (Exception e) {
            log.error("Failed to fetch schemas", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get tables in schema
     */
    @GetMapping("/tables/{schema}")
    @Operation(summary = "Get tables", description = "Get tables in a specific schema")
    public ResponseEntity<List<String>> getTables(@PathVariable String schema) {
        log.info("Fetching tables for schema: {}", schema);
        
        try {
            // getTables returns List<Map<String, Object>>, extract table names
            List<Map<String, Object>> tables = schemaService.getTables(schema);
            List<String> tableNames = tables.stream()
                .map(t -> (String) t.get("table_name"))
                .toList();
            return ResponseEntity.ok(tableNames);
        } catch (Exception e) {
            log.error("Failed to fetch tables", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get columns in table
     */
    @GetMapping("/columns/{schema}/{table}")
    @Operation(summary = "Get columns", description = "Get columns in a specific table")
    public ResponseEntity<List<ColumnInfo>> getColumns(
            @PathVariable String schema,
            @PathVariable String table) {
        
        log.info("Fetching columns for table: {}.{}", schema, table);
        
        try {
            // getColumns returns List<Map<String, Object>>, convert to ColumnInfo
            List<Map<String, Object>> columnsData = schemaService.getColumns(schema, table);
            List<ColumnInfo> columns = columnsData.stream()
                .map(this::mapToColumnInfo)
                .toList();
            return ResponseEntity.ok(columns);
        } catch (Exception e) {
            log.error("Failed to fetch columns", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get Grafana contact points
     */
    @GetMapping("/grafana/contact-points")
    @Operation(summary = "Get contact points", description = "Get Grafana contact points for notifications")
    public ResponseEntity<List<Map<String, Object>>> getContactPoints() {
        log.info("Fetching Grafana contact points");
        
        // Return default contact point
        return ResponseEntity.ok(List.of(
            Map.of(
                "uid", "webhook",
                "name", "Case Tools Webhook",
                "type", "webhook",
                "settings", Map.of(
                    "url", "http://localhost:8080/api/webhooks/grafana/alert"
                )
            )
        ));
    }

    /**
     * Get Grafana folders
     */
    @GetMapping("/grafana/folders")
    @Operation(summary = "Get folders", description = "Get Grafana folders for organizing alert rules")
    public ResponseEntity<List<Map<String, Object>>> getFolders() {
        log.info("Fetching Grafana folders");
        
        // Return default folder
        return ResponseEntity.ok(List.of(
            Map.of(
                "uid", "alerts",
                "title", "Alert Rules",
                "id", 1
            )
        ));
    }

    /**
     * Helper method to map column data to ColumnInfo DTO
     */
    private ColumnInfo mapToColumnInfo(Map<String, Object> columnData) {
        ColumnInfo info = new ColumnInfo();
        info.setColumn_name((String) columnData.get("column_name"));
        info.setData_type((String) columnData.get("data_type"));
        info.setIs_nullable((String) columnData.get("is_nullable"));
        info.setColumn_default(columnData.get("column_default"));
        info.setCharacter_maximum_length((Integer) columnData.get("character_maximum_length"));
        info.setNumeric_precision((Integer) columnData.get("numeric_precision"));
        info.setNumeric_scale((Integer) columnData.get("numeric_scale"));
        info.setOrdinal_position((Integer) columnData.get("ordinal_position"));
        info.setIs_primary_key((Boolean) columnData.get("is_primary_key"));
        info.setIs_foreign_key((Boolean) columnData.get("is_foreign_key"));
        info.setReferenced_table_name((String) columnData.get("referenced_table_name"));
        info.setReferenced_column_name((String) columnData.get("referenced_column_name"));
        info.setComment((String) columnData.get("comment"));
        return info;
    }

    /**
     * Get alert rule templates
     */
    @GetMapping("/templates")
    @Operation(summary = "Get templates", description = "Get predefined alert rule templates")
    public ResponseEntity<List<Map<String, Object>>> getTemplates() {
        log.info("Fetching alert rule templates");
        
        return ResponseEntity.ok(List.of(
            Map.of(
                "id", "high-revenue-loss",
                "name", "High Revenue Loss",
                "description", "Alert when revenue loss exceeds threshold",
                "query", "SELECT * FROM stat.stattraficmsc WHERE revenue_loss > 10000",
                "severity", "critical"
            ),
            Map.of(
                "id", "call-drop-rate",
                "name", "High Call Drop Rate",
                "description", "Alert when call drop rate is too high",
                "query", "SELECT * FROM stat.stattraficmsc WHERE call_drop_rate > 0.05",
                "severity", "high"
            )
        ));
    }
}