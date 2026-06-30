package com.example.healthtech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import org.springframework.scheduling.annotation.EnableScheduling;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;


@SpringBootApplication(exclude = {
    org.springframework.boot.autoconfigure.websocket.servlet.WebSocketMessagingAutoConfiguration.class
})
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.example.healthtech.repository.jpa")
@EnableMongoRepositories(basePackages = "com.example.healthtech.repository.mongodb")
public class HealthTechApplication {
    private static org.springframework.context.ApplicationContext context;
    
    public static void main(String[] args) {
        loadDotenvFile();
        context = SpringApplication.run(HealthTechApplication.class, args);
        System.out.println("[STARTUP] HealthTechApplication started with @EnableScheduling ACTIVE");
        System.out.println("[STARTUP] Active beans: " + context.getBeanDefinitionCount());
        
        // Verify GrafanaMetricsPusher bean exists
        try {
            Object pusher = context.getBean("grafanaMetricsPusher");
            System.out.println("[STARTUP] GrafanaMetricsPusher bean found: " + pusher.getClass().getName());
        } catch (Exception e) {
            System.err.println("[STARTUP] ERROR: GrafanaMetricsPusher bean NOT found: " + e.getMessage());
        }
    }
    
    private static void loadDotenvFile() {
        Path dotenvPath = Paths.get(".env");
        if (!Files.exists(dotenvPath) || !Files.isReadable(dotenvPath)) {
            System.out.println("[ENV] No .env file found at " + dotenvPath.toAbsolutePath());
            return;
        }

        System.out.println("[ENV] Loading .env from " + dotenvPath.toAbsolutePath());
        try (Stream<String> lines = Files.lines(dotenvPath, StandardCharsets.UTF_8)) {
            lines.map(String::trim)
                .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                .forEach(line -> {
                    int idx = line.indexOf('=');
                    if (idx <= 0) {
                        return;
                    }
                    String key = line.substring(0, idx).trim();
                    String value = line.substring(idx + 1).trim();
                    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    if (System.getProperty(key) == null) {
                        System.setProperty(key, value);
                    }
                });
        } catch (IOException ex) {
            System.err.println("[ENV] Failed to load .env: " + ex.getMessage());
        }
    }
    
    public static org.springframework.context.ApplicationContext getContext() {
        return context;
    }
}
