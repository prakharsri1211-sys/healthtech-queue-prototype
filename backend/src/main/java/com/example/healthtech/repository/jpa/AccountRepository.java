package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByPhoneNumber(String phoneNumber);
    Optional<Account> findByPhoneNumberAndPrimaryAadharNumber(String phoneNumber, String primaryAadharNumber);
    Optional<Account> findByUsername(String username);
    Optional<Account> findByPrimaryAadharNumber(String primaryAadharNumber);
    Optional<Account> findByGovHealthId(String govHealthId);
    Optional<Account> findByIdentityToken(String identityToken);
}
