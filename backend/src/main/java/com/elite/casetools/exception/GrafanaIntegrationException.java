package com.elite.casetools.exception;

/**
 * Exception thrown when Grafana integration operations fail
 */
public class GrafanaIntegrationException extends RuntimeException {

    public GrafanaIntegrationException(String message) {
        super(message);
    }

    public GrafanaIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }

    public GrafanaIntegrationException(Throwable cause) {
        super(cause);
    }
}