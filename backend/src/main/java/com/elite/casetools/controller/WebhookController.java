package com.elite.casetools.controller;

import com.elite.casetools.dto.GrafanaWebhookRequest;
import com.elite.casetools.dto.WebhookResponse;
import com.elite.casetools.dto.AssignmentInfo;
import com.elite.casetools.entity.Case;
import com.elite.casetools.entity.User;
import com.elite.casetools.service.CaseService;
import com.elite.casetools.service.ImprovedWebhookService;
import com.elite.casetools.repository.UserRepository;
import com.elite.casetools.exception.WebhookProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * Controller for handling Grafana webhooks
 */
@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Webhook endpoints for external integrations")
public class WebhookController {

    private final CaseService caseService;
    private final ImprovedWebhookService improvedWebhookService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${grafana.webhook.secret:}")
    private String webhookSecret;

    /**
     * Receive alert webhook from Grafana
     */
    @PostMapping("/grafana/alert")
    @Operation(summary = "Receive Grafana alert webhook", description = "Process incoming alerts from Grafana and create cases")
    public ResponseEntity<WebhookResponse> handleGrafanaAlert(
            @RequestHeader(value = "X-Grafana-Signature", required = false) String signature,
            @RequestBody String rawPayload) {
        
        log.info("Received Grafana alert webhook with {} bytes", rawPayload.length());

        try {
            // Parse the JSON payload
            GrafanaWebhookRequest request = objectMapper.readValue(rawPayload, GrafanaWebhookRequest.class);

            List<Case> processedCases = improvedWebhookService.processWebhookWithRuleAssignments(request);
            
            return ResponseEntity.ok(WebhookResponse.success(
                    processedCases.size() + " cases processed",
                    processedCases.stream().map(this::mapCaseToResponse).toList(),
                    processedCases.size()
            ));
            
        } catch (WebhookProcessingException e) {
            log.error("Webhook processing failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(WebhookResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error processing webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(WebhookResponse.error("Internal server error"));
        }
    }

    /**
     * Receive resolution webhook from Grafana
     */
    @PostMapping("/grafana/resolved")
    @Operation(summary = "Receive Grafana resolution webhook", description = "Process alert resolution notifications from Grafana")
    public ResponseEntity<WebhookResponse> handleGrafanaResolved(
            @RequestHeader(value = "X-Grafana-Signature", required = false) String signature,
            @RequestBody GrafanaWebhookRequest request) {
        
        log.info("Received Grafana resolution webhook: {}", request.getReceiver());

        // Validate signature if configured
        if (!webhookSecret.isEmpty() && !validateSignature(signature, request)) {
            log.warn("Invalid webhook signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(WebhookResponse.error("Invalid signature"));
        }

        List<Case> resolvedCases = new ArrayList<>();

        // Process each resolved alert
        for (GrafanaWebhookRequest.Alert alert : request.getAlerts()) {
            if ("resolved".equals(alert.getStatus())) {
                handleResolvedAlert(alert.getFingerprint()).ifPresent(resolvedCases::add);
            }
        }

        return ResponseEntity.ok(WebhookResponse.success(
                resolvedCases.size() + " cases resolved",
                resolvedCases.stream().map(this::mapCaseToResponse).toList(),
                0
        ));
    }

    /**
     * Health check endpoint for webhook
     */
    @GetMapping("/health")
    @Operation(summary = "Webhook health check", description = "Check if webhook endpoint is available")
    public ResponseEntity<WebhookResponse> health() {
        return ResponseEntity.ok(WebhookResponse.success("Webhook endpoint is healthy", null, 0));
    }

    /**
     * Test webhook endpoint
     */
    @PostMapping("/test")
    @Operation(summary = "Test webhook", description = "Test webhook processing without creating real cases")
    public ResponseEntity<WebhookResponse> testWebhook(@RequestBody GrafanaWebhookRequest request) {
        log.info("Received test webhook: {}", request);
        return ResponseEntity.ok(WebhookResponse.success("Test webhook received successfully", null, 0));
    }

    // Helper methods

    /**
     * Validate webhook signature
     */
    private boolean validateSignature(String signature, GrafanaWebhookRequest request) {
        if (signature == null || signature.isEmpty()) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            
            // Calculate expected signature
            byte[] hmacData = mac.doFinal(request.toString().getBytes(StandardCharsets.UTF_8));
            String expectedSignature = Base64.getEncoder().encodeToString(hmacData);
            
            return signature.equals(expectedSignature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to validate webhook signature", e);
            return false;
        }
    }

    /**
     * Handle resolved alert
     */
    private Optional<Case> handleResolvedAlert(String fingerprint) {
        try {
            return caseService.resolveFromWebhook(fingerprint);
        } catch (Exception e) {
            log.error("Failed to resolve alert: {}", fingerprint, e);
            return Optional.empty();
        }
    }

    /**
     * Map Case entity to response
     */
    private WebhookResponse.CaseInfo mapCaseToResponse(Case caseEntity) {
        return WebhookResponse.CaseInfo.builder()
                .caseId(caseEntity.getId())
                .caseNumber(caseEntity.getCaseNumber())
                .alertFingerprint(caseEntity.getGrafanaAlertUid())
                .status(caseEntity.getStatus().toString())
                .assignedTo(getAssignedUserInfo(caseEntity))
                .createdAt(caseEntity.getCreatedAt())
                .build();
    }
    
    /**
     * Helper method to get first assigned user info for webhook response
     */
    private WebhookResponse.UserInfo getAssignedUserInfo(Case caseEntity) {
        AssignmentInfo assignmentInfo = caseEntity.getAssignmentInfo();
        if (!assignmentInfo.hasAssignments() || assignmentInfo.getUserIds().isEmpty()) {
            return null;
        }
        
        // Return the first assigned user
        Long firstUserId = assignmentInfo.getUserIds().get(0);
        return userRepository.findById(firstUserId)
                .map(user -> WebhookResponse.UserInfo.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .build())
                .orElse(null);
    }
}