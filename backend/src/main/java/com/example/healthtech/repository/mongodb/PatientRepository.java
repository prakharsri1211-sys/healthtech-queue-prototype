package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.mongodb.repository.Query;
import java.util.List;

@Repository
public interface PatientRepository extends MongoRepository<Patient, String> {
    List<Patient> findByAccountId(Long accountId);
    List<Patient> findByNameContainingIgnoreCase(String name);
    
    @Query("{ 'aadharOrAbhaId' : ?0 }")
    java.util.Optional<Patient> findByIdentity(String identityValue);
}
