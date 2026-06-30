package com.example.healthtech.service;

import com.example.healthtech.model.Account;
import com.example.healthtech.repository.jpa.AccountRepository;
import com.example.healthtech.repository.mongodb.PatientRepository;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PatientService {
    private final AccountRepository accountRepository;
    private final PatientRepository patientRepository;

    public PatientService(AccountRepository accountRepository, PatientRepository patientRepository) {
        this.accountRepository = accountRepository;
        this.patientRepository = patientRepository;
    }

    public Account findOrCreateAccountByPhone(String phoneNumber) {
        // Search for existing account by phone
        Optional<Account> existingAccount = accountRepository.findByPhoneNumber(phoneNumber);
        if (existingAccount.isPresent()) {
            return existingAccount.get();
        }

        // Auto-create new account if not found
        Account newAccount = new Account();
        newAccount.setPhoneNumber(phoneNumber);
        // Patients are in MongoDB now, no need to initialize list in Account
        return accountRepository.save(newAccount);
    }
}
