package com.example.healthtech.service;

import in.code123.prometheus.remote.write.Remote.WriteRequest;
import in.code123.prometheus.remote.write.Types;
import org.iq80.snappy.Snappy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GrafanaMetricsPusher {

    @Autowired
    private RestTemplate restTemplate;

    private final AtomicInteger invocationCounter = new AtomicInteger(0);

    @PostConstruct
    public void init() {
        System.out.println("\n=== [GRAFANA-PUSHER] ===================================");
        System.out.println("[GRAFANA-PUSHER] @PostConstruct: Bean initialized successfully");
        System.out.println("[GRAFANA-PUSHER] RestTemplate: OK");
        
        String url = System.getenv("GRAFANA_METRICS_URL");
        String user = System.getenv("GRAFANA_METRICS_USERNAME");
        String pass = System.getenv("GRAFANA_METRICS_PASSWORD");
        
        System.out.println("[GRAFANA-PUSHER] ENV GRAFANA_METRICS_URL: " + (url != null ? url : "NOT SET"));
        System.out.println("[GRAFANA-PUSHER] ENV GRAFANA_METRICS_USERNAME: " + (user != null ? "SET (length=" + user.length() + ")" : "NOT SET"));
        System.out.println("[GRAFANA-PUSHER] ENV GRAFANA_METRICS_PASSWORD: " + (pass != null ? "SET (length=" + pass.length() + ")" : "NOT SET"));
        System.out.println("[GRAFANA-PUSHER] Snappy compression: ENABLED (Pure Java via org.iq80.snappy)");
        
        if (url != null && user != null && pass != null) {
            System.out.println("[GRAFANA-PUSHER] All env vars present — scheduler should push metrics normally");
        }
        System.out.println("=== [GRAFANA-PUSHER] ===================================\n");
    }

    @Scheduled(fixedRate = 60000, initialDelay = 10000)
    public void pushMetricsToGrafana() {
        invocationCounter.incrementAndGet();
        int invocationNumber = invocationCounter.get();
        
        System.out.println("\n=== [GRAFANA-PUSHER] === Invocation #" + invocationNumber + 
                           " at " + LocalDateTime.now() + " ===");
        
        try {
            String baseUrl = System.getenv("GRAFANA_METRICS_URL");
            String grafanaUser = System.getenv("GRAFANA_METRICS_USERNAME");
            String grafanaToken = System.getenv("GRAFANA_METRICS_PASSWORD");
            
            if (baseUrl == null || grafanaUser == null || grafanaToken == null) {
                System.out.println("[GRAFANA-PUSHER] WARNING: Missing env vars");
                return;
            }

            // Keep the original endpoint (it accepts Remote Write v1.0)
            if (!baseUrl.endsWith("/push")) {
                baseUrl = baseUrl.replace("/api/prom/write", "/api/prom/push")
                                 .replace("/api/v1/write", "/api/prom/push");
                if (!baseUrl.endsWith("/push")) {
                    baseUrl = baseUrl + "/push";
                }
            }
            String grafanaUrl = baseUrl;
            
            // Use the actual server port (default 8080) instead of hardcoded 10000
            String port = System.getenv("PORT") != null ? System.getenv("PORT") : "8080";
            String metricsSnapshotUrl = "http://localhost:" + port + "/actuator/prometheus";
            System.out.println("[GRAFANA-PUSHER] Fetching metrics from: " + metricsSnapshotUrl);
            
            String metricsData = restTemplate.getForObject(metricsSnapshotUrl, String.class);
            
            if (metricsData == null || metricsData.isEmpty()) {
                System.out.println("[GRAFANA-PUSHER] No metrics data to push");
                return;
            }
            
            System.out.println("[GRAFANA-PUSHER] Fetched " + metricsData.length() + " bytes of metrics data");
            
            // Step 2: Convert Prometheus text to Remote Write v1.0 protobuf
            System.out.println("[GRAFANA-PUSHER] Converting to Remote Write v1.0 protobuf...");
            byte[] remoteWriteData = convertPrometheusToRemoteWrite(metricsData);
            System.out.println("[GRAFANA-PUSHER] Converted: " + metricsData.length() + 
                              " → " + remoteWriteData.length + " bytes");
            
            // Step 3: Compress with Snappy
            System.out.println("[GRAFANA-PUSHER] Compressing with Snappy...");
            byte[] compressedData = Snappy.compress(remoteWriteData);
            System.out.println("[GRAFANA-PUSHER] Compressed from " + remoteWriteData.length + 
                              " to " + compressedData.length + " bytes (" + 
                              String.format("%.1f%%", (compressedData.length * 100.0 / remoteWriteData.length)) + ")");
            
            // BEFORE pushing, log details
            System.out.println("[GRAFANA-PUSHER] === PUSH DETAILS ===");
            try {
                WriteRequest requestObj = WriteRequest.parseFrom(remoteWriteData);
                System.out.println("[GRAFANA-PUSHER] Timeseries count: " + requestObj.getTimeseriesList().size());
                if (requestObj.getTimeseriesList().size() > 0) {
                    Types.TimeSeries ts = requestObj.getTimeseriesList().get(0);
                    System.out.println("[GRAFANA-PUSHER] First timeseries labels:");
                    for (Types.Label label : ts.getLabelsList()) {
                        System.out.println("[GRAFANA-PUSHER]   - " + label.getName() + "=" + label.getValue());
                    }
                    System.out.println("[GRAFANA-PUSHER] First timeseries samples: " + ts.getSamplesList().size());
                    if (ts.getSamplesList().size() > 0) {
                        Types.Sample sample = ts.getSamplesList().get(0);
                        System.out.println("[GRAFANA-PUSHER]   value=" + sample.getValue() + ", timestamp=" + sample.getTimestamp());
                    }
                }
            } catch (Exception ex) {
                System.err.println("[GRAFANA-PUSHER] Failed to parse WriteRequest for verbose logging: " + ex.getMessage());
            }
            System.out.println("[GRAFANA-PUSHER] Protobuf payload size: " + remoteWriteData.length);
            System.out.println("[GRAFANA-PUSHER] Compressed payload size: " + compressedData.length);

            // Log hex dump of first 50 bytes
            System.out.print("[GRAFANA-PUSHER] Payload hex (first 50 bytes): ");
            for (int i = 0; i < Math.min(50, compressedData.length); i++) {
                System.out.print(String.format("%02x ", compressedData[i] & 0xFF));
            }
            System.out.println();
            
            // Step 4: Create auth header
            String credentials = grafanaUser + ":" + grafanaToken;
            String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/x-protobuf");
            headers.set("Content-Encoding", "snappy");
            headers.set("X-Prometheus-Remote-Write-Version", "0.1.0");
            headers.set("Authorization", "Basic " + encodedCredentials);
            headers.set("User-Agent", "HealthTech-Backend/1.0");
            
            System.out.println("[GRAFANA-PUSHER] Pushing to: " + grafanaUrl);
            
            // Step 5: Push to Grafana
            HttpEntity<byte[]> request = new HttpEntity<>(compressedData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(grafanaUrl, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("[GRAFANA-PUSHER] ✓ Metrics pushed successfully (HTTP " + 
                                  response.getStatusCode().value() + ")");
                System.out.println("[GRAFANA-PUSHER] Response body: " + (response.getBody() != null ? response.getBody() : "empty"));
            } else {
                System.out.println("[GRAFANA-PUSHER] ✗ HTTP " + response.getStatusCode().value());
                System.out.println("[GRAFANA-PUSHER] Response body: " + response.getBody());
            }
            
        } catch (Exception e) {
            System.err.println("[GRAFANA-PUSHER] ✗ Error on invocation #" + invocationNumber + 
                              ": " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("=== [GRAFANA-PUSHER] ===================================\n");
    }

    /**
     * Convert Prometheus text format to Remote Write v1.0 protobuf WriteRequest
     */
    private byte[] convertPrometheusToRemoteWrite(String prometheusText) throws Exception {
        WriteRequest.Builder requestBuilder = WriteRequest.newBuilder();
        
        BufferedReader reader = new BufferedReader(new StringReader(prometheusText));
        String line;
        long timestampMs = System.currentTimeMillis();
        
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            
            // Skip comments and empty lines
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            
            try {
                String metricName;
                Map<String, String> labels = new HashMap<>();
                double value;
                
                int braceIndex = line.indexOf('{');
                int closeBraceIndex = line.indexOf('}');
                
                if (braceIndex > 0 && closeBraceIndex > braceIndex) {
                    metricName = line.substring(0, braceIndex).trim();
                    String labelsStr = line.substring(braceIndex + 1, closeBraceIndex).trim();
                    String remaining = line.substring(closeBraceIndex + 1).trim();
                    String[] tokens = remaining.split("\\s+");
                    value = Double.parseDouble(tokens[0]);
                    
                    // Parse labels
                    String[] labelPairs = labelsStr.split(",");
                    for (String pair : labelPairs) {
                        String[] parts = pair.split("=", 2);
                        if (parts.length == 2) {
                            String key = parts[0].trim();
                            String val = parts[1].trim();
                            if (val.startsWith("\"") && val.endsWith("\"")) {
                                val = val.substring(1, val.length() - 1);
                            }
                            labels.put(key, val);
                        }
                    }
                } else {
                    String[] tokens = line.split("\\s+");
                    metricName = tokens[0].trim();
                    value = Double.parseDouble(tokens[1]);
                }
                
                // Construct TimeSeries
                Types.TimeSeries.Builder tsBuilder = Types.TimeSeries.newBuilder();
                
                // Add __name__ label
                tsBuilder.addLabels(
                    Types.Label.newBuilder()
                        .setName("__name__")
                        .setValue(metricName)
                        .build()
                );
                
                // Add other labels
                for (Map.Entry<String, String> entry : labels.entrySet()) {
                    tsBuilder.addLabels(
                        Types.Label.newBuilder()
                            .setName(entry.getKey())
                            .setValue(entry.getValue())
                            .build()
                    );
                }
                
                // Add Sample
                tsBuilder.addSamples(
                    Types.Sample.newBuilder()
                        .setValue(value)
                        .setTimestamp(timestampMs)
                        .build()
                );
                
                requestBuilder.addTimeseries(tsBuilder.build());
                
            } catch (Exception e) {
                // Ignore parse errors for individual lines (e.g. invalid numbers) and continue
            }
        }
        
        return requestBuilder.build().toByteArray();
    }
}
