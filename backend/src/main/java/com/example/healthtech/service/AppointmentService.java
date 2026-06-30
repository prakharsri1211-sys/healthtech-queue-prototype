package com.example.healthtech.service;

import com.example.healthtech.model.*;
import com.example.healthtech.repository.jpa.*;
import com.example.healthtech.repository.mongodb.*;
import com.example.healthtech.exception.DuplicateAppointmentException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AppointmentService {
    private static final Logger logger = LoggerFactory.getLogger(AppointmentService.class);
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final ApptHistoryRepository apptHistoryRepository;
    private final FinancialService financialService;
    private final AvailabilityRepository availabilityRepository;
    private final LiveQueueEntryRepository liveQueueEntryRepository;
    private final ClinicMetadataRepository clinicMetadataRepository;
    private final com.example.healthtech.config.DashboardWebSocketHandler webSocketHandler;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final PushNotificationService pushNotificationService;

    @Autowired
    public AppointmentService(AppointmentRepository appointmentRepository, PatientRepository patientRepository,
            DoctorRepository doctorRepository, ApptHistoryRepository apptHistoryRepository,
            FinancialService financialService, AvailabilityRepository availabilityRepository,
            LiveQueueEntryRepository liveQueueEntryRepository,
            ClinicMetadataRepository clinicMetadataRepository,
            com.example.healthtech.config.DashboardWebSocketHandler webSocketHandler,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            PushNotificationService pushNotificationService) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.apptHistoryRepository = apptHistoryRepository;
        this.financialService = financialService;
        this.availabilityRepository = availabilityRepository;
        this.liveQueueEntryRepository = liveQueueEntryRepository;
        this.clinicMetadataRepository = clinicMetadataRepository;
        this.webSocketHandler = webSocketHandler;
        this.jdbcTemplate = jdbcTemplate;
        this.pushNotificationService = pushNotificationService;
    }

    public Appointment scheduleAppointment(String patientId, Long doctorId, LocalDate date, String timeSlot,
            Boolean isPremium, Integer tokenNumber, String accessType, Double patientLatitude, Double patientLongitude) {
        
        // STEP 1: Resolve final isPremium from accessType (takes priority)
        if (accessType != null && !accessType.isEmpty()) {
            isPremium = "PREMIUM".equalsIgnoreCase(accessType);
            System.out.println("[BOOKING] accessType=" + accessType + " -> isPremium=" + isPremium);
        } else if (isPremium == null) {
            isPremium = false;
        }
        System.out.println("[BOOKING] Final isPremium=" + isPremium);

        Patient p = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalStateException("Patient record not found in clinical database (ID: " + patientId + ")"));
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalStateException("Doctor record not found in clinical database (ID: " + doctorId + ")"));
        // ─── RULE 1: Block if patient already has active appointment on target date with THIS doctor ─
        Boolean doubleBookedWithSameDoctor = appointmentRepository.existsByPatientIdAndDoctorIdAndDate(patientId, doctorId, date);
        if (doubleBookedWithSameDoctor != null && doubleBookedWithSameDoctor) {
            throw new DuplicateAppointmentException("You already have an appointment scheduled with this doctor for this day. Please select a different date or choose another doctor.");
        }

        // ─── RULE 2: Block if patient has ANY active (non-completed) appointment today ─
        java.util.List<String> activeStatuses = com.example.healthtech.config.AppConstants.ALL_ACTIVE_STATUSES;
        java.util.List<Appointment> patientApptsToday = appointmentRepository.findByPatientIdAndAppointmentDate(patientId, date);
        boolean hasActiveAppointment = patientApptsToday.stream()
                .anyMatch(a -> a.getStatus() != null && activeStatuses.contains(a.getStatus().toUpperCase()));
        
        if (hasActiveAppointment) {
            throw new DuplicateAppointmentException("Strict Policy: You currently have an active appointment today. You cannot book another appointment until you are discharged.");
        }

        // ─── AVAILABILITY CHECK ─────────────────────────────────────
        // Use list query to avoid NonUniqueResultException from duplicate records
        java.util.List<Availability> availList = availabilityRepository.findByDoctorId(doctorId);
        Availability avail = availList.stream()
            .filter(a -> a.getDate() != null && a.getDate().equals(date))
            .findFirst().orElse(null);
        if (avail != null) {
            if (avail.isClosed()) throw new IllegalStateException("Clinic is closed on this date");
            
            // ─── STRICT RULE: Block if clinic is already closed today ─
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
            if (date.equals(today)) {
                java.time.LocalTime nowTime = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Kolkata"));
                if (avail.getEndTime() != null && nowTime.isAfter(avail.getEndTime())) {
                    throw new IllegalStateException("Clinic has already closed for today (" + avail.getEndTime() + "). No further bookings can be made.");
                }
            }
            
            boolean premium = isPremium;
            int pCap = avail.getPremiumCapacity() != null ? avail.getPremiumCapacity() : 20;
            int sCap = avail.getStandardCapacity() != null ? avail.getStandardCapacity() : 20;

            if (premium) {
                long currentPremium = appointmentRepository.countByDoctorIdAndDateAndIsPremiumTrue(doctorId, date);
                if (currentPremium >= pCap) {
                    throw new IllegalStateException("Premium capacity reached for this date");
                }
            } else {
                long currentStandard = appointmentRepository.countByDoctorIdAndDateAndIsPremiumFalse(doctorId, date);
                if (currentStandard >= sCap) {
                    throw new IllegalStateException("Standard capacity reached for this date");
                }
            }

            if (timeSlot != null && !timeSlot.equalsIgnoreCase("Direct Walk-in") && !timeSlot.isEmpty()) {
                try {
                    // Normalize "hh:mm AM/PM" to LocalTime
                    String[] parts = timeSlot.split(" ");
                    String[] hm = parts[0].split(":");
                    int h = Integer.parseInt(hm[0]);
                    int m = Integer.parseInt(hm[1]);
                    if (parts.length > 1 && parts[1].equalsIgnoreCase("PM") && h < 12) h += 12;
                    if (parts.length > 1 && parts[1].equalsIgnoreCase("AM") && h == 12) h = 0;
                    java.time.LocalTime t = java.time.LocalTime.of(h, m);
                    
                    if (t.isBefore(avail.getStartTime()) || t.isAfter(avail.getEndTime().minusMinutes(1))) {
                        throw new IllegalStateException("Selected time is outside doctor clinical hours");
                    }
                } catch (Exception e) {
                   // Ignore parsing errors for walk-ins or malformed slots, defer to taken check below
                }
            }
        }
        // ────────────────────────────────────────────────────────────

        if (isPremium != null && isPremium && timeSlot != null && !timeSlot.equalsIgnoreCase("Direct Walk-in") && !timeSlot.isEmpty()) {
            java.time.LocalTime requestedTime = parseTimeSlot(timeSlot);
            if (requestedTime != null) {
                // 1. Check for collisions and 15-minute buffer
                List<Appointment> existingPremium = appointmentRepository.findByDoctorIdAndDateAndIsPremiumTrue(doctorId, date);
                
                boolean hasCollision = false;
                for (Appointment ex : existingPremium) {
                    java.time.LocalTime exTime = parseTimeSlot(ex.getTimeSlot());
                    if (exTime == null) continue;
                    long diffMinutes = java.time.Duration.between(exTime, requestedTime).abs().toMinutes();
                    if (diffMinutes < 15) {
                        hasCollision = true;
                        break;
                    }
                }
                
                if (hasCollision) {
                    // Find available slot AFTER
                    java.time.LocalTime afterSuggestion = requestedTime.plusMinutes(15);
                    while (true) {
                        final java.time.LocalTime finalAfter = afterSuggestion;
                        boolean sugTaken = existingPremium.stream().anyMatch(e -> {
                            java.time.LocalTime et = parseTimeSlot(e.getTimeSlot());
                            return et != null && java.time.Duration.between(et, finalAfter).abs().toMinutes() < 15;
                        });
                        if (!sugTaken) break;
                        afterSuggestion = afterSuggestion.plusMinutes(15);
                    }
                    
                    // Find available slot BEFORE
                    java.time.LocalTime beforeSuggestion = requestedTime.minusMinutes(15);
                    while (true) {
                        final java.time.LocalTime finalBefore = beforeSuggestion;
                        boolean sugTaken = existingPremium.stream().anyMatch(e -> {
                            java.time.LocalTime et = parseTimeSlot(e.getTimeSlot());
                            return et != null && java.time.Duration.between(et, finalBefore).abs().toMinutes() < 15;
                        });
                        if (!sugTaken) break;
                        beforeSuggestion = beforeSuggestion.minusMinutes(15);
                    }
                    
                    String message = String.format("An active appointment already exists Availabe slot :- after %s and before %s", 
                        formatTimeSlot(afterSuggestion), formatTimeSlot(beforeSuggestion));
                    
                    throw new AppointmentConflictException(message);
                }
            }
        } else if (isPremium != null && isPremium && timeSlot != null) {
            // Fallback for non-parsable or direct walk-in if they somehow get marked premium
            Boolean taken = appointmentRepository.existsByDoctorIdAndDateAndTimeSlot(doctorId, date, timeSlot);
            if (Boolean.TRUE.equals(taken))
                throw new IllegalStateException("Time slot already booked");
        }

        

        // ─── ATOMIC TOKEN ASSIGNMENT (Race-Condition Safe) ────────────────────────────
        // Uses synchronized block to prevent two simultaneous FREE bookings getting Token #1
        // Excludes CANCELLED appointments so first active booking = Token #1
        Integer token = null;
        if (isPremium == null || !isPremium) {
            synchronized (AppointmentService.class) {
                long stdCount = appointmentRepository.countByDoctorIdAndDateAndIsPremiumFalseAndStatusNot(doctorId, date, com.example.healthtech.config.AppConstants.STATUS_CANCELLED);
                token = (int) (stdCount + 1);
            }
        }

        System.out.println("[BOOKING] Access Type: " + accessType + ", isPremium: " + isPremium);

        if (isPremium != null && isPremium) {
            token = null;
        } else {
            timeSlot = null;
        }

        System.out.println("[AppointmentService] Creating appointment object...");
        Appointment a = new Appointment();
        a.setPatientId(patientId);
        a.setPatientName(p.getFullName());
        a.setDoctorId(doctorId);
        a.setDoctorName(d.getFullName());
        a.setAccountId(p.getAccountId());
        a.setDate(date);
        a.setTimeSlot(timeSlot);
        a.setIsPremium(isPremium != null ? isPremium : false);
        a.setTokenNumber(token);
        a.setStatus(com.example.healthtech.config.AppConstants.STATUS_WAITING);
        a.setTier(a.getIsPremium() ? com.example.healthtech.config.AppConstants.TIER_PREMIUM : com.example.healthtech.config.AppConstants.TIER_FREE);
        a.setSpecialty(d.getSpeciality() != null ? d.getSpeciality() : "General Medicine");
        a.setPatientLatitude(patientLatitude);
        a.setPatientLongitude(patientLongitude);

        // ─── CLINIC METADATA SYNC ──────────────────────────────────
        try {
            var metadata = clinicMetadataRepository.findByDoctorId(doctorId);
            if (metadata.isPresent()) {
                a.setClinicAddress(metadata.get().getClinicName());
            } else {
                a.setClinicAddress("General Clinic");
            }
        } catch (Exception e) {
            System.err.println("[AppointmentService] Failed to fetch clinic metadata: " + e.getMessage());
            a.setClinicAddress("General Clinic");
        }
        // ────────────────────────────────────────────────────────────

        // Apply ₹100 credit logic if applicable
        int baseFee = a.getIsPremium() ? 500 : 0;
        if (baseFee > 0 && p.getId() != null) {
            System.out.println("[AppointmentService] Applying credit for Premium booking...");
            financialService.applyValidCredit(p.getId(), baseFee);
        }

        System.out.println("[AppointmentService] Saving to MongoDB...");
        Appointment saved = appointmentRepository.save(a);
        System.out.println("[AppointmentService] Saved successfully with ID: " + saved.getId());
        
        System.out.println("[AppointmentService] Creating LiveQueueEntry...");
        if (a.getPatientId() != null) {
            try {
                System.out.println("[AppointmentService] Deleting existing queue entries for patientId=" + a.getPatientId() + " to prevent duplicates...");
                liveQueueEntryRepository.deleteByPatientId(a.getPatientId());
            } catch (Exception ex) {
                System.err.println("[AppointmentService] Error deleting existing queue entries: " + ex.getMessage());
            }
        }
        com.example.healthtech.model.LiveQueueEntry e = new com.example.healthtech.model.LiveQueueEntry();
        e.setPatientName(a.getPatientName());
        e.setPatientId(a.getPatientId());
        e.setPatientAge(p.getAge());
        e.setDoctorId(a.getDoctorId());
        e.setDoctorName(a.getDoctorName());
        e.setTier(a.getTier());
        e.setTokenNumber(a.getTokenNumber());
        e.setStatus(com.example.healthtech.config.AppConstants.STATUS_WAITING);
        e.setAppointmentTime(a.getTimeSlot());
        e.setIssuedAt(java.time.LocalDateTime.now());
        e.setServed(false);
        liveQueueEntryRepository.save(e);
        
        // Broadcast new appointment to Mediator and Doctor immediately
        webSocketHandler.broadcastQueueSync();

        return saved;
    }

    public List<Appointment> getAppointmentsForPatient(String patientId) {
        // Optimized: only fetch schedules for today or future dates
        return appointmentRepository.findByPatientIdAndDateGreaterThanEqual(patientId, LocalDate.now());
    }
    
    public List<Appointment> getAppointmentsByPatientAndDate(String patientId, LocalDate date) {
        return appointmentRepository.findByPatientIdAndAppointmentDate(patientId, date);
    }
    
    public List<Appointment> getAppointmentsForDoctor(Long doctorId) {
        // Optimized: only fetch schedules for today or future dates
        return appointmentRepository.findByDoctorIdAndDateGreaterThanEqual(doctorId, LocalDate.now());
    }

    public long countAppointmentsForDoctorAndDate(Long doctorId, LocalDate date) {
        return appointmentRepository.countByDoctorIdAndDate(doctorId, date);
    }

    public long getTodayRevenue(Long doctorId, LocalDate targetDate) {
        // Sum feeAmount from ApptHistory for the target date
        List<ApptHistory> history = apptHistoryRepository.findByDoctorIdAndVisitDate(doctorId, targetDate);
        return history.stream().mapToLong(h -> h.getFeeAmount() != null ? h.getFeeAmount() : 500).sum();
    }

    @jakarta.annotation.PostConstruct
    public void deletePatient123GhostAppointments() {
        System.out.println("[POST-CONSTRUCT] Purging patient123 ghost appointments...");
        try {
            List<Appointment> appts = appointmentRepository.findByPatientId("patient123");
            if (appts != null && !appts.isEmpty()) {
                appointmentRepository.deleteAll(appts);
                System.out.println("[POST-CONSTRUCT] Deleted " + appts.size() + " MongoDB appointments for patient123");
            }
            liveQueueEntryRepository.findByPatientId("patient123").ifPresent(e -> {
                liveQueueEntryRepository.delete(e);
                System.out.println("[POST-CONSTRUCT] Deleted LiveQueueEntry for patient123");
            });
        } catch (Exception e) {
            System.err.println("[POST-CONSTRUCT] Error cleaning up patient123 appointments: " + e.getMessage());
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * *") // Every minute
    @Transactional
    public void clinicClosurePurge() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        java.time.LocalTime currentTime = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        
        List<String> unfulfilledStatuses = java.util.List.of(
            com.example.healthtech.config.AppConstants.STATUS_WAITING,
            com.example.healthtech.config.AppConstants.STATUS_BOOKED,
            com.example.healthtech.config.AppConstants.STATUS_CHECKED_IN,
            com.example.healthtech.config.AppConstants.STATUS_ACTIVE,
            com.example.healthtech.config.AppConstants.STATUS_ARRIVED,
            com.example.healthtech.config.AppConstants.STATUS_IN_SESSION
        );
        
        // 1. Purge anything from past dates
        List<Appointment> pastAppts = appointmentRepository.findAll().stream()
            .filter(a -> a.getDate() != null && a.getDate().isBefore(today))
            .filter(a -> a.getStatus() != null && unfulfilledStatuses.contains(a.getStatus().toUpperCase()))
            .toList();
            
        int pastPurged = 0;
        for (Appointment a : pastAppts) {
            try {
                liveQueueEntryRepository.deleteByPatientId(a.getPatientId());
            } catch (Exception e) {
                logger.error("Failed to delete live queue entry during past appointment purge", e);
            }
            appointmentRepository.delete(a);
            pastPurged++;
        }
        
        if (pastPurged > 0) {
            System.out.println("[CLINIC CLOSURE] Purged " + pastPurged + " old unfulfilled appointments");
        }

        List<Availability> availList = availabilityRepository.findAll();
        for (Availability avail : availList) {
            if (avail.getDate() != null && avail.getDate().equals(today) && !avail.isClosed()) {
                if (avail.getEndTime() != null && (currentTime.isAfter(avail.getEndTime()) || currentTime.equals(avail.getEndTime()))) {
                    List<Appointment> remainingAppts = appointmentRepository.findByDoctorIdAndDate(avail.getDoctorId(), today);
                    
                    int purgedCount = 0;
                    for (Appointment appt : remainingAppts) {
                        if (appt.getStatus() != null && unfulfilledStatuses.contains(appt.getStatus().toUpperCase())) {
                            try {
                                liveQueueEntryRepository.deleteByPatientId(appt.getPatientId());
                            } catch(Exception e) {
                                logger.error("Failed to delete live queue entry during clinic closure purge", e);
                            }
                            appointmentRepository.delete(appt);
                            purgedCount++;
                        }
                    }
                    if (purgedCount > 0) {
                        System.out.println("[CLINIC CLOSURE] Purged " + purgedCount + " unfulfilled appointments for doctor: " + avail.getDoctorId());
                        webSocketHandler.broadcastQueueSync();
                    }
                }
            }
        }
    }

    @Transactional
    public void markConsulted(String appointmentId, String diagnosis) {
        Appointment a = appointmentRepository.findById(appointmentId).orElseThrow();
        ApptHistory.VisitType vt = apptHistoryRepository.countByPatientId(a.getPatientId()) > 0
                ? ApptHistory.VisitType.FOLLOW_UP
                : ApptHistory.VisitType.FIRST_VISIT;

        int fee = financialService.calculateCompletedTotal(a.getPatientId(), a.getDoctorId(), a.getIsPremium());

        ApptHistory h = new ApptHistory();
        h.setPatientId(a.getPatientId());
        h.setVisitDate(a.getDate());
        h.setDoctorId(a.getDoctorId());
        h.setIsPremium(a.getIsPremium());
        h.setFeeAmount(fee);
        h.setDiagnosis(diagnosis);
        h.setVisitType(vt);
        h.setTimestamp(java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")));

        apptHistoryRepository.save(h);

        // Update doctor cumulative balance
        doctorRepository.findById(a.getDoctorId()).ifPresent(doctor -> {
            if (doctor.getTotalRevenue() == null) {
                doctor.setTotalRevenue(0.0);
            }
            doctor.setTotalRevenue(doctor.getTotalRevenue() + fee);
            doctorRepository.save(doctor);
        });

        appointmentRepository.delete(a);
    }

    @Transactional
    public void updateStatus(String appointmentId, String status) {
        appointmentRepository.findById(appointmentId).ifPresent(a -> {
            a.setStatus(status);
            appointmentRepository.save(a);
            
            // Sync with LiveQueue
            liveQueueEntryRepository.findByPatientId(a.getPatientId()).ifPresent(e -> {
                e.setStatus(status);
                liveQueueEntryRepository.save(e);
            });

            if ("NO_SHOW".equalsIgnoreCase(status)) {
                financialService.handleNoShow(a.getPatientId(), a.getDoctorId());
            }
            
            // Push real-time update to all dashboards (Mediator, Doctor, etc.)
            webSocketHandler.broadcastQueueSync();
        });
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * *") // Every minute
    public void cleanupExpiredAppointments() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        java.time.LocalTime currentTime = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        
        List<Appointment> expiredAppointments = appointmentRepository
            .findByDateAndStatusIn(today, java.util.List.of(
                com.example.healthtech.config.AppConstants.STATUS_WAITING, 
                com.example.healthtech.config.AppConstants.STATUS_BOOKED, 
                com.example.healthtech.config.AppConstants.STATUS_CHECKED_IN
            ));
        
        for (Appointment appt : expiredAppointments) {
            if (appt.getTimeSlot() == null || appt.getTimeSlot().isEmpty() || appt.getTimeSlot().equalsIgnoreCase("Direct Walk-in")) continue;
            try {
                java.time.LocalTime appointmentTime = java.time.LocalTime.parse(appt.getTimeSlot(), 
                    java.time.format.DateTimeFormatter.ofPattern("h:mm a"));
                
                // If current time is 30 minutes past appointment time, mark as no-show
                if (currentTime.isAfter(appointmentTime.plusMinutes(30))) {
                    appt.setStatus("NO_SHOW");
                    appointmentRepository.save(appt);
                    
                    System.out.println("[CLEANUP] Marked appointment " + appt.getId() + " as NO_SHOW at " + currentTime);
                    
                    financialService.handleNoShow(appt.getPatientId(), appt.getDoctorId());

                    liveQueueEntryRepository.findByPatientId(appt.getPatientId()).ifPresent(e -> {
                        e.setStatus("NO_SHOW");
                        liveQueueEntryRepository.save(e);
                    });
                    webSocketHandler.broadcastQueueSync();
                }
            } catch (Exception e) {
                logger.error("Failed to process expired appointment cleanup", e);
            }
        }
    }

    private java.time.LocalTime parseTimeSlot(String timeSlot) {
        if (timeSlot == null) return null;
        try {
            String[] parts = timeSlot.split(" ");
            String[] hm = parts[0].split(":");
            int h = Integer.parseInt(hm[0]);
            int m = Integer.parseInt(hm[1]);
            if (parts.length > 1 && parts[1].equalsIgnoreCase("PM") && h < 12) h += 12;
            if (parts.length > 1 && parts[1].equalsIgnoreCase("AM") && h == 12) h = 0;
            return java.time.LocalTime.of(h, m);
        } catch (Exception e) {
            return null;
        }
    }

    private String formatTimeSlot(java.time.LocalTime t) {
        int h = t.getHour();
        String ampm = h >= 12 ? "PM" : "AM";
        if (h > 12) h -= 12;
        if (h == 0) h = 12;
        return String.format("%d:%02d %s", h, t.getMinute(), ampm);
    }
}
