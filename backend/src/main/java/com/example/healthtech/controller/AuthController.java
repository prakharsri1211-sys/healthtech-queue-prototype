package com.example.healthtech.controller;

import com.example.healthtech.model.Account;
import com.example.healthtech.repository.jpa.AccountRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.springframework.beans.factory.annotation.Autowired;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")

public class AuthController {

    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.example.healthtech.config.JwtUtil jwtUtil;

    @Autowired
    private com.example.healthtech.repository.jpa.DoctorRepository doctorRepository;
    @Autowired
    private com.example.healthtech.repository.jpa.MediatorRepository mediatorRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.PatientRepository patientRepository;
    @Autowired
    private com.example.healthtech.repository.jpa.FinanceLedgerRepository financeLedgerRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.LiveQueueEntryRepository liveQueueEntryRepository;

    private static final java.util.Set<String> VALID_SPECIALTIES = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
    static {
        VALID_SPECIALTIES.addAll(java.util.Arrays.asList(
            "General Medicine", "Cardiology", "Cardiologist", "Heart Specialist", "Neurology", "Ayurveda", "Homeopathy", "Orthopedics", "Pediatrics", "Dermatology", "Psychiatry", "Oncology", "Gastroenterology", "Endocrinology", "Rheumatology", "Urology", "Nephrology", "Pulmonology", "Ophthalmology", "ENT", "Gynecology", "Obstetrics", "Anesthesiology", "Pathology", "Radiology", "Surgery", "Emergency Medicine", "Dentistry"
        ));
    }

