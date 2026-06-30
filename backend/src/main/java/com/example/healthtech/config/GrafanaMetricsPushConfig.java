package com.example.healthtech.config;

import io.micrometer.prometheus.PrometheusMeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Configuration
public class GrafanaMetricsPushConfig {

    @Autowired
    @Lazy
    private PrometheusMeterRegistry prometheusMeterRegistry;

    @Value("${GRAFANA_METRICS_URL:}")
    private String grafanaUrl;

    @Value("${GRAFANA_METRICS_USERNAME:}")
    private String username;

    @Value("${GRAFANA_METRICS_PASSWORD:}")
    private String password;

    // @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    public void pushMetrics() {
        // Prevent running if configuration is missing or incomplete
        if (grafanaUrl == null || grafanaUrl.isBlank() || 
            username == null || username.isBlank() || 
            password == null || password.isBlank()) {
            return;
        }

        try {
            if (prometheusMeterRegistry == null) {
                return;
            }

            String metrics = prometheusMeterRegistry.scrape();
            String credentials = Base64.getEncoder()
                .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));

            // Set reasonable connect timeout to prevent blocking startup thread indefinitely
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(grafanaUrl))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Basic " + credentials)
                .header("Content-Type", "text/plain")
                .POST(HttpRequest.BodyPublishers.ofString(metrics))
                .build();

            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200 && response.statusCode() != 204) {
                System.err.println("Failed to push metrics to Grafana: " 
                    + response.statusCode() + " " + response.body());
            }
        } catch (Exception e) {
            System.err.println("Error pushing metrics to Grafana: " + e.getMessage());
        }
    }
}
