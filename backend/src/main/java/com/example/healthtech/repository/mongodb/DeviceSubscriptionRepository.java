package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.DeviceSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceSubscriptionRepository extends MongoRepository<DeviceSubscription, String> {
    List<DeviceSubscription> findByAccountId(String accountId);
    Optional<DeviceSubscription> findByEndpoint(String endpoint);
}
