package com.example.healthtech.controller;

import com.example.healthtech.model.Account;
import com.example.healthtech.model.Doctor;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.repository.jpa.DoctorRepository;
import com.example.healthtech.config.DashboardWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/doctor")
public class DoctorDetailsController {
    private final DoctorRepository doctorRepository;
    private final AccountRepository accountRepository;
    private final com.example.healthtech.repository.jpa.MediatorRepository mediatorRepository;
    private final DashboardWebSocketHandler webSocketHandler;

    public DoctorDetailsController(DoctorRepository doctorRepository, 
                                   AccountRepository accountRepository, 
                                   com.example.healthtech.repository.jpa.MediatorRepository mediatorRepository,
                                   DashboardWebSocketHandler webSocketHandler) {
        this.doctorRepository = doctorRepository;
        this.accountRepository = accountRepository;
        this.mediatorRepository = mediatorRepository;
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping("/{doctorId}")
    public ResponseEntity<?> getDoctorById(@PathVariable Long doctorId) {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(doctorOpt.get());
    }

    @GetMapping("/{doctorId}/clinic-details")
    public ResponseEntity<Map<String, Object>> getClinicDetails(@PathVariable Long doctorId) {
        Optional<Doctor> doctor = doctorRepository.findById(doctorId);
        
        // ID Resolution: Handle Account ID if Doctor ID not found directly
        if (doctor.isEmpty()) {
            doctor = doctorRepository.findByAccountId(doctorId);
        }

        if (doctor.isEmpty()) {
            // Check if account exists to return skeleton data for onboarding
            Optional<Account> account = accountRepository.findById(doctorId);
            if (account.isPresent()) {
                Map<String, Object> skeleton = new HashMap<>();
                skeleton.put("doctorName", account.get().getFullName() != null ? account.get().getFullName() : account.get().getUsername());
                return ResponseEntity.ok(skeleton);
            }
            return ResponseEntity.notFound().build();
        }

        Doctor d = doctor.get();
        Map<String, Object> details = new HashMap<>();
        details.put("doctorName", d.getName() != null ? d.getName() : "Unknown Doctor");
        details.put("speciality", d.getSpeciality() != null ? d.getSpeciality() : "General");
        details.put("qualification", d.getQualification() != null ? d.getQualification() : "");
        details.put("clinicAddress", d.getClinicAddress() != null ? d.getClinicAddress() : "Address not configured");
        details.put("pincode", d.getPincode() != null ? d.getPincode() : "");
        details.put("pharmacy", Boolean.TRUE.equals(d.getPharmacyAvailable()) ? "Yes" : "No");
        details.put("wheelchairAccess", Boolean.TRUE.equals(d.getWheelchairAccessible()));
        details.put("stretcherAvailable", Boolean.TRUE.equals(d.getStretcherAvailable()));
        // Guard against null times — doctor may not have set schedule yet
        details.put("startTime", d.getStartTime() != null ? d.getStartTime().toString() : null);
        details.put("endTime", d.getEndTime() != null ? d.getEndTime().toString() : null);
        details.put("breakStartTime", d.getBreakStartTime() != null ? d.getBreakStartTime().toString() : null);
        details.put("breakEndTime", d.getBreakEndTime() != null ? d.getBreakEndTime().toString() : null);
        details.put("maxPatientsPerDay", d.getMaxPatientsPerDay() != null ? d.getMaxPatientsPerDay() : 20);
        details.put("genderPreference", d.getGenderPreference() != null ? d.getGenderPreference() : "Any");
        details.put("targetAgeRange", d.getTargetAgeRange() != null ? d.getTargetAgeRange().toString() : "All Ages");
        details.put("mediatorId", d.getMediatorId());
        // Dynamically evaluate shiftStarted to handle stale "true" values from yesterday
        boolean shiftStarted = Boolean.TRUE.equals(d.getShiftStarted());
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalTime now = java.time.LocalTime.now();
        java.time.LocalTime start = d.getStartTime();
        java.time.LocalTime end = d.getEndTime();
        
        if (d.getLastShiftDate() == null || !today.equals(d.getLastShiftDate())) {
            shiftStarted = false;
        } else {
            if (start != null && now.isBefore(start)) {
                shiftStarted = false;
            }
            if (end != null && now.isAfter(end)) {
                shiftStarted = false;
            }
        }
        details.put("shiftStarted", shiftStarted);

        return ResponseEntity.ok(details);
    }

    @PostMapping("/{doctorId}/hire-mediator")
    public ResponseEntity<?> hireMediator(@PathVariable Long doctorId, @RequestBody Map<String, String> body) {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId);
        
        // ID Resolution: Handle Account ID if Doctor ID not found directly
        if (doctorOpt.isEmpty()) {
            doctorOpt = doctorRepository.findByAccountId(doctorId);
        }
        
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        Doctor d = doctorOpt.get();

        String username = body.get("username");
        Optional<Account> mediatorAccount = accountRepository.findByUsername(username);
        
        if (mediatorAccount.isEmpty() || !com.example.healthtech.config.AppConstants.ROLE_MEDIATOR.equals(mediatorAccount.get().getRole())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mediator username not found or invalid role"));
        }
        
        Account medAcct = mediatorAccount.get();
        Optional<com.example.healthtech.model.Mediator> mediatorOpt = mediatorRepository.findByAccountId(medAcct.getId());
        if (mediatorOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Mediator profile not found"));
        com.example.healthtech.model.Mediator m = mediatorOpt.get();

        // Constraint 4: Mediator1 Preservation
        if ("mediator1".equals(medAcct.getUsername())) {
             if (d.getId() != 1L) {
                 throw new com.example.healthtech.exception.StaffAlreadyAssignedException("Critical Error: 'mediator1' is permanently bonded to 'doctor1' (Vikram Malhotra). Attempt to poach failed.");
             }
        }

        // Constraint 5: Exclusivity Checks
        if (d.getMediatorId() != null && !d.getMediatorId().equals(medAcct.getId())) {
            throw new com.example.healthtech.exception.StaffAlreadyAssignedException("Doctor already has a hired mediator. Terminate current link first.");
        }
        
        if (m.getDoctorId() != null && !m.getDoctorId().equals(doctorId)) {
             throw new com.example.healthtech.exception.StaffAlreadyAssignedException("Mediator is already hired by another doctor. Handshake rejected.");
        }

        // Apply Hardcoded Link
        d.setMediatorId(medAcct.getId());
        doctorRepository.save(d);

        m.setDoctorId(d.getId());
        m.setClinic(d.getClinicName() != null ? d.getClinicName() : "Clinic " + d.getName());
        mediatorRepository.save(m);

        return ResponseEntity.ok(Map.of("message", "Mediator " + username + " hired successfully", "mediatorName", medAcct.getFullName()));
    }

    @PostMapping("/{doctorId}/hire-mediator-by-token")
    public ResponseEntity<?> hireMediatorByToken(@PathVariable Long doctorId, @RequestBody Map<String, String> body) {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId);
        if (doctorOpt.isEmpty()) doctorOpt = doctorRepository.findByAccountId(doctorId);
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        Doctor d = doctorOpt.get();

        String token = body.get("identityToken");
        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identity token is required"));
        }

