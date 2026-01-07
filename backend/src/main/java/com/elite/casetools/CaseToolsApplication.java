package com.elite.casetools;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * CaseTools Application - Revenue Assurance Alert Management System
 * 
 * This application provides:
 * - Real-time alert processing from Grafana webhooks
 * - Case management for revenue assurance alerts
 * - User-defined alert rule creation and management
 * - Integration with Grafana for alert execution
 * 
 * @author Elite Engineering Team
 * @version 2.0.0
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableTransactionManagement
public class CaseToolsApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(CaseToolsApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(CaseToolsApplication.class);
    }
}