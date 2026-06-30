package com.example.healthtech.controller;

import com.example.healthtech.model.FinanceLedger;
import com.example.healthtech.model.Patient;
import com.example.healthtech.service.QueueService;
import com.example.healthtech.repository.jpa.FinanceLedgerRepository;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.repository.mongodb.PatientRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.healthtech.model.Appointment;
import com.example.healthtech.model.ApptHistory;
import com.example.healthtech.repository.mongodb.AppointmentRepository;
import com.example.healthtech.repository.jpa.ApptHistoryRepository;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.example.healthtech.model.LiveQueueEntry;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/mediator")
public class MediatorController {

    private final QueueService queueService;
    private final FinanceLedgerRepository financeLedgerRepository;
    private final PatientRepository patientRepository;
    private final com.example.healthtech.repository.jpa.DoctorRepository doctorRepository;
    private final com.example.healthtech.repository.jpa.MediatorRepository mediatorRepository;
    private final AccountRepository accountRepository;
    private final AppointmentRepository appointmentRepository;
    private final ApptHistoryRepository apptHistoryRepository;

    public MediatorController(QueueService queueService, FinanceLedgerRepository financeLedgerRepository,
            PatientRepository patientRepository,
            com.example.healthtech.repository.jpa.DoctorRepository doctorRepository,
            com.example.healthtech.repository.jpa.MediatorRepository mediatorRepository,
            AccountRepository accountRepository,
            AppointmentRepository appointmentRepository,
            ApptHistoryRepository apptHistoryRepository) {
        this.queueService = queueService;
        this.financeLedgerRepository = financeLedgerRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.mediatorRepository = mediatorRepository;
        this.accountRepository = accountRepository;
        this.appointmentRepository = appointmentRepository;
        this.apptHistoryRepository = apptHistoryRepository;
    }

    @GetMapping("/queue/all")
    public ResponseEntity<List<LiveQueueEntry>> getFullQueue() {
        return ResponseEntity.ok(queueService.getCurrentQueue());
    }

