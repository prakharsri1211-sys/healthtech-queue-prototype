package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.SystemErrorLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemErrorLogRepository extends MongoRepository<SystemErrorLog, String> {
    List<SystemErrorLog> findBySourceOrderByTimestampDesc(String source);
    List<SystemErrorLog> findAllByOrderByTimestampDesc();
}