    @PostMapping("/signup")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, String>> signup(@RequestBody Map<String, Object> payload) {
        try {
            String username = (String) payload.get("username");
            String password = (String) payload.get("password");
            String fullName = (String) payload.get("fullName");
            String phone = (String) payload.get("phoneNumber");
            String role = (String) payload.get("role");
            String aadhar = (String) payload.get("primaryAadharNumber");
            String identityToken = (String) payload.get("identityToken");

            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required."));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required."));
            }
            if (fullName == null || fullName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Full name is required."));
            }
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Contact number is important. Please enter a valid contact number."));
            }
            if (role == null || role.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role is required."));
            }
            if (aadhar == null || aadhar.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Aadhaar card verification is important. Please enter your 12-digit Aadhaar card number."));
            }
            if (identityToken == null || identityToken.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Identity token is required and must be unique."));
            }

            if (com.example.healthtech.config.AppConstants.ROLE_PATIENT.equals(role)) {
                Object ageObj = payload.get("age");
                if (ageObj == null || ageObj.toString().trim().isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Age is required for patients"));
                }
                try {
                    int ageVal = Integer.parseInt(ageObj.toString().trim());
                    if (ageVal <= 0) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid age"));
                    }
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid numeric age"));
                }
            }

            if (accountRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already registered in clinical system"));
            }
            if (identityToken != null && !identityToken.isEmpty() && accountRepository.findByIdentityToken(identityToken).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Identity Token already taken. Please choose another or use a suggestion."));
            }
            if (aadhar != null && accountRepository.findByPrimaryAadharNumber(aadhar).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Aadhar number already registered. Use a different identity."));
            }
            
            Account account = new Account();
            account.setUsername(username);
            account.setPassword(passwordEncoder.encode(password));
            account.setFullName(fullName);
            account.setPhoneNumber(phone);
            account.setRole(role);
            account.setPrimaryAadharNumber(aadhar);
            account.setIdentityToken(identityToken);
            if (payload.get("age") != null) {
                try {
                    account.setAge(Integer.parseInt(payload.get("age").toString()));
                } catch (Exception e) {}
            }
            account.setIdentityVerified(true);
            account = accountRepository.save(account);

            // Provision role-specific sub-profiles
            if (com.example.healthtech.config.AppConstants.ROLE_DOCTOR.equals(role)) {
                String rawSpeciality = payload.get("speciality") != null
                        ? ((String) payload.get("speciality")).trim()
                        : "General Medicine";

                String finalSpeciality = null;
                for (String validSpec : VALID_SPECIALTIES) {
                    if (validSpec.equalsIgnoreCase(rawSpeciality)) {
                        finalSpeciality = validSpec;
                        break;
                    }
                }

                if (finalSpeciality == null) {
                    throw new IllegalArgumentException("Medical speciality not recognized");
                }

                com.example.healthtech.model.Doctor doc = new com.example.healthtech.model.Doctor();
                doc.setName(fullName);
                doc.setAccount(account);
                doc.setSpeciality(finalSpeciality);
                if (payload.get("clinicName") != null) {
                    doc.setClinicName((String) payload.get("clinicName"));
                }
                if (payload.get("clinicAddress") != null) {
                    doc.setClinicAddress((String) payload.get("clinicAddress"));
                }
                if (payload.get("latitude") != null) {
                    doc.setLatitude(Double.valueOf(payload.get("latitude").toString()));
                }
                if (payload.get("longitude") != null) {
                    doc.setLongitude(Double.valueOf(payload.get("longitude").toString()));
                }
                doctorRepository.save(doc);
            } else if (com.example.healthtech.config.AppConstants.ROLE_MEDIATOR.equals(role)) {
                com.example.healthtech.model.Mediator med = new com.example.healthtech.model.Mediator();
                med.setName(fullName);
                med.setAccount(account);
                mediatorRepository.save(med);
            } else if (com.example.healthtech.config.AppConstants.ROLE_PATIENT.equals(role)) {
                // Safeguard against PostgreSQL-MongoDB ID desyncs (e.g. if Postgres is reset but Mongo isn't).
                // Purge any orphaned MongoDB documents that collide with this newly generated account ID.
                java.util.List<com.example.healthtech.model.Patient> orphaned = patientRepository.findByAccountId(account.getId());
                for (com.example.healthtech.model.Patient p : orphaned) {
                    try {
                        appointmentRepository.deleteAll(appointmentRepository.findByPatientId(p.getId()));
                        liveQueueEntryRepository.deleteByPatientId(p.getId());
                        financeLedgerRepository.findByPatientId(p.getId()).ifPresent(financeLedgerRepository::delete);
                        patientRepository.deleteById(p.getId());
                    } catch (Exception e) {
                        System.err.println("[AUTH] Cleanup warning for orphaned patient " + p.getId() + ": " + e.getMessage());
                    }
                }

                com.example.healthtech.model.Patient pat = new com.example.healthtech.model.Patient();
                pat.setName(fullName);
                pat.setAccountId(account.getId());
                pat.setAadharOrAbhaId(aadhar);
                if (account.getAge() != null) {
                    pat.setAge(account.getAge());
                }
                if (payload.get("gender") != null) {
                    pat.setGender((String) payload.get("gender"));
                }
                pat = patientRepository.save(pat);

                // Provision finance ledger with default ₹0 and no credit
                com.example.healthtech.model.FinanceLedger ledger = new com.example.healthtech.model.FinanceLedger();
                ledger.setPatientId(pat.getId());
                ledger.setCreditBalance(0);
                ledger.setTotalFee(0);
                financeLedgerRepository.save(ledger);
            }

            return ResponseEntity.ok(Map.of("message", "Clinical credentials provisioned successfully"));
        } catch (Exception e) {
            // Force transaction rollback so PostgreSQL account isn't orphaned
            try {
                org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            } catch (Exception ex) {
                System.err.println("[AUTH] Failed to set rollback only: " + ex.getMessage());
            }
            // SECURITY: Never log raw exception which may contain PII
            System.err.println("[AUTH] Signup failed for role: " + payload.get("role") + " — " + e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(Map.of("error", "Vault Access Failure: Registration could not be completed."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        try {
            String username = credentials.get("username");
            String password = credentials.get("password");

            // Temporary null check debug logging
            if (username == null || password == null) {
                return ResponseEntity.status(400).body(Map.of("error", "Username or password is missing in the request payload"));
            }

            Optional<Account> accountOpt = accountRepository.findByUsername(username);
            if (accountOpt.isPresent()) {
                Account user = accountOpt.get();
                if (passwordEncoder.matches(password, user.getPassword())) {
                    String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId(), user.isIdentityVerified());
                    Map<String, Object> response = new HashMap<>();
                    response.put("id", user.getId());
                    response.put("role", user.getRole());
                    response.put("username", user.getUsername());
                    response.put("fullName", user.getFullName());
                    response.put("primaryAadharNumber", user.getPrimaryAadharNumber());
                    response.put("age", user.getAge());
                    response.put("identityToken", user.getIdentityToken());
                    if (com.example.healthtech.config.AppConstants.ROLE_DOCTOR.equals(user.getRole())) {
                        java.util.Optional<com.example.healthtech.model.Doctor> docOpt = doctorRepository.findByAccountId(user.getId());
                        if (docOpt.isPresent()) {
                            response.put("doctorId", docOpt.get().getId());
                            response.put("speciality", docOpt.get().getSpeciality());
                        } else {
                            // Self-healing for corrupted old accounts
                            com.example.healthtech.model.Doctor doc = new com.example.healthtech.model.Doctor();
                            doc.setName(user.getFullName());
                            doc.setAccount(user);
                            doc.setSpeciality("General Medicine");
                            doc = doctorRepository.save(doc);
                            response.put("doctorId", doc.getId());
                            response.put("speciality", doc.getSpeciality());
                        }
                    } else if (com.example.healthtech.config.AppConstants.ROLE_MEDIATOR.equals(user.getRole())) {
                        java.util.Optional<com.example.healthtech.model.Mediator> medOpt = mediatorRepository.findByAccountId(user.getId());
                        if (medOpt.isEmpty()) {
                            com.example.healthtech.model.Mediator med = new com.example.healthtech.model.Mediator();
                            med.setName(user.getFullName());
                            med.setAccount(user);
                            mediatorRepository.save(med);
                        }
                    } else if (com.example.healthtech.config.AppConstants.ROLE_PATIENT.equals(user.getRole())) {
                        java.util.List<com.example.healthtech.model.Patient> patients = patientRepository.findByAccountId(user.getId());
                        if (patients.isEmpty()) {
                            com.example.healthtech.model.Patient pat = new com.example.healthtech.model.Patient();
                            pat.setName(user.getFullName());
                            pat.setAccountId(user.getId());
                            pat.setAadharOrAbhaId(user.getPrimaryAadharNumber());
                            if (user.getAge() != null) {
                                pat.setAge(user.getAge());
                            }
                            pat = patientRepository.save(pat);
                            
                            com.example.healthtech.model.FinanceLedger ledger = new com.example.healthtech.model.FinanceLedger();
                            ledger.setPatientId(pat.getId());
                            ledger.setCreditBalance(0);
                            ledger.setTotalFee(0);
                            financeLedgerRepository.save(ledger);
                        }
                    }
                    response.put("token", token);
                    response.put("message", "Login successful");
                    return ResponseEntity.ok(response);
                } else {
                    return ResponseEntity.status(401).body(Map.of("error", "Incorrect password. Please try again."));
                }
            } else {
                return ResponseEntity.status(404).body(Map.of("error", "Account doesn't exist."));
            }

        } catch (Exception ex) {
            // Log to console for Render
            System.err.println("[AUTH] FATAL LOGIN ERROR: " + ex.getMessage());
            ex.printStackTrace();
            
            // Build a descriptive error for the UI
            String diag = (ex.getMessage() != null) ? ex.getMessage() : "Unknown Security Error";
            String errorMsg = "Authentication service unavailable [" + ex.getClass().getSimpleName() + ": " + diag + "]";
            
            return ResponseEntity.status(500).body(Map.of(
                "error", errorMsg,
                "details", diag,
                "type", ex.getClass().getSimpleName()
            ));
        }
    }
}
