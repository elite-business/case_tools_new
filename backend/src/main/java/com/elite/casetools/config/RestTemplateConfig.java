package com.elite.casetools.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder, GrafanaConfig grafanaConfig) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(grafanaConfig.getTimeout()));
        factory.setReadTimeout(Duration.ofMillis(grafanaConfig.getTimeout()));
        
        return builder
            .requestFactory(() -> factory)
            .setConnectTimeout(Duration.ofMillis(grafanaConfig.getTimeout()))
            .setReadTimeout(Duration.ofMillis(grafanaConfig.getTimeout()))
            .build();
    }
}