package com.example.healthtech.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class DebugController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private com.example.healthtech.repository.jpa.DoctorRepository doctorRepository;

    @GetMapping("/api/debug/doctors")
    public List<Map<String, Object>> getDoctors() {
        return jdbcTemplate.queryForList("SELECT id, name, mediator_id, account_id FROM doctor");
    }

    @GetMapping("/api/debug/mediators")
    public List<Map<String, Object>> getMediators() {
        return jdbcTemplate.queryForList("SELECT id, name, doctor_id, account_id FROM mediator");
    }

    @GetMapping("/api/debug/session-info")
    public Object getSessionInfo() {
        // hardcode 3 for med123
        java.util.Optional<com.example.healthtech.model.Doctor> docOpt = doctorRepository.findByMediatorId(3L);
        return docOpt.isPresent() ? docOpt.get().getName() : "Not Found";
    }

    @GetMapping("/api/debug/accounts")
    public List<Map<String, Object>> getAccounts() {
        return jdbcTemplate.queryForList("SELECT id, username, role FROM account WHERE role IN ('ROLE_DOCTOR', 'ROLE_MEDIATOR')");
    }
}
