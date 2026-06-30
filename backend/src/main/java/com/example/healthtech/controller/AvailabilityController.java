package com.example.healthtech.controller;

import com.example.healthtech.model.Availability;
import com.example.healthtech.repository.jpa.AvailabilityRepository;
import com.example.healthtech.repository.mongodb.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Collections;

@RestController
@RequestMapping("/api/availability")
public class AvailabilityController {

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private void deleteAppointmentsOnClinicClose(Long doctorId, LocalDate date) {
        System.out.println("[AvailabilityController] Clinic closed on date " + date + " for Doctor " + doctorId + ". Deleting all appointments.");
        try {
            List<com.example.healthtech.model.Appointment> appts = appointmentRepository.findByDoctorIdAndDate(doctorId, date);
            if (appts != null && !appts.isEmpty()) {
                appointmentRepository.deleteAll(appts);
                System.out.println("[AvailabilityController] Deleted " + appts.size() + " MongoDB appointments for Doctor " + doctorId + " on " + date);
            }
        } catch (Exception e) {
            System.err.println("Error deleting MongoDB appointments on clinic close: " + e.getMessage());
        }
        try {
            jdbcTemplate.update("DELETE FROM appointment WHERE doctor_id = ? AND date = ?", doctorId, date.toString());
            System.out.println("[AvailabilityController] Deleted SQL appointments for Doctor " + doctorId + " on " + date);
        } catch (Exception e) {
            System.err.println("Error deleting SQL appointments on clinic close: " + e.getMessage());
        }
    }

    @GetMapping
    public List<Availability> getAll() {
        List<Availability> all = availabilityRepository.findAll();
        List<com.example.healthtech.model.Appointment> allAppointments = appointmentRepository.findAll();
        
        java.util.Map<String, Long> premCounts = new java.util.HashMap<>();
        java.util.Map<String, Long> stdCounts = new java.util.HashMap<>();
        
        if (allAppointments != null) {
            for (com.example.healthtech.model.Appointment appt : allAppointments) {
                if (appt.getDoctorId() == null || appt.getDate() == null) continue;
                if ("CANCELED".equalsIgnoreCase(appt.getStatus()) || "CANCELLED".equalsIgnoreCase(appt.getStatus()) || "DISCHARGED".equalsIgnoreCase(appt.getStatus())) continue;
                
                String key = appt.getDoctorId() + "_" + appt.getDate().toString();
                if (Boolean.TRUE.equals(appt.getIsPremium())) {
                    premCounts.put(key, premCounts.getOrDefault(key, 0L) + 1);
                } else {
                    stdCounts.put(key, stdCounts.getOrDefault(key, 0L) + 1);
                }
            }
        }
        
        for (Availability a : all) {
            Long docId = a.getDoctorId();
            LocalDate d = a.getDate();
            if (docId == null || d == null) continue;
            
            String key = docId + "_" + d.toString();
            long premiumCount = premCounts.getOrDefault(key, 0L);
            long standardCount = stdCounts.getOrDefault(key, 0L);
            long totalCount = premiumCount + standardCount;
            
            a.setBookedCount((int) totalCount);
            a.setPremiumCount((int) premiumCount);
            a.setStandardCount((int) standardCount);
        }
        return all;
    }

    @GetMapping("/{doctorId}")
    public List<Availability> getByDoctorDirect(@PathVariable Long doctorId) {
        List<Availability> all = new java.util.ArrayList<>(availabilityRepository.findByDoctorId(doctorId));
        if (all.isEmpty()) {
            org.springframework.context.ApplicationContext ctx = com.example.healthtech.HealthTechApplication.getContext();
            if (ctx != null) {
                try {
                    com.example.healthtech.repository.jpa.DoctorRepository docRepo = ctx.getBean(com.example.healthtech.repository.jpa.DoctorRepository.class);
                    java.util.Optional<com.example.healthtech.model.Doctor> docByAcc = docRepo.findByAccountId(doctorId);
                    if (docByAcc.isPresent()) {
                        all = new java.util.ArrayList<>(availabilityRepository.findByDoctorId(docByAcc.get().getId()));
                    }
                } catch (Exception e) {}
            }
        }
        if (!all.isEmpty()) {
            all.sort((a, b) -> b.getDate().compareTo(a.getDate()));
        }
        return all;
    }

