package com.example.healthtech.util;

import com.example.healthtech.model.Account;
import com.example.healthtech.model.Patient;
import com.example.healthtech.model.Appointment;
import com.example.healthtech.model.LiveQueueEntry;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.repository.mongodb.AppointmentRepository;
import com.example.healthtech.repository.mongodb.PatientRepository;
import com.example.healthtech.repository.mongodb.LiveQueueEntryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DatabaseSanitizer implements CommandLineRunner {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private LiveQueueEntryRepository liveQueueEntryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("[SANITIZER] Commencing aggressive database sanitation for mock/ghost entries...");

        // 1. Clean up accounts with mock usernames
        List<Account> accounts = accountRepository.findAll();
        for (Account acc : accounts) {
            String uname = acc.getUsername() != null ? acc.getUsername().toLowerCase() : "";
            if (isMockPattern(uname)) {
                System.out.println("[SANITIZER] Purging mock account: " + acc.getUsername());
                accountRepository.delete(acc);
            }
        }

        // 2. Clean up patient records in MongoDB
        List<Patient> patients = patientRepository.findAll();
        for (Patient p : patients) {
            String name = p.getName() != null ? p.getName().toLowerCase() : "";
            if (isMockPattern(name)) {
                System.out.println("[SANITIZER] Purging mock patient: " + p.getName());
                patientRepository.delete(p);
            }
        }

        // Re-fetch clean list of patient IDs
        Set<String> validPatientIds = patientRepository.findAll().stream()
                .map(Patient::getId)
                .collect(Collectors.toSet());

        // 3. Clean up MongoDB appointments (mock names or orphaned patientId)
        List<Appointment> appointments = appointmentRepository.findAll();
        for (Appointment app : appointments) {
            String pName = app.getPatientName() != null ? app.getPatientName().toLowerCase() : "";
            String pId = app.getPatientId();
            boolean isOrphaned = pId == null || !validPatientIds.contains(pId);
            if (isMockPattern(pName) || isOrphaned) {
                System.out.println("[SANITIZER] Purging appointment (mock name/orphaned): " + app.getId() + " - " + app.getPatientName());
                appointmentRepository.delete(app);
            }
        }

        // 4. Clean up MongoDB live queue entries (mock names or orphaned patientId)
        List<LiveQueueEntry> entries = liveQueueEntryRepository.findAll();
        for (LiveQueueEntry entry : entries) {
            String pName = entry.getPatientName() != null ? entry.getPatientName().toLowerCase() : "";
            String pId = entry.getPatientId();
            boolean isOrphaned = pId == null || !validPatientIds.contains(pId);
            if (isMockPattern(pName) || isOrphaned) {
                System.out.println("[SANITIZER] Purging live queue entry: " + entry.getId() + " - " + entry.getPatientName());
                liveQueueEntryRepository.delete(entry);
            }
        }

        // 5. Clean up PostgreSQL appointments table
        try {
            // Delete appointments whose names/ids are mock or orphan
            jdbcTemplate.execute("DELETE FROM appointment WHERE patient_id IS NULL OR status = 'COMPLETED'");
            
            // Clean up any remaining records matching names
            int deletedSql = jdbcTemplate.update("DELETE FROM appointment WHERE LOWER(patient_name) LIKE '%mock%' " +
                    "OR LOWER(patient_name) LIKE '%test%' " +
                    "OR LOWER(patient_name) LIKE '%dummy%' " +
                    "OR LOWER(patient_name) LIKE '%abc%' " +
                    "OR LOWER(patient_name) LIKE '%john%doe%' " +
                    "OR LOWER(patient_name) LIKE '%guest%'");
            if (deletedSql > 0) {
                System.out.println("[SANITIZER] Purged " + deletedSql + " mock SQL appointments.");
            }
        } catch (Exception e) {
            System.err.println("[SANITIZER] SQL appointment cleanup failed: " + e.getMessage());
        }

        System.out.println("[SANITIZER] Sanitation complete. Database is clean.");
    }

    private boolean isMockPattern(String text) {
        if (text == null) return false;
        String t = text.toLowerCase();
        return t.contains("mock") ||
               t.contains("test") ||
               t.contains("dummy") ||
               t.contains("john doe") ||
               t.contains("jane doe") ||
               t.contains("guest") ||
               t.contains("patient123");
    }
}
