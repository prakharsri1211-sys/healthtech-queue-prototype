package com.example.healthtech.controller;

import com.example.healthtech.config.JwtUtil;
import com.example.healthtech.model.Account;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.service.QueueService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Handles mediator-specific auth endpoints.
 * Login uses the shared Account table (ROLE_MEDIATOR) with JWT — same
 * flow as AuthController but namespaced under /api/mediator for clarity.
 */
@RestController
@RequestMapping("/api/mediator")

public class MediatorAuthController {

    private final QueueService queueService;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public MediatorAuthController(QueueService queueService,
                                  AccountRepository accountRepository,
                                  PasswordEncoder passwordEncoder,
                                  JwtUtil jwtUtil) {
        this.queueService = queueService;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * POST /api/mediator/login
     * Accepts { "username": "...", "password": "..." }.
     * First tries the real Account DB (ROLE_MEDIATOR accounts).
     * Falls back to the legacy hard-coded mediator credential so existing
     * demo sessions continue to work during transition.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        // ── Primary: DB-backed auth ──────────────────────────────────────────
        Optional<Account> accountOpt = accountRepository.findByUsername(username);
        if (accountOpt.isPresent()) {
            Account account = accountOpt.get();
            if (passwordEncoder.matches(password, account.getPassword())) {
                if (!com.example.healthtech.config.AppConstants.ROLE_MEDIATOR.equals(account.getRole())) {
                    return ResponseEntity.status(403)
                            .body(Map.of("error", "Account is not a mediator"));
                }
                String token = jwtUtil.generateToken(account.getUsername(), account.getRole(), account.getId(), account.isIdentityVerified());
                Map<String, Object> response = new HashMap<>();
                response.put("token", token);
                response.put("role", "mediator");
                response.put("id", account.getId());
                response.put("fullName", account.getFullName());
                response.put("username", account.getUsername());
                response.put("message", "Login successful");
                return ResponseEntity.ok(response);
            }
        }

        // ── Fallback: legacy hard-coded demo credential ──────────────────────
        if ("mediator".equals(username) && "password123".equals(password)) {
            Map<String, Object> response = new HashMap<>();
            response.put("token", "mediator-demo-token");
            response.put("role", "mediator");
            response.put("id", 0);
            response.put("fullName", "Demo Mediator");
            response.put("username", "mediator");
            response.put("message", "Login successful (demo account)");
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }

    /**
     * POST /api/mediator/move-down
     * Moves a patient to the back of the queue and deducts ₹100 late-arrival charge.
     */
    @PostMapping("/move-down")
    public ResponseEntity<Map<String, String>> moveDown(@RequestBody Map<String, Object> body) {
        String patientId = String.valueOf(body.getOrDefault("patientId", ""));
        if (patientId.isEmpty() || "-1".equals(patientId) || "null".equals(patientId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid patientId"));
        }

        try {
            queueService.triggerLateArrival(patientId);
            return ResponseEntity.ok(Map.of("message", "Patient moved down and ₹100 deducted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
