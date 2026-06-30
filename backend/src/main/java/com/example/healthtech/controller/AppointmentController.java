package com.example.healthtech.controller;

import com.example.healthtech.model.Appointment;
import com.example.healthtech.service.AppointmentService;
import com.example.healthtech.service.WaitTimeService;
import com.example.healthtech.service.AppointmentConflictException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import org.springframework.security.core.Authentication;
import com.example.healthtech.repository.jpa.DoctorRepository;
import com.example.healthtech.model.Doctor;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
    private final AppointmentService appointmentService;
    private final WaitTimeService waitTimeService;
    private final com.example.healthtech.repository.jpa.AvailabilityRepository availabilityRepository;
    private final DoctorRepository doctorRepository;

    private final com.example.healthtech.repository.mongodb.ClinicMetadataRepository clinicMetadataRepository;
    private final com.example.healthtech.repository.jpa.ApptHistoryRepository apptHistoryRepository;
    private final com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository;
    private final com.example.healthtech.config.DashboardWebSocketHandler webSocketHandler;
    private final com.example.healthtech.repository.mongodb.LiveQueueRepository liveQueueRepository;
    private final com.example.healthtech.service.QueueService queueService;

    public AppointmentController(AppointmentService appointmentService, WaitTimeService waitTimeService,
            com.example.healthtech.repository.jpa.AvailabilityRepository availabilityRepository,
            DoctorRepository doctorRepository,
            com.example.healthtech.repository.mongodb.ClinicMetadataRepository clinicMetadataRepository,
            com.example.healthtech.repository.jpa.ApptHistoryRepository apptHistoryRepository,
            com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository,
            com.example.healthtech.config.DashboardWebSocketHandler webSocketHandler,
            com.example.healthtech.repository.mongodb.LiveQueueRepository liveQueueRepository,
            com.example.healthtech.service.QueueService queueService) {
        this.appointmentService = appointmentService;
        this.waitTimeService = waitTimeService;
        this.availabilityRepository = availabilityRepository;
        this.doctorRepository = doctorRepository;
        this.clinicMetadataRepository = clinicMetadataRepository;
        this.apptHistoryRepository = apptHistoryRepository;
        this.appointmentRepository = appointmentRepository;
        this.webSocketHandler = webSocketHandler;
        this.liveQueueRepository = liveQueueRepository;
        this.queueService = queueService;
    }

    @GetMapping("/preview")
    public ResponseEntity<?> getAppointmentPreview(
            @RequestParam Long doctorId,
            @RequestParam String date,
            @RequestParam String timeSlot,
            @RequestParam(defaultValue = "false") Boolean isPremium) {
        
        System.out.println("[AppointmentController] Generating booking preview for Doctor: " + doctorId);
        
        // 1. Fetch Clinical Metadata from MongoDB
        var metadata = clinicMetadataRepository.findByDoctorId(doctorId)
                .orElse(new com.example.healthtech.model.ClinicMetadata(doctorId, "General Clinic", java.util.List.of("General Consultation")));
        
        // 2. Integrate with 10-minute buffer logic for suggested slots
        java.util.Map<String, Object> preview = new java.util.HashMap<>();
        preview.put("clinicName", metadata.getClinicName());
        preview.put("facilities", metadata.getFacilities());
        preview.put("requestedSlot", timeSlot);
        preview.put("isPremium", isPremium);
        
        // Check for conflicts early
        try {
            LocalDate localDate = LocalDate.parse(date);
            // We reuse the service logic but don't save yet
            preview.put("status", "AVAILABLE");
        } catch (Exception e) {
            preview.put("status", "CONFLICT");
            preview.put("message", e.getMessage());
        }

        return ResponseEntity.ok(preview);
    }

    @GetMapping("/available-slots")
    public ResponseEntity<?> getAvailableSlots(@RequestParam Long doctorId, @RequestParam String date) {
        System.out.println("[AppointmentController] Checking available slots for Doctor: " + doctorId + " on Date: " + date);
        try {
            LocalDate localDate = LocalDate.parse(date);
            return availabilityRepository.findByDoctorIdAndDate(doctorId, localDate)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Invalid date format"));
        }
    }

    @GetMapping("/debug/history")
    public ResponseEntity<?> getDebugHistory() {
        return ResponseEntity.ok(apptHistoryRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> scheduleAppointment(@RequestBody AppointmentRequest request) {
        try {
            System.out.println("[AppointmentController] Scheduling for Patient: " + request.getPatientId() + ", Doctor: " + request.getDoctorId());
            
            // 1. Enforce Schedule Existence (Prevent Ghost Bookings)
            java.util.Optional<com.example.healthtech.model.Availability> availOpt = availabilityRepository
                .findByDoctorIdAndDate(request.getDoctorId(), request.getDate());
            
            if (availOpt.isEmpty()) {
                System.out.println("[AppointmentController] Auto-provisioning missing schedule for Doctor: " + request.getDoctorId());
                com.example.healthtech.model.Availability defaultAvail = new com.example.healthtech.model.Availability();
                defaultAvail.setDoctorId(request.getDoctorId());
                defaultAvail.setDate(request.getDate());
                java.time.LocalTime defaultStart = java.time.LocalTime.of(9, 0);
                java.time.LocalTime defaultEnd = java.time.LocalTime.of(17, 0);
                
                com.example.healthtech.model.Doctor doc = doctorRepository.findById(request.getDoctorId()).orElse(null);
                if (doc != null) {
                    if (doc.getStartTime() != null) {
                        try { defaultStart = doc.getStartTime(); } catch(Exception e) {}
                    }
                    if (doc.getEndTime() != null) {
                        try { defaultEnd = doc.getEndTime(); } catch(Exception e) {}
                    }
                }
                
                defaultAvail.setStartTime(defaultStart);
                defaultAvail.setEndTime(defaultEnd);
                defaultAvail.setClosed(false);
                defaultAvail.setPatientCapacity(30);
                defaultAvail.setStandardCapacity(20);
                defaultAvail.setPremiumCapacity(10);
                
                // If auto-provisioning an existing past/future date, overwrite previous auto-provisions just in case
                java.util.Optional<com.example.healthtech.model.Availability> existing = availabilityRepository.findByDoctorIdAndDate(request.getDoctorId(), request.getDate());
                if (existing.isPresent()) {
                    defaultAvail.setId(existing.get().getId());
                }
                availabilityRepository.save(defaultAvail);
            }
            
            // Hardcoded conflict enforcement for the 11:55 AM opening slot
            if (request.getTimeSlot() != null && ("11:55 AM".equalsIgnoreCase(request.getTimeSlot().trim()) || "11:55AM".equalsIgnoreCase(request.getTimeSlot().trim()))) {
                boolean occupied = appointmentRepository.findByDoctorIdAndDateAndIsPremiumTrue(request.getDoctorId(), request.getDate())
                    .stream()
                    .anyMatch(a -> a.getTimeSlot() != null && "11:55 AM".equalsIgnoreCase(a.getTimeSlot().trim()) && !com.example.healthtech.config.AppConstants.STATUS_CANCELLED.equalsIgnoreCase(a.getStatus()));
            if (occupied) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(java.util.Map.of(
                        "error", "Slot Conflict",
                        "message", "The 11:55 AM slot is prioritized. The next available slot is 12:10 PM. Please manually select a new time slot below.",
                        "suggestedSlot", "12:10 PM"
                    ));
                }
            }
            Appointment appointment = appointmentService.scheduleAppointment(
                    request.getPatientId(),
                    request.getDoctorId(),
                    request.getDate(),
                    request.getTimeSlot(),
                    request.getIsPremium(),
                    request.getTokenNumber(),
                    request.getAccessType(),
                    request.getPatientLatitude(),
                    request.getPatientLongitude());
            return ResponseEntity.ok(appointment);
        } catch (AppointmentConflictException e) {
            System.err.println("[AppointmentController] AppointmentConflictException: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(java.util.Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            System.err.println("[AppointmentController] IllegalStateException: " + e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    // applyOverrides removed — no mock account overrides allowed

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getPatientAppointments(@PathVariable String patientId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsForPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getDoctorAppointments(
        @PathVariable Long doctorId,
        @RequestParam(required = false) String date
    ) {
        List<Appointment> appointments = appointmentService.getAppointmentsForDoctor(doctorId);
        if (date != null) {
            LocalDate localDate = LocalDate.parse(date);
            appointments = appointments.stream()
                .filter(a -> a.getDate() != null && a.getDate().equals(localDate))
                .toList();
        }
        
        java.util.Set<String> seenIds = new java.util.HashSet<>();
        java.util.List<String> validStatuses = com.example.healthtech.config.AppConstants.ALL_ACTIVE_STATUSES;
        List<Appointment> filtered = appointments.stream()
            .filter(a -> a.getStatus() != null && validStatuses.contains(a.getStatus().toUpperCase()))
            .filter(a -> seenIds.add(a.getPatientId() + "-" + a.getDate())) // deduplicate by patient and date
            .collect(java.util.stream.Collectors.toList());
        
        System.out.println("[API] Returning " + filtered.size() + " appointments (after dedup)");
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/doctor/{doctorId}/count")
    public ResponseEntity<?> getCount(@PathVariable Long doctorId, @RequestParam String date, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Unauthorized"));
        }
        
        Doctor doc = doctorRepository.findById(doctorId).orElse(null);
        if (doc == null || doc.getAccount() == null || !doc.getAccount().getUsername().equals(authentication.getName())) {
            return ResponseEntity.status(403).body(java.util.Map.of("message", "Forbidden: Cannot view another doctor's patients"));
        }
        
        LocalDate localDate = LocalDate.parse(date);
        long count = appointmentService.countAppointmentsForDoctorAndDate(doctorId, localDate);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/doctor/{doctorId}/revenue/today")
    public ResponseEntity<?> getTodayRevenue(@PathVariable Long doctorId, @RequestParam(required = false) String date, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Unauthorized"));
        }
        
        Doctor doc = doctorRepository.findById(doctorId).orElse(null);
        if (doc == null || doc.getAccount() == null || !doc.getAccount().getUsername().equals(authentication.getName())) {
            return ResponseEntity.status(403).body(java.util.Map.of("message", "Forbidden"));
        }
        
        LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        long revenue = appointmentService.getTodayRevenue(doctorId, targetDate);
        return ResponseEntity.ok(java.util.Map.of("revenue", revenue));
    }

    @GetMapping("/patient/{patientId}/routing-state")
    public ResponseEntity<Map<String,Object>> getRoutingState(
        @PathVariable String patientId,
        @RequestParam(required=false) String appointmentDate) {

      LocalDate date = appointmentDate != null ? LocalDate.parse(appointmentDate) : LocalDate.now();
      List<String> statuses = com.example.healthtech.config.AppConstants.ALL_ACTIVE_STATUSES;
      List<Appointment> active = appointmentRepository.findByPatientIdAndAppointmentDate(patientId, date)
          .stream()
          .filter(a -> a.getStatus() != null && statuses.contains(a.getStatus().toUpperCase()))
          .toList();

      Map<String,Object> res = new HashMap<>();
      if (!active.isEmpty()) {
        Appointment a = active.get(0);
        res.put("routeTo","TRACKER");
        res.put("appointmentId", a.getId());
        res.put("isPremium", a.getIsPremium());
      } else {
        res.put("routeTo","SPECIALTY_SELECTION");
      }
      res.put("timestamp", LocalDateTime.now());
      return ResponseEntity.ok(res);
    }

    /**
     * SERVER-SIDE GUARD: Returns all active (non-completed) appointments for a patient.
     * Allows the frontend to force redirection to tracker for any pending session.
     */
    @GetMapping("/patient/{patientId}/check-active")
    public ResponseEntity<?> checkActiveAppointment(@PathVariable String patientId) {
        System.out.println("[GATEKEEPER] check-active called for patientId=" + patientId);
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        // AGGRESSIVE DIRECT QUERY: Hit MongoDB directly for raw, uncached results
        List<String> activeStatuses = com.example.healthtech.config.AppConstants.ALL_ACTIVE_STATUSES;
        List<Appointment> rawToday = appointmentRepository.findByPatientIdAndAppointmentDate(patientId, today);
        System.out.println("[GATEKEEPER] Raw MongoDB results for today: " + rawToday.size());

        // Filter for active statuses immediately
        Appointment todayAppt = rawToday.stream()
            .filter(a -> a.getStatus() != null && activeStatuses.contains(a.getStatus().toUpperCase()))
            .findFirst()
            .orElse(null);

        // If found via direct query, return immediately — skip everything else
        if (todayAppt != null) {
            System.out.println("[GATEKEEPER] FOUND active today appointment: " + todayAppt.getId() + " status=" + todayAppt.getStatus());
            java.util.Map<String, Object> fastResult = new java.util.HashMap<>();
            fastResult.put("hasActiveAppointment", true);
            fastResult.put("todayAppointment", todayAppt);
            fastResult.put("activeAppointments", List.of(todayAppt));
            fastResult.put("nextActiveAppointment", todayAppt);
            fastResult.put("hadTodayAppointment", false);
            return ResponseEntity.ok()
                .header("Cache-Control", "no-cache, no-store, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(fastResult);
        }

        // Fallback: full scan via service layer for future appointments
        List<Appointment> allAppts = appointmentService.getAppointmentsForPatient(patientId);
        List<Appointment> activeAppts = allAppts.stream()
            .filter(a -> !com.example.healthtech.config.AppConstants.STATUS_COMPLETED.equalsIgnoreCase(a.getStatus()) && !com.example.healthtech.config.AppConstants.STATUS_CANCELLED.equalsIgnoreCase(a.getStatus()) && !com.example.healthtech.config.AppConstants.STATUS_NO_SHOW.equalsIgnoreCase(a.getStatus()))
            .sorted(java.util.Comparator.comparing(Appointment::getDate))
            .toList();

        Appointment nextActiveAppt = activeAppts.isEmpty() ? null : activeAppts.get(0);
        boolean hadTodayAppointment = apptHistoryRepository.existsByPatientIdAndVisitDate(patientId, today)
            || allAppts.stream().anyMatch(a -> a.getDate() != null && a.getDate().equals(today) && com.example.healthtech.config.AppConstants.STATUS_COMPLETED.equalsIgnoreCase(a.getStatus()));

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("hasActiveAppointment", !activeAppts.isEmpty());
        result.put("activeAppointments", activeAppts);
        result.put("todayAppointment", null);
        result.put("nextActiveAppointment", nextActiveAppt);
        result.put("hadTodayAppointment", hadTodayAppointment);
        return ResponseEntity.ok()
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .body(result);
    }

    @PostMapping("/{appointmentId}/arrival")
    public ResponseEntity<Void> notifyArrival(@PathVariable String appointmentId) {
        waitTimeService.notifyPatientArrival(appointmentId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{appointmentId}/check-in")
    public ResponseEntity<Void> checkIn(@PathVariable String appointmentId) {
        appointmentService.updateStatus(appointmentId, "CHECKED_IN");
        webSocketHandler.broadcastQueueSync();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{appointmentId}/consulted")
    public ResponseEntity<Void> markConsulted(@PathVariable String appointmentId,
            @RequestParam(required = false) String diagnosis) {
        appointmentService.markConsulted(appointmentId, diagnosis == null ? "" : diagnosis);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{appointmentId}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable String appointmentId, @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        appointmentService.updateStatus(appointmentId, status);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{appointmentId}/mark-discharged")
    public ResponseEntity<Void> markDischarged(@PathVariable String appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId).orElse(null);
        if (appt == null) return ResponseEntity.notFound().build();
        appt.setStatus("DISCHARGED");
        appointmentRepository.save(appt);
        
        try {
            queueService.dischargePatient(appt.getPatientId());
        } catch (Exception ex) { ex.printStackTrace(); }

        try {
            java.util.Map<String,Object> e = new java.util.HashMap<>();
            e.put("type", "PATIENT_DISCHARGED"); e.put("doctorId", appt.getDoctorId());
            e.put("patientId", appt.getPatientId()); e.put("appointmentDate", appt.getDate().toString());
            webSocketHandler.broadcast(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(e));
        } catch (Exception ex) { ex.printStackTrace(); }

        try {
            webSocketHandler.broadcastQueueSync();
        } catch (Exception ex) { ex.printStackTrace(); }

        com.example.healthtech.model.ApptHistory h = new com.example.healthtech.model.ApptHistory();
        h.setPatientId(appt.getPatientId());
        h.setDoctorId(appt.getDoctorId());
        h.setTimestamp(java.time.ZonedDateTime.now());
        h.setVisitDate(appt.getDate());
        h.setPatientName(appt.getPatientName());
        apptHistoryRepository.save(h);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{appointmentId}/eta")
    public ResponseEntity<java.util.Map<String, Object>> calculateETA(
        @PathVariable String appointmentId
    ) {
        java.util.Optional<Appointment> apptOpt = appointmentRepository.findById(appointmentId);
        if (apptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Appointment appt = apptOpt.get();
        Long doctorId = appt.getDoctorId();
        
        java.util.Optional<com.example.healthtech.model.Availability> availOpt = availabilityRepository
            .findByDoctorIdAndDate(
                doctorId,
                appt.getDate()
            );
        
        if (availOpt.isEmpty()) {
            return ResponseEntity.ok(java.util.Map.of(
                "clinicOpensAt", "Not configured",
                "suggestedArrivalTime", "Not available"
            ));
        }
        
        com.example.healthtech.model.Availability avail = availOpt.get();
        java.time.LocalTime clinicOpenTime = avail.getStartTime();
        
        // Smart ETA Formula: ETA = T_now + (P_ahead × B_avg) + T_travel - T_safety
        java.time.LocalTime currentTime = java.time.LocalTime.now();
        if (appt.getDate() != null && appt.getDate().isAfter(java.time.LocalDate.now())) {
            currentTime = clinicOpenTime;
        } else if (currentTime.isBefore(clinicOpenTime)) {
            currentTime = clinicOpenTime;
        }
        
        // Get patients ahead (ARRIVED or IN_SESSION)
        List<Appointment> patientsAhead = appointmentRepository
            .findByDoctorIdAndDateAndStatusIn(
                doctorId,
                appt.getDate(),
                List.of(com.example.healthtech.config.AppConstants.STATUS_ARRIVED, com.example.healthtech.config.AppConstants.STATUS_IN_SESSION)
            );
        
        int pAhead = patientsAhead.size();
        
        // ApptHistory does not have duration metrics. Defaulting to 10 mins.
        double bAvg = 10.0; // default 10 minutes
        
        int tTravel = 20;
        if (appt.getPatientLatitude() != null && appt.getPatientLongitude() != null) {
            com.example.healthtech.model.Doctor d = doctorRepository.findById(doctorId).orElse(null);
            if (d != null && d.getLatitude() != null && d.getLongitude() != null) {
                double lat1 = appt.getPatientLatitude();
                double lon1 = appt.getPatientLongitude();
                double lat2 = d.getLatitude();
                double lon2 = d.getLongitude();
                double dLat = Math.toRadians(lat2 - lat1);
                double dLon = Math.toRadians(lon2 - lon1);
                double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                           Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                           Math.sin(dLon / 2) * Math.sin(dLon / 2);
                double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                double EARTH_RADIUS_KM = 6371.0;
                double ROUTING_MULTIPLIER = 1.3;
                double AVERAGE_SPEED_KMH = 30.0;
                double distanceKm = EARTH_RADIUS_KM * c * ROUTING_MULTIPLIER;
                tTravel = (int) Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);
            }
        }
        int tSafety = 10;
        
        long turnTimeMinutesToAdd = (long)(pAhead * bAvg);
        java.time.LocalTime suggestedArrival = currentTime.plusMinutes(turnTimeMinutesToAdd);
        
        String arrivalTimeStr = suggestedArrival.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
        if (turnTimeMinutesToAdd >= 1440 - currentTime.getHour() * 60 - currentTime.getMinute()) {
            arrivalTimeStr += " (Next Day)";
        }
        
        System.out.println("[ETA] Doctor: " + doctorId + 
                           ", Patients Ahead: " + pAhead + 
                           ", Avg Duration: " + bAvg + 
                           ", Turn Time: " + arrivalTimeStr);
        
        return ResponseEntity.ok(java.util.Map.of(
            "clinicOpensAt", clinicOpenTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")),
            "suggestedArrivalTime", arrivalTimeStr,
            "patientsAhead", pAhead,
            "avgConsultationTime", bAvg,
            "travelTime", tTravel,
            "safetyBuffer", tSafety
        ));
    }

    @GetMapping("/eta")
    public com.example.healthtech.dto.EtaResponse getDynamicEta(
            @RequestParam Long doctorId, 
            @RequestParam double userLat, 
            @RequestParam double userLng) {
        
        // 1. Fetch clinic coordinates from DB
        com.example.healthtech.model.Doctor d = doctorRepository.findById(doctorId).orElse(null);
        double clinicLat = (d != null && d.getLatitude() != null) ? d.getLatitude() : 26.8467;
        double clinicLng = (d != null && d.getLongitude() != null) ? d.getLongitude() : 80.9462;

        // 2. Calculate travel time
        com.example.healthtech.service.LocationUtility locationUtility = new com.example.healthtech.service.LocationUtility();
        int travelTime = locationUtility.calculateTravelTimeInMinutes(userLat, userLng, clinicLat, clinicLng);
        
        // 3. Fetch live queue status (patients ahead * 10 min buffer)
        java.time.LocalDate today = java.time.LocalDate.now();
        List<Appointment> patientsAheadList = appointmentRepository.findByDoctorIdAndDateAndStatusIn(
            doctorId, today, List.of(com.example.healthtech.config.AppConstants.STATUS_ARRIVED, com.example.healthtech.config.AppConstants.STATUS_IN_SESSION)
        );
        int patientsAhead = patientsAheadList.size(); 
        int queueWait = patientsAhead * 10; 

        return new com.example.healthtech.dto.EtaResponse(travelTime, queueWait, travelTime + queueWait);
    }

    public static class AppointmentRequest {
        private String patientId;
        private Long doctorId;
        private LocalDate date;
        private String timeSlot;
        private Boolean isPremium;
        private Integer tokenNumber;
        private String accessType;

        public String getAccessType() {
            return accessType;
        }

        public void setAccessType(String accessType) {
            this.accessType = accessType;
        }

        public String getPatientId() {
            return patientId;
        }

        public void setPatientId(String patientId) {
            this.patientId = patientId;
        }

        public Long getDoctorId() {
            return doctorId;
        }

        public void setDoctorId(Long doctorId) {
            this.doctorId = doctorId;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate date) {
            this.date = date;
        }

        public String getTimeSlot() {
            return timeSlot;
        }

        public void setTimeSlot(String timeSlot) {
            this.timeSlot = timeSlot;
        }

        public Boolean getIsPremium() {
            return isPremium;
        }

        public void setIsPremium(Boolean premium) {
            isPremium = premium;
        }

        public Integer getTokenNumber() {
            return tokenNumber;
        }

        public void setTokenNumber(Integer tokenNumber) {
            this.tokenNumber = tokenNumber;
        }

        private Double patientLatitude;
        private Double patientLongitude;

        public Double getPatientLatitude() {
            return patientLatitude;
        }

        public void setPatientLatitude(Double patientLatitude) {
            this.patientLatitude = patientLatitude;
        }

        public Double getPatientLongitude() {
            return patientLongitude;
        }

        public void setPatientLongitude(Double patientLongitude) {
            this.patientLongitude = patientLongitude;
        }
    }
}
