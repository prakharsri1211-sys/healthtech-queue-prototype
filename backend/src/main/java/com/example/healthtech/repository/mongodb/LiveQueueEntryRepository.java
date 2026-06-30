package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.LiveQueueEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LiveQueueEntryRepository extends MongoRepository<LiveQueueEntry, String> {
    List<LiveQueueEntry> findByQueueIdOrderByPositionAsc(String queueId);
    void deleteByPatientId(String patientId);
    Optional<LiveQueueEntry> findByPatientId(String patientId);
    LiveQueueEntry findTopByOrderByTokenNumberDesc();
    List<LiveQueueEntry> findByServedFalseOrderByTokenNumberAsc();
}
