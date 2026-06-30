package com.example.healthtech.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthCheckController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/db-status")
    public Map<String, Object> getDbStatus() {
        Map<String, Object> status = new HashMap<>();
        try {
            // Check connection by running a simple query
            jdbcTemplate.execute("SELECT 1");
            status.put("database", "UP");
            status.put("connection", "SUCCESSFUL");

            // Check key PostgreSQL tables
            status.put("tables", Map.of(
                    "account", checkTable("account"),
                    "availability", checkTable("availability"),
                    "mediator", checkTable("mediator")));

            status.put("timestamp", System.currentTimeMillis());
        } catch (Exception e) {
            status.put("database", "DOWN");
            status.put("error", e.getMessage());
        }
        return status;
    }

    private String checkTable(String tableName) {
        try {
            jdbcTemplate.execute("SELECT count(*) FROM " + tableName);
            return "HEALTHY";
        } catch (Exception e) {
            return "MISSING OR ERROR: " + e.getMessage();
        }
    }
}
