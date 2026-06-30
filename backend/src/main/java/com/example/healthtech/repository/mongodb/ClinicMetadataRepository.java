package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.ClinicMetadata;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface ClinicMetadataRepository extends MongoRepository<ClinicMetadata, String> {
    Optional<ClinicMetadata> findByDoctorId(Long doctorId);
}
