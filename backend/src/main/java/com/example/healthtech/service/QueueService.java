package com.example.healthtech.service;

import com.example.healthtech.model.*;
import com.example.healthtech.repository.jpa.*;
import com.example.healthtech.repository.mongodb.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class QueueService {
    private final LiveQueueEntryRepository entryRepository;
    private final LiveQueueRepository queueRepository;
    private final PatientRepository patientRepository;
    private final FinanceLedgerRepository ledgerRepository;
    private final JdbcTemplate jdbcTemplate;
    private final com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository;
    private final ApptHistoryRepository apptHistoryRepository;
    private final DoctorRepository doctorRepository;
    private final FinancialService financialService;

    public QueueService(LiveQueueEntryRepository entryRepository, LiveQueueRepository queueRepository,
            PatientRepository patientRepository, FinanceLedgerRepository ledgerRepository,
            JdbcTemplate jdbcTemplate,
            com.example.healthtech.repository.mongodb.AppointmentRepository appointmentRepository,
            ApptHistoryRepository apptHistoryRepository,
            DoctorRepository doctorRepository,
            FinancialService financialService) {
        this.entryRepository = entryRepository;
        this.queueRepository = queueRepository;
        this.patientRepository = patientRepository;
        this.ledgerRepository = ledgerRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.appointmentRepository = appointmentRepository;
        this.apptHistoryRepository = apptHistoryRepository;
        this.doctorRepository = doctorRepository;
        this.financialService = financialService;
    }

    @Transactional
    public void triggerLateArrival(String patientId) {
        LiveQueueEntry entry = entryRepository.findByPatientId(patientId)
                .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        // find current max token
        LiveQueueEntry top = entryRepository.findTopByOrderByTokenNumberDesc();
        int maxToken = top != null && top.getTokenNumber() != null ? top.getTokenNumber() : 0;
        entry.setTokenNumber(maxToken + 1);
        entry.setIssuedAt(LocalDateTime.now());
        entryRepository.save(entry);

        // Deduct ₹100 from FinanceLedger (creditBalance reduced)
        FinanceLedger ledger = ledgerRepository.findByPatientId(patientId).orElseGet(() -> {
            FinanceLedger f = new FinanceLedger();
            f.setPatientId(patientId);
            return f;
        });
        ledger.setCreditBalance(ledger.getCreditBalance() - 100);
        ledger.setCreditExpiryDate(addWorkingDays(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")), 7));
        ledgerRepository.save(ledger);
    }

    private LocalDate addWorkingDays(LocalDate start, int workingDays) {
        LocalDate date = start;
        int added = 0;
        while (added < workingDays) {
            date = date.plusDays(1);
            if (!(date.getDayOfWeek().getValue() == 6 || date.getDayOfWeek().getValue() == 7)) {
                added++;
            }
        }
        return date;
    }

    @Transactional
    public void pushDown(String patientId, int spots) {
        System.out.println("[REORDER] Triggered for patientId=" + patientId + ", spots=" + spots);
        LiveQueueEntry source = entryRepository.findById(patientId)
                .or(() -> entryRepository.findByPatientId(patientId))
                .orElse(null);
        if (source == null) {
            System.out.println("[REORDER] Source entry not found (tried id and patientId)");
            return;
        }
        
        List<LiveQueueEntry> queue = entryRepository.findByServedFalseOrderByTokenNumberAsc()
                .stream()
                .filter(p -> p.getStatus().equals(source.getStatus()))
                .toList();
                
        int currentIndex = -1;
        for (int i = 0; i < queue.size(); i++) {
            if (queue.get(i).getId().equals(source.getId())) {
                currentIndex = i;
                break;
            }
        }

        if (currentIndex == -1) {
            System.out.println("[REORDER] Current Index is -1");
            return;
        }

        int targetIndex = currentIndex + spots;
        if (targetIndex < 0 || targetIndex >= queue.size()) {
            System.out.println("[REORDER] Target index out of bounds: " + targetIndex);
            return; // out of bounds
        }

        LiveQueueEntry current = queue.get(currentIndex);
        LiveQueueEntry target = queue.get(targetIndex);

        int currentToken = current.getTokenNumber() != null ? current.getTokenNumber() : 0;
        int targetToken = target.getTokenNumber() != null ? target.getTokenNumber() : 0;
        System.out.println("[REORDER] Swapping: " + current.getPatientName() + " (" + currentToken + ") with " + target.getPatientName() + " (" + targetToken + ")");

        // Perform a straightforward token swap
        current.setTokenNumber(targetToken);
        target.setTokenNumber(currentToken);

        // Break ties if tokens were accidentally identical
        if (currentToken == targetToken) {
            if (spots < 0) current.setTokenNumber(targetToken - 1); // Move UP gets smaller token
            else current.setTokenNumber(targetToken + 1); // Move DOWN gets larger token
        }

        entryRepository.save(current);
        entryRepository.save(target);
        System.out.println("[REORDER] Successfully saved tokens for both.");
    }

    @Transactional
    public void setActivePatient(String patientId) {
        // Clear current active session
        List<LiveQueueEntry> currentActive = entryRepository.findByServedFalseOrderByTokenNumberAsc();
        for (LiveQueueEntry entry : currentActive) {
            if (com.example.healthtech.config.AppConstants.STATUS_IN_SESSION.equals(entry.getStatus())) {
                entry.setStatus("ARRIVED");
                entryRepository.save(entry);
            }
        }
        
        // Set new active (Checking both ID types for frontend compatibility)
        entryRepository.findById(patientId)
            .or(() -> entryRepository.findByPatientId(patientId))
            .ifPresent(e -> {
                e.setStatus(com.example.healthtech.config.AppConstants.STATUS_IN_SESSION);
                entryRepository.save(e);
            });
    }
    @Transactional
    public void purgeQueue() {
        entryRepository.deleteAll();
    }

    @Transactional
    public void restorePatient(String patientId) {
        entryRepository.findById(patientId)
            .or(() -> entryRepository.findByPatientId(patientId))
            .ifPresent(e -> {
                e.setStatus(com.example.healthtech.config.AppConstants.STATUS_WAITING);
                entryRepository.save(e);
            });
    }
    @Transactional
    public String dischargePatient(String patientId) {
        java.util.concurrent.atomic.AtomicReference<String> realPid = new java.util.concurrent.atomic.AtomicReference<>(patientId);
        entryRepository.findById(patientId)
            .or(() -> entryRepository.findByPatientId(patientId))
            .ifPresent(e -> {
                e.setServed(true);
                e.setStatus(com.example.healthtech.config.AppConstants.STATUS_COMPLETED);
                entryRepository.save(e);
                
                String pid = e.getPatientId();
                if (pid != null) {
                    realPid.set(pid);
                }

                // 1. Update MongoDB Appointment and Archive to History
                if (pid != null) {
                    appointmentRepository.findByPatientId(pid).forEach(appt -> {
                        // Allow discharge regardless of machine date — matches by patient ID and status
                        if (appt.getDate() != null && !com.example.healthtech.config.AppConstants.STATUS_COMPLETED.equals(appt.getStatus())) {
                            Boolean isPrem = appt.getIsPremium();
                            int fee = financialService.calculateCompletedTotal(pid, appt.getDoctorId(), isPrem != null ? isPrem : false);
                            
                            // Archive to History with precise timestamp (Asia/Kolkata)
                            ApptHistory h = new ApptHistory();
                            h.setPatientId(pid);
                            h.setPatientName(appt.getPatientName());
                            h.setVisitDate(appt.getDate());
                            h.setDoctorId(appt.getDoctorId());
                            h.setIsPremium(isPrem != null ? isPrem : false);
                            h.setFeeAmount(fee);
                            h.setDiagnosis("Consultation Completed");
                            h.setTimestamp(java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")));
                            h.setAppointmentTime(appt.getTimeSlot());
                            h.setPaymentMode("UPI / Cash / Card");
                            h.setVisitType(apptHistoryRepository.countByPatientId(pid) > 0 
                                ? ApptHistory.VisitType.FOLLOW_UP 
                                : ApptHistory.VisitType.FIRST_VISIT);
                            
                            apptHistoryRepository.save(h);
                            
                            // 2. Cumulative Revenue Tracking (Never Decreases)
                            doctorRepository.findById(appt.getDoctorId()).ifPresent(doctor -> {
                                if (doctor.getTotalRevenue() == null) {
                                    doctor.setTotalRevenue(0.0);
                                }
                                doctor.setTotalRevenue(doctor.getTotalRevenue() + fee);
                                doctorRepository.save(doctor);
                                System.out.println("[REVENUE] Added " + fee + " to Dr. " + doctor.getName() + ". Total: " + doctor.getTotalRevenue());
                            });
                            
                            // DO NOT Delete from active appointments! Just mark as COMPLETED.
                            // This ensures MongoDB ALWAYS has a record of the visit today.
                            appt.setStatus(com.example.healthtech.config.AppConstants.STATUS_COMPLETED);
                            appointmentRepository.save(appt);
                            System.out.println("[DISCHARGE] MongoDB appointment marked as COMPLETED for patientId=" + pid);
                        }
                    });
                }

                // 3. Sync SQL Appointment record
                try {
                    jdbcTemplate.update("UPDATE appointment SET status = 'COMPLETED' WHERE (patient_id = ? OR id::text = ?) AND status != 'COMPLETED'", pid, pid);
                } catch (Exception ex) {
                    System.err.println("Failed to update SQL appointment record during discharge: " + ex.getMessage());
                }
            });
            return realPid.get();
    }


    public List<LiveQueueEntry> getCurrentQueue() {
        List<LiveQueueEntry> allRaw = entryRepository.findByServedFalseOrderByTokenNumberAsc();
        
        java.time.LocalDate today = java.time.LocalDate.now();
        List<Appointment> todaysAppointments = appointmentRepository.findByDateAndStatusIn(
            today, 
            com.example.healthtech.config.AppConstants.ACTIVE_QUEUE_STATUSES
        );
        java.util.Set<String> validPatientIds = todaysAppointments.stream()
            .map(Appointment::getPatientId)
            .collect(Collectors.toSet());
            
        List<LiveQueueEntry> all = allRaw.stream()
            .filter(e -> e.getPatientId() != null && validPatientIds.contains(e.getPatientId()))
            .collect(Collectors.toList());
        
        // De-duplicate by patientId (keeping only the first unserved entry for each patientId)
        java.util.Set<String> seenPatients = new java.util.HashSet<>();
        List<LiveQueueEntry> uniqueList = new java.util.ArrayList<>();
        for (LiveQueueEntry entry : all) {
            String pid = entry.getPatientId();
            if (pid != null && !pid.trim().isEmpty()) {
                if (!seenPatients.contains(pid)) {
                    seenPatients.add(pid);
                    uniqueList.add(entry);
                } else {
                    // Delete duplicate entry from MongoDB to clean up
                    try {
                        entryRepository.delete(entry);
                    } catch (Exception ex) {
                        System.err.println("[QUEUE_CLEANUP] Failed to delete duplicate entry for patientId=" + pid + ": " + ex.getMessage());
                    }
                }
            } else {
                uniqueList.add(entry);
            }
        }
        all = uniqueList;

        // Mission 4: Hardened Demographic Sync
        // If age is missing, fetch it from the Patient repository to ensure consistency
        all.forEach(e -> {
            if (e.getPatientAge() == null || e.getPatientAge() == 0) {
                try {
                    String pId = e.getPatientId();
                    if (pId != null) {
                        patientRepository.findById(pId).ifPresent(p -> e.setPatientAge(p.getAge()));
                    }
                } catch (Exception ex) {
                    System.err.println("[SYNC_ERROR] Failed to fetch age for " + e.getPatientName());
                }
            }
        });
        
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("hh:mm a");

        return all.stream().sorted((a, b) -> {
            // 1. IN_SESSION always top
            if (com.example.healthtech.config.AppConstants.STATUS_IN_SESSION.equals(a.getStatus()) && !com.example.healthtech.config.AppConstants.STATUS_IN_SESSION.equals(b.getStatus())) return -1;
            if (!com.example.healthtech.config.AppConstants.STATUS_IN_SESSION.equals(a.getStatus()) && com.example.healthtech.config.AppConstants.STATUS_IN_SESSION.equals(b.getStatus())) return 1;

            // 2. LATE always bottom
            if (com.example.healthtech.config.AppConstants.STATUS_LATE.equals(a.getStatus()) && !com.example.healthtech.config.AppConstants.STATUS_LATE.equals(b.getStatus())) return 1;
            if (!com.example.healthtech.config.AppConstants.STATUS_LATE.equals(a.getStatus()) && com.example.healthtech.config.AppConstants.STATUS_LATE.equals(b.getStatus())) return -1;

            // 3. Interleave Logic via Virtual Time (for WAITING/ARRIVED/COMPLETED etc)
            LocalTime timeA = getVirtualTime(a, fmt);
            LocalTime timeB = getVirtualTime(b, fmt);
            
            int cmp = timeA.compareTo(timeB);
            if (cmp != 0) return cmp;

            // Tie-break: If times are identical, Standard patients take precedence for the slot
            boolean aPremium = com.example.healthtech.config.AppConstants.TIER_PREMIUM.equalsIgnoreCase(a.getTier());
            boolean bPremium = com.example.healthtech.config.AppConstants.TIER_PREMIUM.equalsIgnoreCase(b.getTier());
            if (!aPremium && bPremium) return -1;
            if (aPremium && !bPremium) return 1;

            return 0;
        }).collect(Collectors.toList());
    }

    private LocalTime getVirtualTime(LiveQueueEntry e, DateTimeFormatter fmt) {
        if ("premium".equalsIgnoreCase(e.getTier()) && e.getAppointmentTime() != null && !e.getAppointmentTime().contains("Walk-in")) {
            try {
                return LocalTime.parse(e.getAppointmentTime().toUpperCase(), fmt);
            } catch (Exception ex) {
                // Ignore malformed
            }
        }
        
        // Standard Patient: Interleave by assuming each standard token occupies a 20-min segment starting from 09:00 AM
        // Note: Standard #1 should start at 09:00 AM
        int token = e.getTokenNumber() != null ? e.getTokenNumber() : 999;
        return LocalTime.of(9, 0).plusMinutes((token - 1) * 20L);
    }
}
