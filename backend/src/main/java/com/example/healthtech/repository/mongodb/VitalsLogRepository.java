package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.VitalsLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VitalsLogRepository extends MongoRepository<VitalsLog, String> {
}
