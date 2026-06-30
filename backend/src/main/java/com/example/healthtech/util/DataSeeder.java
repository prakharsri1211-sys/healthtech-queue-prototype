package com.example.healthtech.util;

import com.example.healthtech.model.*;
import com.example.healthtech.repository.jpa.*;
import com.example.healthtech.repository.mongodb.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalTime;

// Completely unmapped from the Spring container lifecycle to avoid BeanCreationNotAllowedException on startup
public class DataSeeder {

    @Autowired
    private DoctorRepository doctorRepository;
    @Autowired
    private PatientRepository patientRepository;
    @Autowired
    private MediatorRepository mediatorRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private LiveQueueEntryRepository liveQueueEntryRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.VitalsLogRepository vitalsLogRepository;
    @Autowired
    private com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository;
    @Autowired
    private com.example.healthtech.repository.jpa.ApptHistoryRepository apptHistoryRepository;
    @Autowired
    private com.example.healthtech.repository.jpa.AvailabilityRepository availabilityRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JdbcTemplate jdbcTemplate;


    @Autowired
    private FinanceLedgerRepository financeLedgerRepository;

    public void run(String... args) throws Exception {
        System.out.println("[SEEDER] DataSeeder runner initialized.");
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        // [MODIFIED] Nuclear Flush disabled for production persistence.
        // If you need to clear data, use the /api/seed/purge endpoint manually.
        System.out.println("[SEEDER] System Ready. Persistence mode active.");
    }

    // seedMediatorSandbox removed as per USER request to eliminate dummy data.
}
