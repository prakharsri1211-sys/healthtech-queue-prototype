package com.example.healthtech.controller;

import com.example.healthtech.model.Account;
import com.example.healthtech.model.Patient;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.repository.mongodb.PatientRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;
    private final PatientRepository patientRepository;
    private final com.example.healthtech.config.JwtUtil jwtUtil;

    public AccountController(AccountRepository accountRepository, PatientRepository patientRepository, com.example.healthtech.config.JwtUtil jwtUtil) {
        this.accountRepository = accountRepository;
        this.patientRepository = patientRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<java.util.Map<String, Object>> login(@RequestBody Account loginRequest) {
        String phone = loginRequest.getPhoneNumber();
        String aadhar = loginRequest.getPrimaryAadharNumber();
        
        if (aadhar != null && !aadhar.matches("\\d{12}")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Aadhaar validation failed: Must be 12 digits"));
        }

        Optional<Account> existingAccount = accountRepository.findByPhoneNumberAndPrimaryAadharNumber(phone, aadhar);
        Account user;
        if (existingAccount.isPresent()) {
            user = existingAccount.get();
        } else {
            user = new Account();
            user.setPhoneNumber(phone);
            user.setPrimaryAadharNumber(aadhar);
            user.setUsername("p" + phone);
            user.setRole(com.example.healthtech.config.AppConstants.ROLE_PATIENT);
            user.setIdentityVerified(true);
            user = accountRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId(), user.isIdentityVerified());
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", user.getId());
        response.put("role", user.getRole());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        response.put("token", token);
        response.put("message", "Login successful via clinical secure vault");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{accountId}/patients")
    public ResponseEntity<?> addPatient(@PathVariable Long accountId, @RequestBody Patient patientRequest) {
        Optional<Account> accountOptional = accountRepository.findById(accountId);
        if (accountOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Enforce max 5 members per account (family plan)
        long existingCount = patientRepository.findByAccountId(accountId).size();
        if (existingCount >= 5) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", "Maximum of 5 family members allowed per account"));
        }

        patientRequest.setAccountId(accountId);
        Patient savedPatient = patientRepository.save(patientRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPatient);
    }

    @GetMapping("/{accountId}/patients")
    public ResponseEntity<List<Patient>> getPatients(@PathVariable Long accountId) {
        return ResponseEntity.ok(patientRepository.findByAccountId(accountId));
    }

    @PostMapping("/verify/{aadharId}")
    public ResponseEntity<?> verifyAccount(@PathVariable String aadharId) {
        return accountRepository.findByPrimaryAadharNumber(aadharId)
                .map(account -> {
                    account.setIdentityVerified(true);
                    accountRepository.save(account);
                    java.util.Map<String, String> response = new java.util.HashMap<>();
                    response.put("message", "Identity verified successfully");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
