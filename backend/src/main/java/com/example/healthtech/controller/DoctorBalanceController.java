package com.example.healthtech.controller;

import com.example.healthtech.model.FinanceLedger;
import com.example.healthtech.service.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/doctor/balance")
public class DoctorBalanceController {
    private final FinanceService financeService;

    public DoctorBalanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/{patientId}")
    public ResponseEntity<FinanceLedger> getLedger(@PathVariable String patientId) {
        return ResponseEntity.ok(financeService.getLedgerForPatient(patientId));
    }

    @PostMapping("/{patientId}/adjust")
    public ResponseEntity<FinanceLedger> adjust(@PathVariable String patientId, @RequestParam int amount, @RequestParam(required = false) String expiry) {
        LocalDate ex = expiry != null ? LocalDate.parse(expiry) : null;
        return ResponseEntity.ok(financeService.adjustCredit(patientId, amount, ex));
    }
}
