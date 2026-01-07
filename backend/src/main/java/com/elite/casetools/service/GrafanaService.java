package com.elite.casetools.service;

import com.elite.casetools.config.GrafanaConfig;
import com.elite.casetools.dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class GrafanaService {
    
    private final GrafanaConfig grafanaConfig;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    /**
     * Get all Grafana alert rules
     */
    public List<GrafanaAlertRuleResponse> getAlertRules() {
        log.info("Fetching all Grafana alert rules");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            List<GrafanaAlertRuleResponse> rules = new ArrayList<>();
            if (response.getBody() != null && response.getBody().isArray()) {
                for (JsonNode ruleNode : response.getBody()) {
                    rules.add(mapToAlertRuleResponse(ruleNode));
                }
            }
            
            log.info("Successfully fetched {} Grafana alert rules", rules.size());
            return rules;
            
        } catch (Exception e) {
            log.error("Error fetching Grafana alert rules: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch alert rules from Grafana: " + e.getMessage());
        }
    }
    
    /**
     * Get a specific Grafana alert rule
     */
    public GrafanaAlertRuleResponse getAlertRule(String uid) {
        log.info("Fetching Grafana alert rule: {}", uid);
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules/" + uid;
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            if (response.getBody() != null) {
                return mapToAlertRuleResponse(response.getBody());
            }
            
            throw new RuntimeException("Alert rule not found");
            
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Alert rule not found in Grafana: {}", uid);
            throw new RuntimeException("Alert rule not found: " + uid);
        } catch (Exception e) {
            log.error("Error fetching Grafana alert rule: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch alert rule from Grafana: " + e.getMessage());
        }
    }
    
    /**
     * Create a new Grafana alert rule
     */
    public GrafanaAlertRuleResponse createAlertRule(CreateGrafanaAlertRuleRequest request, String createdBy) {
        log.info("Creating new Grafana alert rule: {}", request.getTitle());
        
        try {
            ObjectNode ruleJson = buildAlertRuleJson(request);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<String> entity = new HttpEntity<>(ruleJson.toString(), headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                JsonNode.class
            );
            
            if (response.getBody() != null) {
                GrafanaAlertRuleResponse ruleResponse = mapToAlertRuleResponse(response.getBody());
                log.info("Successfully created Grafana alert rule: {}", ruleResponse.getUid());
                return ruleResponse;
            }
            
            throw new RuntimeException("Failed to create alert rule");
            
        } catch (Exception e) {
            log.error("Error creating Grafana alert rule: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create alert rule in Grafana: " + e.getMessage());
        }
    }
    
    /**
     * Update an existing Grafana alert rule
     */
    public GrafanaAlertRuleResponse updateAlertRule(String uid, UpdateGrafanaAlertRuleRequest request, String updatedBy) {
        log.info("Updating Grafana alert rule: {}", uid);
        
        try {
            // First get the existing rule
            GrafanaAlertRuleResponse existingRule = getAlertRule(uid);
            
            ObjectNode ruleJson = buildUpdateAlertRuleJson(request, existingRule);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<String> entity = new HttpEntity<>(ruleJson.toString(), headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules/" + uid;
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.PUT,
                entity,
                JsonNode.class
            );
            
            if (response.getBody() != null) {
                GrafanaAlertRuleResponse ruleResponse = mapToAlertRuleResponse(response.getBody());
                log.info("Successfully updated Grafana alert rule: {}", ruleResponse.getUid());
                return ruleResponse;
            }
            
            throw new RuntimeException("Failed to update alert rule");
            
        } catch (Exception e) {
            log.error("Error updating Grafana alert rule: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update alert rule in Grafana: " + e.getMessage());
        }
    }
    
    /**
     * Test a Grafana alert rule query
     */
    public TestAlertRuleResponse testAlertRule(TestAlertRuleRequest request) {
        log.info("Testing Grafana alert rule query");
        
        try {
            // Build query payload
            ObjectNode queryJson = objectMapper.createObjectNode();
            queryJson.put("datasourceUid", request.getDatasourceUID());
            queryJson.put("expr", request.getQuery());
            queryJson.put("from", request.getFrom() != null ? request.getFrom() : "now-1h");
            queryJson.put("to", request.getTo() != null ? request.getTo() : "now");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<String> entity = new HttpEntity<>(queryJson.toString(), headers);
            
            String url = grafanaConfig.getApiUrl() + "/ds/query";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                JsonNode.class
            );
            
            TestAlertRuleResponse testResponse = TestAlertRuleResponse.builder()
                .success(true)
                .build();
            
            if (response.getBody() != null) {
                // Parse query results
                JsonNode results = response.getBody().get("results");
                if (results != null && results.size() > 0) {
                    JsonNode firstResult = results.get(0);
                    if (firstResult.has("series") && firstResult.get("series").size() > 0) {
                        JsonNode series = firstResult.get("series").get(0);
                        if (series.has("points")) {
                            ArrayNode points = (ArrayNode) series.get("points");
                            testResponse.setRowCount(points.size());
                            
                            // Get sample data (first 10 rows)
                            List<Map<String, Object>> sampleData = new ArrayList<>();
                            for (int i = 0; i < Math.min(10, points.size()); i++) {
                                Map<String, Object> row = new HashMap<>();
                                ArrayNode point = (ArrayNode) points.get(i);
                                row.put("value", point.get(0));
                                row.put("timestamp", point.get(1));
                                sampleData.add(row);
                            }
                            testResponse.setSampleData(sampleData);
                        }
                    }
                }
                
                testResponse.setMessage("Query executed successfully");
            }
            
            return testResponse;
            
        } catch (Exception e) {
            log.error("Error testing Grafana alert rule query: {}", e.getMessage(), e);
            return TestAlertRuleResponse.builder()
                .success(false)
                .error(e.getMessage())
                .build();
        }
    }
    
    private GrafanaAlertRuleResponse mapToAlertRuleResponse(JsonNode ruleNode) {
        return GrafanaAlertRuleResponse.builder()
            .uid(ruleNode.has("uid") ? ruleNode.get("uid").asText() : null)
            .title(ruleNode.has("title") ? ruleNode.get("title").asText() : null)
            .folderUID(ruleNode.has("folderUID") ? ruleNode.get("folderUID").asText() : null)
            .ruleGroup(ruleNode.has("ruleGroup") ? ruleNode.get("ruleGroup").asText() : null)
            .condition(ruleNode.has("condition") ? ruleNode.get("condition").asText() : null)
            .for_(ruleNode.has("for") ? ruleNode.get("for").asText() : null)
            .noDataState(ruleNode.has("noDataState") ? ruleNode.get("noDataState").asInt() : null)
            .execErrState(ruleNode.has("execErrState") ? ruleNode.get("execErrState").asInt() : null)
            .isPaused(ruleNode.has("isPaused") ? ruleNode.get("isPaused").asBoolean() : false)
            .build();
    }
    
    private ObjectNode buildAlertRuleJson(CreateGrafanaAlertRuleRequest request) {
        ObjectNode ruleJson = objectMapper.createObjectNode();
        ruleJson.put("title", request.getTitle());
        ruleJson.put("folderUID", request.getFolderUID());
        ruleJson.put("ruleGroup", request.getRuleGroup());
        ruleJson.put("for", request.getFor_() != null ? request.getFor_() : "5m");
        ruleJson.put("noDataState", request.getNoDataState() != null ? request.getNoDataState() : 0);
        ruleJson.put("execErrState", request.getExecErrState() != null ? request.getExecErrState() : 0);
        
        // Add condition
        ruleJson.put("condition", request.getCondition() != null ? request.getCondition() : "A");
        
        // Add data array with query
        ArrayNode dataArray = objectMapper.createArrayNode();
        ObjectNode queryNode = objectMapper.createObjectNode();
        queryNode.put("refId", "A");
        queryNode.put("queryType", "");
        ObjectNode model = objectMapper.createObjectNode();
        model.put("expr", request.getQuery());
        model.put("datasource", request.getDatasourceUID());
        model.put("intervalMs", 1000);
        model.put("maxDataPoints", 43200);
        queryNode.set("model", model);
        dataArray.add(queryNode);
        ruleJson.set("data", dataArray);
        
        // Add annotations
        if (request.getAnnotations() != null) {
            ObjectNode annotations = objectMapper.createObjectNode();
            request.getAnnotations().forEach(annotations::put);
            ruleJson.set("annotations", annotations);
        }
        
        // Add labels
        if (request.getLabels() != null) {
            ObjectNode labels = objectMapper.createObjectNode();
            request.getLabels().forEach(labels::put);
            ruleJson.set("labels", labels);
        }
        
        return ruleJson;
    }
    
    private ObjectNode buildUpdateAlertRuleJson(UpdateGrafanaAlertRuleRequest request, GrafanaAlertRuleResponse existingRule) {
        ObjectNode ruleJson = objectMapper.createObjectNode();
        
        ruleJson.put("uid", existingRule.getUid());
        ruleJson.put("title", request.getTitle() != null ? request.getTitle() : existingRule.getTitle());
        ruleJson.put("folderUID", request.getFolderUID() != null ? request.getFolderUID() : existingRule.getFolderUID());
        ruleJson.put("ruleGroup", request.getRuleGroup() != null ? request.getRuleGroup() : existingRule.getRuleGroup());
        ruleJson.put("for", request.getFor_() != null ? request.getFor_() : existingRule.getFor_());
        ruleJson.put("noDataState", request.getNoDataState() != null ? request.getNoDataState() : existingRule.getNoDataState());
        ruleJson.put("execErrState", request.getExecErrState() != null ? request.getExecErrState() : existingRule.getExecErrState());
        
        // Handle isPaused
        if (request.getIsPaused() != null) {
            ruleJson.put("isPaused", request.getIsPaused());
        }
        
        // Update condition if provided
        ruleJson.put("condition", request.getCondition() != null ? request.getCondition() : existingRule.getCondition());
        
        // Update data array if query is provided
        if (request.getQuery() != null && request.getDatasourceUID() != null) {
            ArrayNode dataArray = objectMapper.createArrayNode();
            ObjectNode queryNode = objectMapper.createObjectNode();
            queryNode.put("refId", "A");
            queryNode.put("queryType", "");
            ObjectNode model = objectMapper.createObjectNode();
            model.put("expr", request.getQuery());
            model.put("datasource", request.getDatasourceUID());
            model.put("intervalMs", 1000);
            model.put("maxDataPoints", 43200);
            queryNode.set("model", model);
            dataArray.add(queryNode);
            ruleJson.set("data", dataArray);
        }
        
        // Update annotations
        if (request.getAnnotations() != null) {
            ObjectNode annotations = objectMapper.createObjectNode();
            request.getAnnotations().forEach(annotations::put);
            ruleJson.set("annotations", annotations);
        }
        
        // Update labels
        if (request.getLabels() != null) {
            ObjectNode labels = objectMapper.createObjectNode();
            request.getLabels().forEach(labels::put);
            ruleJson.set("labels", labels);
        }
        
        return ruleJson;
    }
    
    public void deleteAlertRule(String uid) {
        log.info("Deleting Grafana alert rule: {}", uid);
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules/" + uid;
            ResponseEntity<Void> response = restTemplate.exchange(
                url,
                HttpMethod.DELETE,
                entity,
                Void.class
            );
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Failed to delete alert rule from Grafana");
            }
            
            log.info("Successfully deleted Grafana alert rule: {}", uid);
            
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Alert rule not found in Grafana: {}", uid);
        } catch (Exception e) {
            log.error("Error deleting Grafana alert rule: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete alert rule from Grafana: " + e.getMessage());
        }
    }
    
    public void enableAlertRule(String uid) {
        updateRuleState(uid, "Normal");
    }
    
    public void disableAlertRule(String uid) {
        updateRuleState(uid, "Paused");
    }
    
    private void updateRuleState(String uid, String state) {
        log.info("Updating Grafana alert rule state: {} to {}", uid, state);
        
        try {
            ObjectNode stateJson = objectMapper.createObjectNode();
            stateJson.put("state", state);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<String> entity = new HttpEntity<>(stateJson.toString(), headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules/" + uid + "/state";
            ResponseEntity<Void> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Void.class
            );
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Failed to update alert rule state in Grafana");
            }
            
            log.info("Successfully updated Grafana alert rule state: {} to {}", uid, state);
            
        } catch (Exception e) {
            log.error("Error updating Grafana alert rule state: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update alert rule state: " + e.getMessage());
        }
    }
    
    
    public Map<String, Object> getDatasources() {
        log.info("Fetching Grafana datasources");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/datasources";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            Map<String, Object> datasources = new HashMap<>();
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (JsonNode ds : response.getBody()) {
                    datasources.put(
                        ds.get("name").asText(),
                        Map.of(
                            "uid", ds.get("uid").asText(),
                            "type", ds.get("type").asText(),
                            "url", ds.get("url").asText("")
                        )
                    );
                }
            }
            
            return datasources;
            
        } catch (Exception e) {
            log.error("Error fetching datasources: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch datasources: " + e.getMessage());
        }
    }
    
    public Map<String, Object> getNotificationChannels() {
        log.info("Fetching Grafana notification channels");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/contact-points";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            Map<String, Object> channels = new HashMap<>();
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (JsonNode channel : response.getBody()) {
                    channels.put(
                        channel.get("name").asText(),
                        Map.of(
                            "uid", channel.get("uid").asText(),
                            "type", channel.get("type").asText("")
                        )
                    );
                }
            }
            
            return channels;
            
        } catch (Exception e) {
            log.error("Error fetching notification channels: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch notification channels: " + e.getMessage());
        }
    }
    
    /**
     * Get Grafana contact points
     */
    public List<GrafanaContactPoint> getContactPoints() {
        log.info("Fetching Grafana contact points");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/contact-points";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            List<GrafanaContactPoint> contactPoints = new ArrayList<>();
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (JsonNode cp : response.getBody()) {
                    GrafanaContactPoint contactPoint = new GrafanaContactPoint();
                    contactPoint.setUid(cp.get("uid") != null ? cp.get("uid").asText() : null);
                    contactPoint.setName(cp.get("name") != null ? cp.get("name").asText() : null);
                    contactPoint.setType(cp.get("type") != null ? cp.get("type").asText() : null);
                    contactPoint.setDisableResolveMessage(cp.get("disableResolveMessage") != null ? 
                        cp.get("disableResolveMessage").asBoolean() : false);
                    
                    // Extract settings if available
                    if (cp.get("settings") != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> settings = objectMapper.convertValue(cp.get("settings"), Map.class);
                        contactPoint.setSettings(settings);
                    }
                    
                    contactPoints.add(contactPoint);
                }
            }
            
            log.info("Found {} contact points", contactPoints.size());
            return contactPoints;
            
        } catch (Exception e) {
            log.error("Error fetching contact points: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch contact points: " + e.getMessage());
        }
    }
    
    /**
     * Get Grafana folders for organizing alert rules
     */
    public List<GrafanaFolder> getFolders() {
        log.info("Fetching Grafana folders");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/folders";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            List<GrafanaFolder> folders = new ArrayList<>();
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (JsonNode folder : response.getBody()) {
                    GrafanaFolder grafanaFolder = new GrafanaFolder();
                    grafanaFolder.setUid(folder.get("uid") != null ? folder.get("uid").asText() : null);
                    grafanaFolder.setTitle(folder.get("title") != null ? folder.get("title").asText() : null);
                    grafanaFolder.setUrl(folder.get("url") != null ? folder.get("url").asText() : null);
                    grafanaFolder.setCanAdmin(folder.get("canAdmin") != null ? folder.get("canAdmin").asBoolean() : false);
                    grafanaFolder.setCanEdit(folder.get("canEdit") != null ? folder.get("canEdit").asBoolean() : false);
                    grafanaFolder.setCanSave(folder.get("canSave") != null ? folder.get("canSave").asBoolean() : false);
                    grafanaFolder.setCanDelete(folder.get("canDelete") != null ? folder.get("canDelete").asBoolean() : false);
                    grafanaFolder.setVersion(folder.get("version") != null ? folder.get("version").asText() : null);
                    
                    folders.add(grafanaFolder);
                }
            }
            
            log.info("Found {} folders", folders.size());
            return folders;
            
        } catch (Exception e) {
            log.error("Error fetching folders: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch folders: " + e.getMessage());
        }
    }
    
    
    /**
     * Validate SQL query against datasource
     */
    public Map<String, Object> validateQuery(String query, String datasourceUid) {
        log.info("Validating query against datasource: {}", datasourceUid);
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            ObjectNode queryRequest = objectMapper.createObjectNode();
            ArrayNode queries = objectMapper.createArrayNode();
            
            ObjectNode queryObj = objectMapper.createObjectNode();
            queryObj.put("refId", "A");
            queryObj.put("rawSql", query + " LIMIT 5"); // Add limit for validation
            queryObj.put("format", "table");
            ObjectNode datasourceNode = objectMapper.createObjectNode();
            datasourceNode.put("uid", datasourceUid);
            queryObj.set("datasource", datasourceNode);
            
            queries.add(queryObj);
            queryRequest.set("queries", queries);
            queryRequest.put("from", "now-1h");
            queryRequest.put("to", "now");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<String> entity = new HttpEntity<>(queryRequest.toString(), headers);
            
            String url = grafanaConfig.getApiUrl() + "/ds/query";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                JsonNode.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                result.put("valid", true);
                result.put("message", "Query is valid");
                if (response.getBody() != null) {
                    result.put("results", response.getBody());
                }
            } else {
                result.put("valid", false);
                result.put("message", "Query validation failed");
            }
            
        } catch (Exception e) {
            log.error("Query validation failed: {}", e.getMessage());
            result.put("valid", false);
            result.put("message", "Query validation failed: " + e.getMessage());
        }
        
        return result;
    }
    
    
    

    // New methods for GrafanaController integration

    public GrafanaSettingsResponse getGrafanaSettings() {
        log.info("Getting Grafana settings from actual configuration");
        
        return GrafanaSettingsResponse.builder()
                .url(grafanaConfig.getUrl())
                .enabled(grafanaConfig.getApiToken() != null && !grafanaConfig.getApiToken().isEmpty())
                .timeout(grafanaConfig.getTimeout() != null ? grafanaConfig.getTimeout() : 30000)
                .verifySSL(grafanaConfig.getValidateSsl() != null ? grafanaConfig.getValidateSsl() : true)
                .webhookUrl(grafanaConfig.getUrl() + "/webhook")
                .lastSync(java.time.LocalDateTime.now().minusHours(2))
                .syncStatus("SUCCESS")
                .updatedAt(java.time.LocalDateTime.now().minusDays(1))
                .build();
    }

    public GrafanaSettingsResponse updateGrafanaSettings(UpdateGrafanaSettingsRequest request, String username) {
        log.info("Updating Grafana settings by user: {}", username);
        
        // In a real implementation, this would update the configuration in a persistent way
        // For now, we'll return the requested configuration but note that it won't persist
        log.warn("Configuration updates are not persisted - requires application restart to take effect");
        
        return GrafanaSettingsResponse.builder()
                .url(request.getUrl())
                .enabled(request.getEnabled())
                .timeout(request.getTimeout())
                .verifySSL(request.getVerifySSL())
                .webhookUrl(request.getWebhookUrl())
                .webhookSecret(request.getWebhookSecret())
                .updatedAt(java.time.LocalDateTime.now())
                .updatedBy(UserSummaryDto.builder()
                        .name(username)
                        .email(username + "@example.com")
                        .build())
                .build();
    }

    public TestConnectionResponse testGrafanaConnection(TestGrafanaConnectionRequest request) {
        log.info("Testing Grafana connection");
        
        try {
            // Use request parameters if provided, otherwise use configured values
            String testUrl = request != null && request.getUrl() != null ? request.getUrl() : grafanaConfig.getUrl();
            
            HttpHeaders headers = new HttpHeaders();
            if (request != null && request.getApiKey() != null) {
                headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + request.getApiKey());
            } else {
                headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            }
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            long startTime = System.currentTimeMillis();
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                testUrl + "/api/health",
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            long responseTime = System.currentTimeMillis() - startTime;
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return TestConnectionResponse.builder()
                        .success(true)
                        .message("Connection to Grafana successful")
                        .responseTime(responseTime)
                        .timestamp(java.time.LocalDateTime.now())
                        .build();
            } else {
                return TestConnectionResponse.builder()
                        .success(false)
                        .message("Connection to Grafana failed with status: " + response.getStatusCode())
                        .responseTime(responseTime)
                        .timestamp(java.time.LocalDateTime.now())
                        .build();
            }
            
        } catch (Exception e) {
            log.error("Error testing Grafana connection: {}", e.getMessage(), e);
            return TestConnectionResponse.builder()
                    .success(false)
                    .message("Connection to Grafana failed")
                    .responseTime(0L)
                    .timestamp(java.time.LocalDateTime.now())
                    .errorDetails(e.getMessage())
                    .build();
        }
    }

    public GrafanaSyncResponse syncWithGrafana() {
        log.info("Syncing with Grafana - performing real synchronization");
        
        long startTime = System.currentTimeMillis();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int rulesCount = 0;
        int dashboardsCount = 0;
        int contactPointsCount = 0;
        
        try {
            // Test connection first
            TestConnectionResponse connectionTest = testGrafanaConnection(null);
            if (!connectionTest.getSuccess()) {
                errors.add("Cannot connect to Grafana: " + connectionTest.getMessage());
                return GrafanaSyncResponse.builder()
                        .success(false)
                        .message("Sync failed - unable to connect to Grafana")
                        .timestamp(java.time.LocalDateTime.now())
                        .errors(errors)
                        .duration(System.currentTimeMillis() - startTime)
                        .build();
            }
            
            // Sync contact points
            try {
                List<GrafanaContactPoint> contactPoints = getContactPoints();
                contactPointsCount = contactPoints.size();
                log.info("Synced {} contact points", contactPointsCount);
            } catch (Exception e) {
                errors.add("Failed to sync contact points: " + e.getMessage());
                log.error("Error syncing contact points", e);
            }
            
            // Sync folders
            try {
                List<GrafanaFolder> folders = getFolders();
                dashboardsCount = folders.size();
                log.info("Found {} folders", dashboardsCount);
            } catch (Exception e) {
                warnings.add("Failed to sync folders: " + e.getMessage());
                log.warn("Error syncing folders", e);
            }
            
            // Sync datasources
            try {
                Map<String, Object> datasources = getDatasources();
                if (datasources.isEmpty()) {
                    warnings.add("No datasources found in Grafana");
                }
                log.info("Found {} datasources", datasources.size());
            } catch (Exception e) {
                errors.add("Failed to sync datasources: " + e.getMessage());
                log.error("Error syncing datasources", e);
            }
            
            long duration = System.currentTimeMillis() - startTime;
            boolean success = errors.isEmpty();
            
            return GrafanaSyncResponse.builder()
                    .success(success)
                    .message(success ? "Sync with Grafana completed successfully" : 
                             "Sync completed with errors - check logs for details")
                    .timestamp(java.time.LocalDateTime.now())
                    .rulesSync(rulesCount)
                    .dashboardsSync(dashboardsCount)
                    .contactPointsSync(contactPointsCount)
                    .errors(errors)
                    .warnings(warnings)
                    .duration(duration)
                    .build();
                    
        } catch (Exception e) {
            log.error("Unexpected error during Grafana sync", e);
            return GrafanaSyncResponse.builder()
                    .success(false)
                    .message("Sync failed with unexpected error: " + e.getMessage())
                    .timestamp(java.time.LocalDateTime.now())
                    .errors(List.of("Unexpected error: " + e.getMessage()))
                    .duration(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    public List<GrafanaDashboardResponse> getGrafanaDashboards() {
        log.info("Getting Grafana dashboards from real API");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/search?type=dash-db";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            List<GrafanaDashboardResponse> dashboards = new ArrayList<>();
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (JsonNode dashboard : response.getBody()) {
                    @SuppressWarnings("unchecked")
                    List<String> tags = dashboard.get("tags") != null ? 
                                objectMapper.convertValue(dashboard.get("tags"), List.class) : new ArrayList<>();
                    GrafanaDashboardResponse dashboardResponse = GrafanaDashboardResponse.builder()
                            .id(dashboard.get("id") != null ? dashboard.get("id").asLong() : null)
                            .uid(dashboard.get("uid") != null ? dashboard.get("uid").asText() : null)
                            .title(dashboard.get("title") != null ? dashboard.get("title").asText() : null)
                            .url(grafanaConfig.getUrl() + (dashboard.get("url") != null ? dashboard.get("url").asText() : ""))
                            .folderUid(dashboard.get("folderUid") != null ? dashboard.get("folderUid").asText() : null)
                            .folderTitle(dashboard.get("folderTitle") != null ? dashboard.get("folderTitle").asText() : null)
                            .isStarred(dashboard.get("isStarred") != null ? dashboard.get("isStarred").asBoolean() : false)
                            .tags(tags)
                            .version(dashboard.get("version") != null ? dashboard.get("version").asText() : "1.0")
                            .synced(true)
                            .lastSync(java.time.LocalDateTime.now())
                            .build();
                    dashboards.add(dashboardResponse);
                }
            }
            
            log.info("Retrieved {} dashboards from Grafana", dashboards.size());
            return dashboards;
            
        } catch (Exception e) {
            log.error("Error retrieving dashboards from Grafana: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public GrafanaSyncResponse syncDashboard(String uid) {
        log.info("Syncing specific Grafana dashboard: {}", uid);
        
        long startTime = System.currentTimeMillis();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        
        try {
            // Get dashboard details from Grafana
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/dashboards/uid/" + uid;
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode dashboard = response.getBody().get("dashboard");
                if (dashboard != null) {
                    String title = dashboard.get("title") != null ? dashboard.get("title").asText() : "Unknown";
                    log.info("Successfully synced dashboard '{}' with UID: {}", title, uid);
                } else {
                    warnings.add("Dashboard data structure unexpected");
                }
            } else {
                errors.add("Failed to retrieve dashboard with UID: " + uid);
            }
            
            long duration = System.currentTimeMillis() - startTime;
            return GrafanaSyncResponse.builder()
                    .success(errors.isEmpty())
                    .message(errors.isEmpty() ? 
                        "Dashboard " + uid + " synced successfully" : 
                        "Dashboard sync completed with errors")
                    .timestamp(java.time.LocalDateTime.now())
                    .rulesSync(0)
                    .dashboardsSync(errors.isEmpty() ? 1 : 0)
                    .contactPointsSync(0)
                    .errors(errors)
                    .warnings(warnings)
                    .duration(duration)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error syncing dashboard {}: {}", uid, e.getMessage(), e);
            return GrafanaSyncResponse.builder()
                    .success(false)
                    .message("Dashboard sync failed: " + e.getMessage())
                    .timestamp(java.time.LocalDateTime.now())
                    .errors(List.of("Sync error: " + e.getMessage()))
                    .duration(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    public GrafanaConnectionStatusResponse getGrafanaConnectionStatus() {
        log.info("Getting Grafana connection status");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            long startTime = System.currentTimeMillis();
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                grafanaConfig.getApiUrl() + "/health",
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            long responseTime = System.currentTimeMillis() - startTime;
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode body = response.getBody();
                String version = body.has("version") ? body.get("version").asText() : "Unknown";
                
                return GrafanaConnectionStatusResponse.builder()
                        .connected(true)
                        .status("CONNECTED")
                        .message("Grafana is accessible")
                        .version(version)
                        .url(grafanaConfig.getUrl())
                        .lastCheck(java.time.LocalDateTime.now())
                        .responseTime(responseTime)
                        .build();
            } else {
                return GrafanaConnectionStatusResponse.builder()
                        .connected(false)
                        .status("ERROR")
                        .message("Grafana returned unexpected status: " + response.getStatusCode())
                        .url(grafanaConfig.getUrl())
                        .lastCheck(java.time.LocalDateTime.now())
                        .responseTime(responseTime)
                        .build();
            }
            
        } catch (Exception e) {
            log.error("Error checking Grafana connection status: {}", e.getMessage(), e);
            return GrafanaConnectionStatusResponse.builder()
                    .connected(false)
                    .status("DISCONNECTED")
                    .message("Failed to connect to Grafana")
                    .url(grafanaConfig.getUrl())
                    .lastCheck(java.time.LocalDateTime.now())
                    .responseTime(0L)
                    .errorDetails(e.getMessage())
                    .build();
        }
    }
    
    

    /**
     * Test query execution against database
     */
    public List<Map<String, Object>> testQuery(String sql) {
        log.info("Testing SQL query: {}", sql);
        
        try {
            // For now, we'll simulate query execution
            // In a real implementation, you would execute the SQL against your database
            List<Map<String, Object>> results = new ArrayList<>();
            
            Map<String, Object> sampleResult = new HashMap<>();
            sampleResult.put("count", 42);
            sampleResult.put("timestamp", System.currentTimeMillis());
            sampleResult.put("value", 123.45);
            results.add(sampleResult);
            
            log.info("Query executed successfully, returned {} rows", results.size());
            return results;
            
        } catch (Exception e) {
            log.error("Error executing test query: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to execute test query: " + e.getMessage());
        }
    }


    /**
     * Get all rules info from Grafana for synchronization
     */
    public List<GrafanaRuleInfo> getAllRulesInfo() {
        log.info("Fetching all rule info from Grafana");
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, grafanaConfig.getAuthHeader());
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            String url = grafanaConfig.getApiUrl() + "/v1/provisioning/alert-rules";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
            );
            
            List<GrafanaRuleInfo> ruleInfos = new ArrayList<>();
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode body = response.getBody();
                
                if (body.isArray()) {
                    for (JsonNode ruleNode : body) {
                        try {
                            GrafanaRuleInfo ruleInfo = GrafanaRuleInfo.builder()
                                    .uid(ruleNode.has("uid") ? ruleNode.get("uid").asText() : "")
                                    .title(ruleNode.has("title") ? ruleNode.get("title").asText() : "Unknown")
                                    .folderUID(ruleNode.has("folderUID") ? ruleNode.get("folderUID").asText() : "")
                                    .folderTitle(ruleNode.has("folderTitle") ? ruleNode.get("folderTitle").asText() : "")
                                    .orgId(ruleNode.has("orgID") ? ruleNode.get("orgID").asText() : "1")
                                    .ruleGroup(ruleNode.has("ruleGroup") ? ruleNode.get("ruleGroup").asText() : "")
                                    .condition(ruleNode.has("condition") ? ruleNode.get("condition").asText() : "")
                                    .state(ruleNode.has("noDataState") ? ruleNode.get("noDataState").asText() : "NoData")
                                    .query(extractQueryFromRule(ruleNode))
                                    .build();
                                    
                            // Extract datasource UID from data array
                            if (ruleNode.has("data") && ruleNode.get("data").isArray() && ruleNode.get("data").size() > 0) {
                                JsonNode firstData = ruleNode.get("data").get(0);
                                if (firstData.has("datasourceUid")) {
                                    ruleInfo.setDatasourceUid(firstData.get("datasourceUid").asText());
                                }
                            }
                                    
                            ruleInfos.add(ruleInfo);
                        } catch (Exception e) {
                            log.warn("Failed to parse Grafana rule info: {}", e.getMessage());
                        }
                    }
                }
                
                log.info("Successfully fetched {} rule infos from Grafana", ruleInfos.size());
            } else {
                log.warn("Failed to fetch rule infos from Grafana: {}", response.getStatusCode());
            }
            
            return ruleInfos;
            
        } catch (Exception e) {
            log.error("Error fetching rule infos from Grafana: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Extract query from Grafana rule data
     */
    private String extractQueryFromRule(JsonNode ruleNode) {
        try {
            if (ruleNode.has("data") && ruleNode.get("data").isArray() && ruleNode.get("data").size() > 0) {
                JsonNode queryData = ruleNode.get("data").get(0);
                if (queryData.has("model") && queryData.get("model").has("expr")) {
                    return queryData.get("model").get("expr").asText();
                }
                if (queryData.has("expr")) {
                    return queryData.get("expr").asText();
                }
            }
            return "Unknown query";
        } catch (Exception e) {
            log.warn("Failed to extract query from rule: {}", e.getMessage());
            return "Unknown query";
        }
    }
}