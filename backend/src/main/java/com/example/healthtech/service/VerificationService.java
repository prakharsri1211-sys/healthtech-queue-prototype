package com.example.healthtech.service;

import com.example.healthtech.model.Account;
import com.example.healthtech.repository.jpa.AccountRepository;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class VerificationService {

    private final AccountRepository accountRepository;

    public VerificationService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    /**
     * Verifies patient identity based on Aadhaar, Mobile, or Health ID.
     */
    public boolean verifyPatient(String identifier) {
        System.out.println("[VerificationService] Attempting verification for identifier: [Redacted for Security]");
        
        // Aadhaar Search (with redacted log)
        System.out.println("[VerificationService] Checking if [Aadhaar Redacted] exists in system...");
        Optional<Account> byAadhar = accountRepository.findByPrimaryAadharNumber(identifier);
        if (byAadhar.isPresent()) return true;

        // Mobile Search
        Optional<Account> byMobile = accountRepository.findByPhoneNumber(identifier);
        if (byMobile.isPresent()) return true;

        // Health ID Search
        Optional<Account> byHealthId = accountRepository.findByGovHealthId(identifier);
        return byHealthId.isPresent();
    }
}
