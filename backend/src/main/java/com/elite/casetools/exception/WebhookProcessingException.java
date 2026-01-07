package com.elite.casetools.exception;

/**
 * Exception thrown when webhook processing fails
 */
public class WebhookProcessingException extends RuntimeException {

    public WebhookProcessingException(String message) {
        super(message);
    }

    public WebhookProcessingException(String message, Throwable cause) {
        super(message, cause);
    }

    public WebhookProcessingException(Throwable cause) {
        super(cause);
    }
}