        Optional<Account> mediatorAccount = accountRepository.findByIdentityToken(token.trim());
        if (mediatorAccount.isEmpty() || !com.example.healthtech.config.AppConstants.ROLE_MEDIATOR.equals(mediatorAccount.get().getRole())) {
            return ResponseEntity.badRequest().body(Map.of("error", "No mediator found with this identity token"));
        }

        Account medAcct = mediatorAccount.get();
        Optional<com.example.healthtech.model.Mediator> mediatorOpt = mediatorRepository.findByAccountId(medAcct.getId());
        if (mediatorOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Mediator profile not found"));
        com.example.healthtech.model.Mediator m = mediatorOpt.get();

        // Exclusivity checks
        if (d.getMediatorId() != null && !d.getMediatorId().equals(medAcct.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Doctor already has a hired mediator. Terminate current link first."));
        }
        if (m.getDoctorId() != null && !m.getDoctorId().equals(d.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mediator is already hired by another doctor."));
        }

        d.setMediatorId(medAcct.getId());
        doctorRepository.save(d);
        m.setDoctorId(d.getId());
        m.setClinic(d.getClinicName() != null ? d.getClinicName() : "Clinic " + d.getName());
        mediatorRepository.save(m);

        return ResponseEntity.ok(Map.of(
            "message", "Mediator " + medAcct.getUsername() + " hired successfully via identity token",
            "mediatorName", medAcct.getFullName() != null ? medAcct.getFullName() : medAcct.getUsername(),
            "username", medAcct.getUsername()
        ));
    }

    @GetMapping("/{doctorId}/hired-mediator")
    public ResponseEntity<?> getHiredMediator(@PathVariable Long doctorId) {
        Optional<Doctor> doctor = doctorRepository.findById(doctorId);
        
        // ID Resolution: Handle Account ID if Doctor ID not found directly
        if (doctor.isEmpty()) {
            doctor = doctorRepository.findByAccountId(doctorId);
        }

        if (doctor.isEmpty() || doctor.get().getMediatorId() == null) return ResponseEntity.ok(Map.of("assigned", false));

        Optional<Account> medAccount = accountRepository.findById(doctor.get().getMediatorId());
        if (medAccount.isEmpty()) return ResponseEntity.ok(Map.of("assigned", false));

        return ResponseEntity.ok(Map.of(
            "assigned", true,
            "id", medAccount.get().getId(),
            "username", medAccount.get().getUsername(),
            "fullName", medAccount.get().getFullName()
        ));
    }

    @PostMapping("/{doctorId}/start-shift")
    public ResponseEntity<?> startShift(@PathVariable Long doctorId) {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        Doctor d = doctorOpt.get();
        d.setShiftStarted(true);
        d.setLastShiftDate(java.time.LocalDate.now());
        doctorRepository.save(d);

        // Broadcast shift start via WebSocket to sync all connected mediators/trackers immediately
        try {
            String eventJson = String.format(
                "{\"type\":\"SHIFT_STARTED\",\"doctorId\":%d,\"doctorName\":\"%s\",\"timestamp\":\"%s\"}",
                d.getId(),
                d.getName() != null ? d.getName().replace("\"", "\\\"") : "Doctor",
                java.time.LocalDateTime.now().toString()
            );
            webSocketHandler.broadcast(eventJson);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Shift started successfully", "shiftStarted", true));
    }

    @PostMapping("/{doctorId}/end-shift")
    public ResponseEntity<?> endShift(@PathVariable Long doctorId) {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        Doctor d = doctorOpt.get();
        d.setShiftStarted(false);
        doctorRepository.save(d);
        return ResponseEntity.ok(Map.of("message", "Shift ended successfully", "shiftStarted", false));
    }

    @PostMapping("/{doctorId}/clinical-preferences")
    public ResponseEntity<String> updatePreferences(@PathVariable Long doctorId, @RequestBody Map<String, String> body) {
        Optional<Doctor> doctor = doctorRepository.findById(doctorId);
        if (doctor.isEmpty()) return ResponseEntity.notFound().build();
        
        Doctor d = doctor.get();
        // speciality removed as per Mission 1 Preference Cleanup
        if (body.containsKey("genderPreference")) d.setGenderPreference(body.get("genderPreference"));
        if (body.containsKey("targetAgeRange")) {
            try {
                d.setTargetAgeRange(Doctor.TargetAgeRange.valueOf(body.get("targetAgeRange").toUpperCase()));
            } catch (Exception e) {
                // If it's a generic string like "All Ages", handle it or just ignore if it doesn't match enum
            }
        }
        doctorRepository.save(d);
        return ResponseEntity.ok("Preferences updated");
    }

    @PutMapping("/{doctorId}/operating-hours")
    public ResponseEntity<?> updateOperatingHours(@PathVariable Long doctorId, @RequestBody Map<String, String> body) throws Exception {
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
        if (doctorOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        Doctor d = doctorOpt.get();
        if (body.containsKey("startTime") && body.get("startTime") != null && !body.get("startTime").isEmpty()) {
            d.setStartTime(java.time.LocalTime.parse(body.get("startTime")));
        }
        if (body.containsKey("endTime") && body.get("endTime") != null && !body.get("endTime").isEmpty()) {
            d.setEndTime(java.time.LocalTime.parse(body.get("endTime")));
        }
        if (body.containsKey("breakStartTime") && body.get("breakStartTime") != null && !body.get("breakStartTime").isEmpty()) {
            d.setBreakStartTime(java.time.LocalTime.parse(body.get("breakStartTime")));
        } else if (body.containsKey("breakStartTime") && (body.get("breakStartTime") == null || body.get("breakStartTime").isEmpty())) {
            d.setBreakStartTime(null);
        }
        if (body.containsKey("breakEndTime") && body.get("breakEndTime") != null && !body.get("breakEndTime").isEmpty()) {
            d.setBreakEndTime(java.time.LocalTime.parse(body.get("breakEndTime")));
        } else if (body.containsKey("breakEndTime") && (body.get("breakEndTime") == null || body.get("breakEndTime").isEmpty())) {
            d.setBreakEndTime(null);
        }
        doctorRepository.save(d);
        return ResponseEntity.ok(Map.of("message", "Operating hours updated successfully"));
    }
}