    @GetMapping("/doctor/{doctorId}")
    public List<Availability> getByDoctor(@PathVariable Long doctorId) {
        // Log Entry 2: Auditing availability query for April 30th visibility
        System.out.println("[AVAILABILITY] Querying slots for Doctor ID: " + doctorId);
        java.util.List<Availability> combined = new java.util.ArrayList<>();
        
        org.springframework.context.ApplicationContext ctx = com.example.healthtech.HealthTechApplication.getContext();
        if (ctx != null) {
            try {
                com.example.healthtech.repository.jpa.DoctorRepository docRepo = ctx.getBean(com.example.healthtech.repository.jpa.DoctorRepository.class);
                
                Long actualDocId = null;
                Long actualAccountId = null;
                
                java.util.Optional<com.example.healthtech.model.Doctor> docById = docRepo.findById(doctorId);
                if (docById.isPresent()) {
                    actualDocId = docById.get().getId();
                    if (docById.get().getAccount() != null) {
                        actualAccountId = docById.get().getAccount().getId();
                    }
                }
                
                // Also check if it's an Account ID
                java.util.Optional<com.example.healthtech.model.Doctor> docByAcc = docRepo.findByAccountId(doctorId);
                if (docByAcc.isPresent()) {
                    if (actualDocId == null) {
                        actualDocId = docByAcc.get().getId();
                    }
                    actualAccountId = doctorId;
                }
                
                // Fetch for Doctor ID (as PK)
                combined.addAll(availabilityRepository.findByDoctorId(doctorId));
                
                // Fetch for resolved actualDocId if different
                if (actualDocId != null && !actualDocId.equals(doctorId)) {
                    java.util.List<Availability> docAvail = availabilityRepository.findByDoctorId(actualDocId);
                    for (Availability a : docAvail) {
                        if (combined.stream().noneMatch(existing -> existing.getDate().equals(a.getDate()))) {
                            combined.add(a);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error resolving doctor ID: " + e.getMessage());
            }
        }
        
        // Final deduplication before return
        java.util.Map<LocalDate, Availability> uniqueMap = new java.util.HashMap<>();
        combined.forEach(a -> uniqueMap.put(a.getDate(), a));
        combined = new java.util.ArrayList<>(uniqueMap.values());
        
        // Fallback: If still nothing found, just try the raw ID passed
        if (combined.isEmpty()) {
            combined.addAll(availabilityRepository.findByDoctorId(doctorId));
        }

        // FINAL FILTER: Only return current or future availability to the client
        LocalDate today = LocalDate.now();
        List<Availability> currentOrFuture = combined.stream()
            .filter(a -> a.getDate().isEqual(today) || a.getDate().isAfter(today))
            .collect(java.util.stream.Collectors.toList());
            
        // Fetch all appointments for this doctor to avoid N+1 queries
        Long queryDocId = (ctx != null && combined.size() > 0 && combined.get(0).getDoctorId() != null) 
            ? combined.get(0).getDoctorId() 
            : doctorId;
            
        List<com.example.healthtech.model.Appointment> docAppointments = appointmentRepository.findByDoctorId(queryDocId);
        
        java.util.Map<LocalDate, Long> premCounts = new java.util.HashMap<>();
        java.util.Map<LocalDate, Long> stdCounts = new java.util.HashMap<>();
        
        if (docAppointments != null) {
            for (com.example.healthtech.model.Appointment appt : docAppointments) {
                if (appt.getDate() == null || appt.getDate().isBefore(today)) continue;
                // Exclude cancelled/discharged from taking up capacity
                if ("CANCELED".equalsIgnoreCase(appt.getStatus()) || "CANCELLED".equalsIgnoreCase(appt.getStatus()) || "DISCHARGED".equalsIgnoreCase(appt.getStatus())) continue;
                
                if (Boolean.TRUE.equals(appt.getIsPremium())) {
                    premCounts.put(appt.getDate(), premCounts.getOrDefault(appt.getDate(), 0L) + 1);
                } else {
                    stdCounts.put(appt.getDate(), stdCounts.getOrDefault(appt.getDate(), 0L) + 1);
                }
            }
        }
        
        for (Availability a : currentOrFuture) {
            LocalDate d = a.getDate();
            if (d == null) continue;
            
            long premiumCount = premCounts.getOrDefault(d, 0L);
            long standardCount = stdCounts.getOrDefault(d, 0L);
            long totalCount = premiumCount + standardCount;
            
            a.setBookedCount((int) totalCount);
            a.setPremiumCount((int) premiumCount);
            a.setStandardCount((int) standardCount);
        }
        
        return currentOrFuture;
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<?> save(@RequestBody Availability availability) {
        if (availability == null) {
            System.err.println("[AvailabilityController] SAVE FAILED: Payload is null");
            return org.springframework.http.ResponseEntity.badRequest().body("Payload is empty");
        }
        if (availability.getDate() == null) {
            System.err.println("[AvailabilityController] SAVE FAILED: Date is missing in payload");
            return org.springframework.http.ResponseEntity.badRequest().body("Clinical date is missing");
        }

        System.out.println("[AvailabilityController] SAVE for DoctorID: " + availability.getDoctorId() + " on date: " + availability.getDate());
        
        // SECURITY: Block saving availability for past dates
        if (availability.getDate().isBefore(LocalDate.now())) {
            return org.springframework.http.ResponseEntity.badRequest().body("Cannot set clinical availability for a past date: " + availability.getDate());
        }
        
        try {
            // ID Resolution: Resolve Account ID to Doctor ID if necessary
            Long doctorId = availability.getDoctorId();
            if (doctorId == null) {
                return org.springframework.http.ResponseEntity.badRequest().body("Doctor Identity (ID) is missing");
            }

            org.springframework.context.ApplicationContext ctx = com.example.healthtech.HealthTechApplication.getContext();
            
            if (ctx != null) {
                com.example.healthtech.repository.jpa.DoctorRepository docRepo = ctx.getBean(com.example.healthtech.repository.jpa.DoctorRepository.class);
                
                // Prioritize Account ID resolution first to prevent ID collision
                java.util.Optional<com.example.healthtech.model.Doctor> resolved = docRepo.findByAccountId(doctorId);
                if (resolved.isPresent()) {
                    System.out.println("[AvailabilityController] Resolved Account ID " + doctorId + " to Doctor PK " + resolved.get().getId());
                    availability.setDoctorId(resolved.get().getId());
                    doctorId = availability.getDoctorId();
                } else {
                    boolean exists = false;
                    try {
                        exists = docRepo.existsById(doctorId);
                    } catch (Exception e) {
                        System.err.println("DB Error checking doctor existence: " + e.getMessage());
                    }

                    if (!exists) {
                        // CRITICAL: If still not resolved, check if this is an Account ID that needs a Doctor profile
                        com.example.healthtech.repository.jpa.AccountRepository accRepo = ctx.getBean(com.example.healthtech.repository.jpa.AccountRepository.class);
                        java.util.Optional<com.example.healthtech.model.Account> acc = accRepo.findById(doctorId);
                        if (acc.isPresent() && com.example.healthtech.config.AppConstants.ROLE_DOCTOR.equals(acc.get().getRole())) {
                             System.out.println("[AvailabilityController] Self-healing missing doctor profile for account: " + doctorId);
                             com.example.healthtech.model.Doctor newDoc = new com.example.healthtech.model.Doctor();
                             newDoc.setAccount(acc.get());
                             newDoc.setName(acc.get().getFullName());
                             newDoc.setSpeciality("General Medicine");
                             newDoc = docRepo.save(newDoc);
                             availability.setDoctorId(newDoc.getId());
                             doctorId = availability.getDoctorId();
                        } else {
                             // Self-healing: Insert placeholder doctor record in database via JDBC to prevent foreign key violation
                             System.out.println("[AvailabilityController] Self-healing missing Doctor PK " + doctorId + " via JDBC to prevent foreign key constraint violation");
                             try {
                                 jdbcTemplate.update("INSERT INTO doctor (id, name, speciality, shift_started, total_revenue) VALUES (?, ?, ?, ?, ?)",
                                     doctorId, "Physician " + doctorId, "General Medicine", false, 0.0);
                             } catch (Exception docEx) {
                                 System.err.println("Failed to insert placeholder doctor via JDBC: " + docEx.getMessage());
                             }
                        }
                    }
                }
            }

            // Default patientCapacity to sum of standard and premium capacity if not provided
            int prem = availability.getPremiumCapacity() != null ? availability.getPremiumCapacity() : 0;
            int std = availability.getStandardCapacity() != null ? availability.getStandardCapacity() : 0;
            if (availability.getPatientCapacity() == null) {
                availability.setPatientCapacity(prem + std);
            }

            // Clinical Sync: Avoid duplicates for same doctor on same date (List-based to avoid NonUniqueResultException)
            List<Availability> allAvail = availabilityRepository.findByDoctorId(doctorId);
            java.util.Optional<Availability> match = allAvail.stream()
                .filter(a -> a.getDate() != null && a.getDate().equals(availability.getDate()))
                .findFirst();

            Availability saved;
            if (match.isPresent()) {
                Availability updated = match.get();
                updated.setStartTime(availability.getStartTime());
                updated.setEndTime(availability.getEndTime());
                updated.setClosed(availability.isClosed());
                updated.setPatientCapacity(availability.getPatientCapacity());
                updated.setPremiumCapacity(availability.getPremiumCapacity());
                updated.setStandardCapacity(availability.getStandardCapacity());
                saved = availabilityRepository.save(updated);
            } else {
                saved = availabilityRepository.save(availability);
            }

            if (saved.isClosed()) {
                deleteAppointmentsOnClinicClose(saved.getDoctorId(), saved.getDate());
            }
            return org.springframework.http.ResponseEntity.ok(saved);
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            String stackTrace = sw.toString();
            System.err.println("[AvailabilityController] FATAL SAVE ERROR:\n" + stackTrace);
            return org.springframework.http.ResponseEntity.status(500).body("Internal Clinical Sync Error: " + e.toString() + "\n" + stackTrace);
        }
    }

    @PostMapping("/bulk")
    public org.springframework.http.ResponseEntity<?> saveBulk(@RequestBody List<Availability> availabilities) {
        System.out.println("[AvailabilityController] BULK SAVE triggered for " + availabilities.size() + " entries");
        List<Availability> results = new ArrayList<>();
        for (Availability a : availabilities) {
            org.springframework.http.ResponseEntity<?> resp = save(a);
            if (resp.getStatusCode().is2xxSuccessful()) {
                results.add((Availability) resp.getBody());
            }
        }
        return org.springframework.http.ResponseEntity.ok(results);
    }
}
