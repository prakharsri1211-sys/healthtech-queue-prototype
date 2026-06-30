package com.example.healthtech.controller;

import com.example.healthtech.model.Appointment;
import com.example.healthtech.model.Patient;
import com.example.healthtech.service.AppointmentService;
import com.example.healthtech.repository.mongodb.PatientRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/patient")
public class PatientController {
    private final PatientRepository patientRepository;
    private final AppointmentService appointmentService;

    public PatientController(PatientRepository patientRepository, AppointmentService appointmentService) {
        this.patientRepository = patientRepository;
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<?> createPatient(@RequestBody Patient p) {
        System.out.println("[PATIENT] Clinical verification for Aadhar: " + p.getAadharOrAbhaId());
        
        if (p.getAge() <= 0) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "Missing Age",
                "message", "Age is required."
            ));
        }

        boolean hasAadhar = p.getAadharOrAbhaId() != null && !p.getAadharOrAbhaId().trim().isEmpty() && "AADHAR".equalsIgnoreCase(p.getIdentityType());
        boolean hasAbha = p.getAadharOrAbhaId() != null && !p.getAadharOrAbhaId().trim().isEmpty() && "ABHA".equalsIgnoreCase(p.getIdentityType());
        boolean hasUdid = p.getUdidCardNumber() != null && !p.getUdidCardNumber().trim().isEmpty();

        if (!hasAadhar && !hasAbha && !hasUdid) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "Missing Identity",
                "message", "Aadhar, ABHA, or UDID Card number is required."
            ));
        }

        if (hasAbha && p.getAadharOrAbhaId().trim().length() != 14) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "Invalid ABHA",
                "message", "ABHA Card number must be exactly 14 characters/digits."
            ));
        }

        if (hasUdid && p.getUdidCardNumber().trim().length() != 18) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "Invalid UDID",
                "message", "UDID Card number must be exactly 18 characters/digits."
            ));
        }

        if (p.getAadharOrAbhaId() != null && !p.getAadharOrAbhaId().trim().isEmpty()) {
            java.util.Optional<Patient> existing = patientRepository.findByIdentity(p.getAadharOrAbhaId().trim());
            if (existing.isPresent()) {
                System.out.println("[PATIENT] Duplicate detected. Rejecting registration for identity " + p.getAadharOrAbhaId());
                return ResponseEntity.status(409).body(java.util.Map.of(
                    "error", "Duplicate Identity",
                    "message", "A patient with this identity number is already registered."
                ));
            }
        }
        

        
        return ResponseEntity.ok(patientRepository.save(p));
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<Patient>> getByAccount(@PathVariable Long accountId) {
        return ResponseEntity.ok(patientRepository.findByAccountId(accountId));
    }

    @GetMapping
    public ResponseEntity<List<Patient>> list() {
        return ResponseEntity.ok(patientRepository.findAll());
    }

    @PutMapping("/{patientId}")
    public ResponseEntity<Patient> updatePatient(@PathVariable String patientId, @RequestBody Patient updated) {
        return patientRepository.findById(patientId).map(existing -> {
            System.out.println("[PATIENT] Updating profile: " + patientId + " - New Age: " + updated.getAge());
            existing.setName(updated.getName());
            existing.setAge(updated.getAge());
            existing.setAadharOrAbhaId(updated.getAadharOrAbhaId());
            existing.setIdentityType(updated.getIdentityType());
            existing.setUdidCardNumber(updated.getUdidCardNumber());
            existing.setGender(updated.getGender());
            
            Patient saved = patientRepository.save(existing);
            
            // Log Entry 1: Confirmed save at this line
            if (saved.getAge() != updated.getAge()) {
                System.err.println("[PATIENT] CRITICAL: Age persistence failure for " + patientId);
                return ResponseEntity.status(500).body(saved);
            }
            
            System.out.println("[PATIENT] Persistence verified: " + saved.getId() + " age is now " + saved.getAge());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{patientId}")
    public ResponseEntity<Void> deletePatient(@PathVariable String patientId) {
        if (patientRepository.existsById(patientId)) {
            patientRepository.deleteById(patientId);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{patientId}/appointments")
    public ResponseEntity<Appointment> schedule(@PathVariable String patientId, 
            @RequestParam Long doctorId,
            @RequestParam String date, 
            @RequestParam String timeSlot, 
            @RequestParam(required = false) Boolean premium,
            @RequestParam(required = false) Integer tokenNumber,
            @RequestParam(required = false) String accessType) {
        if (accessType == null) {
            accessType = (premium != null && premium) ? "PREMIUM" : "STANDARD";
        }
        Appointment a = appointmentService.scheduleAppointment(patientId, doctorId, LocalDate.parse(date), timeSlot,
                premium, tokenNumber, accessType, null, null);
        return ResponseEntity.ok(a);
    }
}