    @PostMapping("/queue/reorder")
    public ResponseEntity<Void> reorderQueue(@RequestBody java.util.Map<String, Object> data) {
        String patientId = (String) data.get("patientId");
        String direction = (String) data.get("direction");
        queueService.pushDown(patientId, "UP".equals(direction) ? -1 : 1);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientRepository.findAll());
    }

    /**
     * GET /api/mediator/queue
     * Returns the live unserved queue (same as /queue/all but as LiveQueueEntry list).
     */
    @GetMapping("/queue")
    public ResponseEntity<List<LiveQueueEntry>> getQueue() {
        return ResponseEntity.ok(queueService.getCurrentQueue());
    }

    /**
     * GET /api/mediator/queue/doctor/{doctorId}
     * Returns only the queue entries assigned to a specific doctor.
     */
    @GetMapping("/queue/doctor/{doctorId}")
    public ResponseEntity<List<LiveQueueEntry>> getDoctorQueue(@PathVariable Long doctorId) {
        List<LiveQueueEntry> filtered = queueService.getCurrentQueue().stream()
                .filter(e -> doctorId.equals(e.getDoctorId()))
                .toList();
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/queue/{doctorId}")
    public ResponseEntity<List<Map<String, Object>>> getQueueForDoctor(@PathVariable Long doctorId) {
        LocalDate today = LocalDate.now();
        
        List<Appointment> appointments = appointmentRepository
            .findByDoctorIdAndDateAndStatusIn(
                doctorId,
                today,
                com.example.healthtech.config.AppConstants.ACTIVE_QUEUE_STATUSES
            );
        
        Set<String> seenPatients = new HashSet<>();
        List<Appointment> deduplicated = appointments.stream()
            .filter(a -> seenPatients.add(a.getPatientId()))
            .collect(Collectors.toList());
        
        System.out.println("[MEDIATOR] Total appointments: " + appointments.size() + 
                           ", After dedup: " + deduplicated.size());
        
        List<Map<String, Object>> queue = new ArrayList<>();
        
        // ApptHistory doesn't track durations, fallback to 10.0
        double avgDuration = 10.0;
        
        LocalTime currentTime = LocalTime.now();
        
        for (int i = 0; i < deduplicated.size(); i++) {
            Appointment appt = deduplicated.get(i);
            
            LocalTime estimatedWaitTime = currentTime.plusMinutes((long)(i * avgDuration));
            
            Map<String, Object> queueEntry = new HashMap<>();
            queueEntry.put("appointmentId", appt.getId());
            queueEntry.put("patientId", appt.getPatientId());
            queueEntry.put("patientName", appt.getPatientName());
            queueEntry.put("queuePosition", i + 1);
            queueEntry.put("status", appt.getStatus());
            queueEntry.put("isPremium", appt.getIsPremium());
            queueEntry.put("timeSlot", appt.getTimeSlot());
            queueEntry.put("tokenNumber", appt.getTokenNumber());
            queueEntry.put("estimatedWaitTime", estimatedWaitTime.format(
                DateTimeFormatter.ofPattern("h:mm a")));
            
            queue.add(queueEntry);
        }
        
        return ResponseEntity.ok(queue);
    }

    /**
     * POST /api/mediator/set-active/{patientId}
     * Marks a patient as IN_SESSION via HTTP (mirrors the WS SET_ACTIVE action).
     */
    @PostMapping("/set-active/{patientId}")
    public ResponseEntity<Map<String, String>> setActive(@PathVariable String patientId) throws Exception {
        queueService.setActivePatient(patientId);
        return ResponseEntity.ok(Map.of("message", "Patient set to IN_SESSION"));
    }

    /**
     * POST /api/mediator/restore/{patientId}
     * Returns an IN_SESSION patient back to WAITING (mirrors WS RESTORE_TO_QUEUE).
     */
    @PostMapping("/restore/{patientId}")
    public ResponseEntity<Map<String, String>> restore(@PathVariable String patientId) throws Exception {
        queueService.restorePatient(patientId);
        return ResponseEntity.ok(Map.of("message", "Patient restored to WAITING"));
    }

    /**
     * POST /api/mediator/discharge/{patientId}
     * Marks patient as COMPLETED (mirrors WS DISCHARGE).
     */
    @PostMapping("/discharge/{patientId}")
    public ResponseEntity<Map<String, String>> discharge(@PathVariable String patientId) throws Exception {
        queueService.dischargePatient(patientId);
        return ResponseEntity.ok(Map.of("message", "Patient discharged"));
    }

    @PostMapping("/check-in/{appointmentId}")
    public ResponseEntity<Map<String, String>> checkIn(@PathVariable String appointmentId) throws Exception {
        queueService.setActivePatient(appointmentId);
        return ResponseEntity.ok(Map.of("message", "Patient checked in and set to IN_SESSION"));
    }

    @PostMapping("/complete/{appointmentId}")
    public ResponseEntity<Map<String, String>> completeAppointment(@PathVariable String appointmentId) throws Exception {
        queueService.dischargePatient(appointmentId);
        return ResponseEntity.ok(Map.of("message", "Patient discharged and marked COMPLETED"));
    }

    @PostMapping("/triggerLateArrival")
    public ResponseEntity<?> triggerLateArrival(@RequestBody Map<String, Object> request) throws Exception {
        String patientId = (String) request.get("patientId");

        // Find the patient
        Optional<Patient> patientOpt = patientRepository.findById(patientId);
        if (!patientOpt.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Patient not found");
            return ResponseEntity.status(404).body(error);
        }

        Patient patient = patientOpt.get();

        // Find the finance ledger for this patient
        Optional<FinanceLedger> ledgerOpt = financeLedgerRepository.findByPatientId(patientId);
        if (!ledgerOpt.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Finance ledger not found for patient");
            return ResponseEntity.status(404).body(error);
        }

        FinanceLedger ledger = ledgerOpt.get();

        // Deduct ₹100 from credit balance
        final int LATE_CHARGE = 100;
        int currentBalance = ledger.getCreditBalance();

        if (currentBalance >= LATE_CHARGE) {
            ledger.setCreditBalance(currentBalance - LATE_CHARGE);
        } else {
            // If insufficient balance, deduct whatever is available
            ledger.setCreditBalance(0);
        }

        financeLedgerRepository.save(ledger);

        // Return success response
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Late charge deducted successfully");
        response.put("patientId", patientId);
        response.put("patientName", patient.getFullName());
        response.put("deductedAmount", LATE_CHARGE);
        response.put("newBalance", ledger.getCreditBalance());
        response.put("timestamp", LocalDate.now());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{mediatorId}/assignment")
    public ResponseEntity<?> getAssignment(@PathVariable Long mediatorId) {
        // Try direct lookup via Doctor table first (Mediator ID stored in Doctor)
        Optional<com.example.healthtech.model.Doctor> doctorOpt = doctorRepository.findByMediatorId(mediatorId);
        
        // Fallback: Check Mediator Profile specifically (Account ID -> Mediator Profile -> Doctor ID)
        if (doctorOpt.isEmpty()) {
            Optional<com.example.healthtech.model.Mediator> medOpt = mediatorRepository.findByAccountId(mediatorId);
            if (medOpt.isPresent() && medOpt.get().getDoctorId() != null) {
                doctorOpt = doctorRepository.findById(medOpt.get().getDoctorId());
            }
        }

        if (doctorOpt.isPresent()) {
            com.example.healthtech.model.Doctor d = doctorOpt.get();
            String clinic = d.getClinicName();
            if (clinic == null || clinic.trim().isEmpty()) {
                clinic = d.getClinicAddress();
            }
            if (clinic == null || clinic.trim().isEmpty()) {
                clinic = "Assigned to " + d.getName();
            }
            return ResponseEntity.ok(Map.of("assigned", true, "clinicName", clinic, "doctorName", d.getName()));
        } else {
            return ResponseEntity.ok(Map.of("assigned", false, "clinicName", "No Doctor/Clinic Appointed"));
        }
    }

    @GetMapping("/{mediatorId}/session-info")
    public ResponseEntity<?> getSessionInfo(@PathVariable Long mediatorId) {
        // Try direct lookup via Doctor table first
        Optional<com.example.healthtech.model.Doctor> doctorOpt = doctorRepository.findByMediatorId(mediatorId);
        
        // Fallback: Check Mediator Profile specifically
        if (doctorOpt.isEmpty()) {
            Optional<com.example.healthtech.model.Mediator> medOpt = mediatorRepository.findByAccountId(mediatorId);
            if (medOpt.isPresent() && medOpt.get().getDoctorId() != null) {
                doctorOpt = doctorRepository.findById(medOpt.get().getDoctorId());
            }
        }

        if (doctorOpt.isEmpty()) {
            System.out.println("[MEDIATOR_DEBUG] Returning assigned: false for mediatorId: " + mediatorId);
            return ResponseEntity.ok(Map.of("assigned", false));
        }
        com.example.healthtech.model.Doctor d = doctorOpt.get();
        System.out.println("[MEDIATOR_DEBUG] Found assigned doctor: " + d.getName() + " for mediatorId: " + mediatorId + ", startTime: " + d.getStartTime());
        Map<String, Object> info = new HashMap<>();
        info.put("assigned", true);
        info.put("doctorName", d.getName());
        info.put("doctorId", d.getId());
        info.put("clinicName", d.getClinicName() != null ? d.getClinicName() : "Clinical Facility");
        info.put("startTime", d.getStartTime() != null ? d.getStartTime().toString() : null);
        info.put("endTime", d.getEndTime() != null ? d.getEndTime().toString() : null);
        
        // Check if session is live based on current time
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalTime now = java.time.LocalTime.now();
        java.time.LocalTime start = d.getStartTime();
        
        boolean shiftStarted = Boolean.TRUE.equals(d.getShiftStarted());
        boolean withinShiftWindow = true;
        
        if (d.getLastShiftDate() == null || !today.equals(d.getLastShiftDate())) {
             shiftStarted = false;
        } else {
            if (start != null) {
                if (now.isBefore(start)) {
                    withinShiftWindow = false; // Too early, shift hasn't started yet today
                    shiftStarted = false;      // Force false until doctor explicitly starts it today
                }
                java.time.LocalTime end = d.getEndTime();
                if (end != null && now.isAfter(end)) {
                    withinShiftWindow = false;  // past official end time, but DO NOT terminate shiftStarted (allows Overtime)
                }
            }
        }
        
        info.put("isLive", withinShiftWindow);
        info.put("doctorShiftStarted", shiftStarted);
        
        return ResponseEntity.ok(info);
    }

    @GetMapping("/assigned-doctor")
    public ResponseEntity<?> getAssignedDoctor(org.springframework.security.core.Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        String username = auth.getName();
        Optional<com.example.healthtech.model.Account> accountOpt = accountRepository.findByUsername(username);
        if (accountOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        
        Long mediatorId = accountOpt.get().getId();
        Optional<com.example.healthtech.model.Doctor> doctorOpt = doctorRepository.findByMediatorId(mediatorId);
        
        if (doctorOpt.isEmpty()) {
            Optional<com.example.healthtech.model.Mediator> medOpt = mediatorRepository.findByAccountId(mediatorId);
            if (medOpt.isPresent() && medOpt.get().getDoctorId() != null) {
                doctorOpt = doctorRepository.findById(medOpt.get().getDoctorId());
            }
        }

        if (doctorOpt.isPresent()) {
            com.example.healthtech.model.Doctor d = doctorOpt.get();
            return ResponseEntity.ok(Map.of("assigned", true, "doctorName", d.getName(), "clinicName", d.getClinicName() != null ? d.getClinicName() : "Clinical Facility"));
        } else {
            return ResponseEntity.ok(Map.of("assigned", false));
        }
    }
}
