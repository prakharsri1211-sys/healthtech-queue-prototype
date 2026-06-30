package com.example.healthtech.service;

import com.example.healthtech.model.FinanceLedger;
import com.example.healthtech.repository.jpa.FinanceLedgerRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class FinanceService {
    private final FinanceLedgerRepository ledgerRepository;

    public FinanceService(FinanceLedgerRepository ledgerRepository) {
        this.ledgerRepository = ledgerRepository;
    }

    public FinanceLedger getLedgerForPatient(String patientId) {
        return ledgerRepository.findByPatientId(patientId).orElseGet(() -> {
            FinanceLedger f = new FinanceLedger();
            f.setPatientId(patientId);
            f.setCreditExpiryDate(null);
            return ledgerRepository.save(f);
        });
    }

    public FinanceLedger adjustCredit(String patientId, int amount, LocalDate expiry) {
        FinanceLedger f = getLedgerForPatient(patientId);
        f.setCreditBalance(f.getCreditBalance() + amount);
        if (expiry != null)
            f.setCreditExpiryDate(expiry);
        return ledgerRepository.save(f);
    }
}
