package com.example.healthtech.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import io.micrometer.prometheus.PrometheusConfig;
import io.micrometer.prometheus.PrometheusMeterRegistry;

@Configuration
public class GrafanaRemoteWriteConfig {
    
    @Bean
    public PrometheusConfig prometheusConfig() {
        String grafanaUrl = System.getenv("GRAFANA_METRICS_URL"); // From Render env vars
        String grafanaUser = System.getenv("GRAFANA_METRICS_USERNAME");
        String grafanaToken = System.getenv("GRAFANA_METRICS_PASSWORD");
        
        if (grafanaUrl == null || grafanaUser == null || grafanaToken == null) {
            System.out.println("[GRAFANA] Missing credentials, metrics push disabled");
            return PrometheusConfig.DEFAULT;
        }
        
        System.out.println("[GRAFANA] Configuring remote write to: " + grafanaUrl);
        System.out.println("[GRAFANA] Username: " + grafanaUser);
        
        return PrometheusConfig.DEFAULT;
    }
    
    @Bean
    public RestTemplate grafanaRestTemplate() {
        return new RestTemplate();
    }
}
