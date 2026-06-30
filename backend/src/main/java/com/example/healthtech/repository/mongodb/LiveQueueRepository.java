package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.LiveQueue;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LiveQueueRepository extends MongoRepository<LiveQueue, String> {
    Optional<LiveQueue> findByDoctorId(Long doctorId);
}
