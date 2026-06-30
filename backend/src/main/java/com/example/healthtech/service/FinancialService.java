package com.example.healthtech.service;

import com.example.healthtech.model.FinanceLedger;
import com.example.healthtech.model.Doctor;
import com.example.healthtech.repository.jpa.FinanceLedgerRepository;
import com.example.healthtech.repository.jpa.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
public class FinancialService {

    @Autowired
    private FinanceLedgerRepository financeLedgerRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    private static final int COMMITMENT_FEE = 100;
    private static final int CONSULTATION_FEE = 400;

    @Transactional
    public void processPremiumBooking(String patientId) {
        System.out.println("Processing Premium Booking for Patient " + patientId);
        System.out.println("Split: ₹" + COMMITMENT_FEE + " (Commitment) + ₹" + CONSULTATION_FEE + " (Consultation)");
    }

    @Transactional
    public void handleCancellation(String patientId, boolean isEligibleForRefund) {
        if (isEligibleForRefund) {
            FinanceLedger ledger = financeLedgerRepository.findByPatientId(patientId)
                    .orElseGet(() -> {
                        FinanceLedger newLedger = new FinanceLedger();
                        newLedger.setPatientId(patientId);
                        return newLedger;
                    });

            ledger.setCreditBalance(ledger.getCreditBalance() + COMMITMENT_FEE);
            ledger.setCreditExpiryDate(LocalDate.now().plusDays(7));
            financeLedgerRepository.save(ledger);
            System.out.println("Refunded ₹400. Stored ₹100 in Credit for Patient " + patientId);
        }
    }

    @Transactional
    public int applyValidCredit(String patientId, int currentTotal) {
        Optional<FinanceLedger> ledgerOpt = financeLedgerRepository.findByPatientId(patientId);

        if (ledgerOpt.isPresent()) {
            FinanceLedger ledger = ledgerOpt.get();
            LocalDate now = LocalDate.now();

            if (ledger.getCreditBalance() >= COMMITMENT_FEE &&
                    (ledger.getCreditExpiryDate() == null || now.isBefore(ledger.getCreditExpiryDate()))) {

                ledger.setCreditBalance(ledger.getCreditBalance() - COMMITMENT_FEE);
                financeLedgerRepository.save(ledger);
                System.out.println("Applied ₹100 credit for Patient " + patientId);
                return currentTotal - COMMITMENT_FEE;
            }
        }
        return currentTotal;
    }

    @Transactional
    public void handleNoShow(String patientId, Long doctorId) {
        FinanceLedger ledger = financeLedgerRepository.findByPatientId(patientId)
                .orElseGet(() -> {
                    FinanceLedger newLedger = new FinanceLedger();
                    newLedger.setPatientId(patientId);
                    return newLedger;
                });

        int currentBalance = ledger.getCreditBalance() != null ? ledger.getCreditBalance() : 0;
        ledger.setCreditBalance(currentBalance - 100);

        int currentHeld = ledger.getHeldNoShowCredit() != null ? ledger.getHeldNoShowCredit() : 0;
        ledger.setHeldNoShowCredit(currentHeld + 100);

        ledger.setLastNoShowDoctorId(doctorId);

        LocalDate expiry = addWorkingDays(LocalDate.now(ZoneId.of("Asia/Kolkata")), 7);
        ledger.setCreditExpiryDate(expiry);

        financeLedgerRepository.save(ledger);
        System.out.println("[NO_SHOW] Deducted 100 from balance and moved to heldNoShowCredit for patient " + patientId + ", lastNoShowDoctorId=" + doctorId + ", expiry: " + expiry);
    }

    @Transactional
    public int calculateCompletedTotal(String patientId, Long doctorId, boolean isPremium) {
        int baseFee = 500;
        int tierPremium = isPremium ? 150 : 0;
        int total = baseFee + tierPremium;

        Optional<FinanceLedger> ledgerOpt = financeLedgerRepository.findByPatientId(patientId);
        if (ledgerOpt.isPresent()) {
            FinanceLedger ledger = ledgerOpt.get();
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

            if (ledger.getHeldNoShowCredit() != null && ledger.getHeldNoShowCredit() > 0 &&
                    ledger.getCreditExpiryDate() != null && !today.isAfter(ledger.getCreditExpiryDate())) {
                
                total = total - 100;
                ledger.setHeldNoShowCredit(0);
                financeLedgerRepository.save(ledger);
                System.out.println("[DISCHARGE] Applied 100 INR held no-show credit discount for patient " + patientId + ". New total: " + total);
            }
        }
        return total;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * *") // Every minute
    @Transactional
    public void processExpiredHeldCredits() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        List<FinanceLedger> ledgers = financeLedgerRepository.findAll();
        for (FinanceLedger ledger : ledgers) {
            if (ledger.getHeldNoShowCredit() != null && ledger.getHeldNoShowCredit() > 0) {
                if (ledger.getCreditExpiryDate() != null && today.isAfter(ledger.getCreditExpiryDate())) {
                    Long docId = ledger.getLastNoShowDoctorId();
                    if (docId != null) {
                        Optional<Doctor> docOpt = doctorRepository.findById(docId);
                        if (docOpt.isPresent()) {
                            Doctor doctor = docOpt.get();
                            if (doctor.getTotalRevenue() == null) {
                                doctor.setTotalRevenue(0.0);
                            }
                            doctor.setTotalRevenue(doctor.getTotalRevenue() + ledger.getHeldNoShowCredit());
                            doctorRepository.save(doctor);
                            System.out.println("[CRON] Expired held credit: shifted " + ledger.getHeldNoShowCredit() + " to Dr. " + doctor.getName());
                        }
                    }
                    ledger.setHeldNoShowCredit(0);
                    financeLedgerRepository.save(ledger);
                }
            }
        }
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
}
