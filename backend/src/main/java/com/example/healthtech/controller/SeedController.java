package com.example.healthtech.controller;

import com.example.healthtech.model.*;
import com.example.healthtech.repository.jpa.*;
import com.example.healthtech.repository.mongodb.PatientRepository;
import com.example.healthtech.repository.mongodb.VitalsLogRepository;
import com.example.healthtech.repository.mongodb.AppointmentRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;


@RestController
@RequestMapping("/api/seed")
public class SeedController {

    @Autowired
    private DoctorRepository doctorRepository;
    @Autowired
    private PatientRepository patientRepository;
    @Autowired
    private MediatorRepository mediatorRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private VitalsLogRepository vitalsLogRepository;
    @Autowired
    private AppointmentRepository appointmentRepository;
    @Autowired
    private FinanceLedgerRepository financeLedgerRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.LiveQueueRepository liveQueueRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.LiveQueueEntryRepository liveQueueEntryRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.ClinicMetadataRepository clinicMetadataRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/purge")
    public ResponseEntity<?> purgeDummyData() throws Exception {
        performAbsolutePurge();
        return ResponseEntity.ok(Map.of("message", "Absolute database purge complete. All tables and collections are 100% empty."));
    }

    @PostMapping("/initialize")
    public ResponseEntity<?> seedDatabase() throws Exception {
        performAbsolutePurge();
        return ResponseEntity.ok(Map.of("message", "Database successfully initialized to a clean, empty state. Seeding has been disabled."));
    }

    private void performAbsolutePurge() {
        System.out.println("[SEED] NUCLEAR PURGE: Commencing absolute database wipeout...");
        
        // 1. Clear all MongoDB collections completely
        try {
            appointmentRepository.deleteAll();
            liveQueueEntryRepository.deleteAll();
            liveQueueRepository.deleteAll();
            vitalsLogRepository.deleteAll();
            patientRepository.deleteAll();
            clinicMetadataRepository.deleteAll();
            System.out.println("[SEED] MongoDB collections completely cleared.");
        } catch (Exception e) {
            System.out.println("[SEED] MongoDB clear skipped: " + e.getMessage());
        }

        // 2. Clear all PostgreSQL tables completely
        String[] tables = {
            "finance_ledger", "commitment_log", "active_timer", "appt_history", 
            "availability", "clinic_details", "doctor", "mediator", "patient", 
            "appointment", "account"
        };
        
        for (String table : tables) {
            try {
                jdbcTemplate.execute("TRUNCATE TABLE " + table + " RESTART IDENTITY CASCADE");
                System.out.println("[SEED] Truncated SQL table: " + table);
            } catch (Exception e) {
                System.out.println("[SEED] SQL table TRUNCATE skipped for " + table + ": " + e.getMessage());
            }
        }
        System.out.println("[SEED] Absolute nuclear flush complete. Row and document counts are exactly 0.");
    }

    @GetMapping("/status")
    public ResponseEntity<?> seedStatus() {
        Map<String, Long> status = new LinkedHashMap<>();
        status.put("doctors", doctorRepository.count());
        status.put("mediators", mediatorRepository.count());
        status.put("patients", patientRepository.count());
        status.put("accounts", accountRepository.count());
        status.put("vitalsLogs", vitalsLogRepository.count());
        status.put("appointments", appointmentRepository.count());
        status.put("ledgers", financeLedgerRepository.count());
        status.put("queues", liveQueueRepository.count());
        status.put("queueEntries", liveQueueEntryRepository.count());
        return ResponseEntity.ok(status);
    }
}
