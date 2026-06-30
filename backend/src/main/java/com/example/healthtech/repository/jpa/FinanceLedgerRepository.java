package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.FinanceLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FinanceLedgerRepository extends JpaRepository<FinanceLedger, Long> {
    Optional<FinanceLedger> findByPatientId(String patientId);
}
