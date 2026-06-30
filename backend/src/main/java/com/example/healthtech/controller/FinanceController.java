package com.example.healthtech.controller;

import com.example.healthtech.model.ApptHistory;
import com.example.healthtech.model.Doctor;
import com.example.healthtech.repository.jpa.ApptHistoryRepository;
import com.example.healthtech.repository.jpa.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    @Autowired
    private ApptHistoryRepository apptHistoryRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    /**
     * Returns the chronological ledger for a doctor.
     * Maps ApptHistory to the 'ledger' format expected by DoctorBalance.tsx
     */
    @GetMapping("/ledger/{doctorId}")
    public ResponseEntity<?> getDoctorLedger(@PathVariable Long doctorId) {
        // ID Resolution: Handle Account ID if needed
        Long actualDocId = doctorId;
        java.util.Optional<Doctor> docOpt = doctorRepository.findById(doctorId);
        if (docOpt.isEmpty()) {
            docOpt = doctorRepository.findByAccountId(doctorId);
            if (docOpt.isPresent()) actualDocId = docOpt.get().getId();
        }

        List<ApptHistory> history = apptHistoryRepository.findByDoctorIdOrderByTimestampDesc(actualDocId);
        List<Map<String, Object>> ledger = new ArrayList<>();

        for (ApptHistory h : history) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", h.getId());
            entry.put("type", h.getIsPremium() ? "PREMIUM_CONSULTATION" : "CONSULTATION_FEE");
            entry.put("amount", h.getFeeAmount());
            entry.put("timestamp", h.getTimestamp());
            entry.put("patientName", h.getPatientName());
            entry.put("status", "CREDITED");
            ledger.add(entry);
        }

        return ResponseEntity.ok(ledger);
    }

    /**
     * Returns the commitment log (detailed transaction history) for a doctor.
     */
    @GetMapping("/commitment-log/{doctorId}")
    public ResponseEntity<?> getCommitmentLog(@PathVariable Long doctorId) {
        Long actualDocId = doctorId;
        java.util.Optional<Doctor> docOpt = doctorRepository.findById(doctorId);
        if (docOpt.isEmpty()) {
            docOpt = doctorRepository.findByAccountId(doctorId);
            if (docOpt.isPresent()) actualDocId = docOpt.get().getId();
        }

        List<ApptHistory> history = apptHistoryRepository.findByDoctorIdOrderByTimestampDesc(actualDocId);
        List<Map<String, Object>> logs = new ArrayList<>();

        for (ApptHistory h : history) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("patientName", h.getPatientName());
            entry.put("paymentMode", h.getPaymentMode() != null ? h.getPaymentMode() : "CASH/UPI");
            entry.put("appointmentTime", h.getAppointmentTime());
            entry.put("status", "SUCCESS");
            entry.put("type", h.getIsPremium() ? "Elite" : "Standard");
            entry.put("amount", h.getFeeAmount());
            entry.put("timestamp", h.getTimestamp());
            logs.add(entry);
        }

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/stats/{doctorId}")
    public ResponseEntity<?> getFinanceStats(@PathVariable Long doctorId, @RequestParam(required = false) String date) {
        Long actualDocId = doctorId;
        java.util.Optional<Doctor> docOpt = doctorRepository.findById(doctorId);
        if (docOpt.isEmpty()) {
            docOpt = doctorRepository.findByAccountId(doctorId);
            if (docOpt.isPresent()) actualDocId = docOpt.get().getId();
        }

        LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now(ZoneId.of("Asia/Kolkata"));
        List<ApptHistory> todayHistory = apptHistoryRepository.findByDoctorIdAndVisitDate(actualDocId, targetDate);
        
        long todayRevenue = todayHistory.stream().mapToLong(h -> h.getFeeAmount() != null ? h.getFeeAmount() : 500).sum();
        double totalRevenue = docOpt.isPresent() ? (docOpt.get().getTotalRevenue() != null ? docOpt.get().getTotalRevenue() : todayRevenue) : todayRevenue;

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayRevenue", todayRevenue);
        stats.put("totalRevenue", totalRevenue);
        stats.put("payoutBalance", totalRevenue * 0.8); // Example: 80% to doctor
        stats.put("processedPatients", todayHistory.size());

        return ResponseEntity.ok(stats);
    }
}
