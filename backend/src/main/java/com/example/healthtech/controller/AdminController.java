package com.example.healthtech.controller;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private JdbcTemplate jdbcTemplate;


    @GetMapping("/db-schema")
    public Map<String, Object> getDbSchema() {
        Map<String, Object> result = new HashMap<>();

        // SQL Section
        try {
            List<String> tables = jdbcTemplate.queryForList(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
                    String.class);
            result.put("sqlStatus", "CONNECTED");
            result.put("sqlTables", tables);
            result.put("sqlEngine", "PostgreSQL");
        } catch (Exception e) {
            result.put("sqlStatus", "ERROR");
            result.put("sqlError", e.getMessage());
        }

        // PostgreSQL Database ONLY
        result.put("noSqlStatus", "DISABLED");
        result.put("status", "CONNECTED"); 
        result.put("database", "PostgreSQL (Consolidated)");

        return result;
    }
}
