package com.elite.casetools.service;

import com.elite.casetools.dto.GrafanaWebhookRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Map;

/**
 * Service to resolve Grafana rule UID from alert data
 * Implements multiple strategies to extract rule UID
 */
@Service
@Slf4j
public class RuleUidResolver {

    /**
     * Resolve rule UID from alert using multiple strategies
     * @param alert The Grafana alert
     * @return Rule UID or null if not found
     */
    public String resolveRuleUid(GrafanaWebhookRequest.Alert alert) {
        if (alert == null) {
            return null;
        }

        // Priority 1: Direct from labels
        String uid = extractFromLabels(alert);
        if (uid != null) {
            log.debug("Rule UID found in labels: {}", uid);
            return uid;
        }

        // Priority 2: From generator URL
        uid = extractFromGeneratorUrl(alert.getGeneratorURL());
        if (uid != null) {
            log.debug("Rule UID extracted from generator URL: {}", uid);
            return uid;
        }

        // Return null if no UID found - case will be created without assignment
        log.debug("No rule UID found for alert fingerprint: {}", alert.getFingerprint());
        return null;
    }

    /**
     * Extract rule UID from alert labels
     */
    private String extractFromLabels(GrafanaWebhookRequest.Alert alert) {
        Map<String, String> labels = alert.getLabels();
        if (labels == null || labels.isEmpty()) {
            return null;
        }

        // Check common label names for rule UID
        for (String key : Arrays.asList("__alert_rule_uid__", "rule_uid", "rule_id", "alertuid")) {
            if (labels.containsKey(key)) {
                String value = labels.get(key);
                if (StringUtils.hasText(value)) {
                    return value;
                }
            }
        }

        return null;
    }

    /**
     * Extract rule UID from generator URL
     */
    private String extractFromGeneratorUrl(String generatorUrl) {
        if (!StringUtils.hasText(generatorUrl)) {
            return null;
        }

        // Pattern 1: /alerting/grafana/{rule_uid}/view or /alerting/grafana/{rule_uid}
        if (generatorUrl.contains("/alerting/grafana/")) {
            int start = generatorUrl.indexOf("/alerting/grafana/") + 18;
            int end = generatorUrl.indexOf("/", start);

            if (end > start) {
                // Found a trailing slash, extract UID between slashes
                return generatorUrl.substring(start, end);
            } else if (end == -1 && start < generatorUrl.length()) {
                // No trailing slash, extract UID from start to end of URL
                // Also check for query parameters
                int queryStart = generatorUrl.indexOf("?", start);
                if (queryStart > start) {
                    return generatorUrl.substring(start, queryStart);
                }
                return generatorUrl.substring(start);
            }
        }

        // Pattern 2: ruleUID= query parameter
        if (generatorUrl.contains("ruleUID=")) {
            int start = generatorUrl.indexOf("ruleUID=") + 8;
            int end = generatorUrl.indexOf("&", start);
            String uid = end > start ? generatorUrl.substring(start, end) : generatorUrl.substring(start);
            if (StringUtils.hasText(uid)) {
                return uid;
            }
        }

        // Pattern 3: uid= query parameter
        if (generatorUrl.contains("uid=")) {
            int start = generatorUrl.indexOf("uid=") + 4;
            int end = generatorUrl.indexOf("&", start);
            String uid = end > start ? generatorUrl.substring(start, end) : generatorUrl.substring(start);
            if (StringUtils.hasText(uid)) {
                return uid;
            }
        }

        return null;
    }
}