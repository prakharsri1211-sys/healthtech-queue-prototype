package com.example.healthtech.controller;

import com.example.healthtech.model.DeviceSubscription;
import com.example.healthtech.repository.mongodb.DeviceSubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/push")
public class PushNotificationController {

    private final DeviceSubscriptionRepository subscriptionRepository;

    public PushNotificationController(DeviceSubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> payload, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        
        String accountId = auth.getName(); // In our JWT setup, this is the account ID
        String role = auth.getAuthorities().iterator().next().getAuthority();

        String endpoint = (String) payload.get("endpoint");
        
        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) payload.get("keys");
        if (keys == null || endpoint == null) {
            return ResponseEntity.badRequest().body("Invalid subscription object");
        }
        
        String p256dh = keys.get("p256dh");
        String authKey = keys.get("auth");

        // Check if subscription exists
        Optional<DeviceSubscription> existing = subscriptionRepository.findByEndpoint(endpoint);
        DeviceSubscription sub = existing.orElse(new DeviceSubscription());
        
        sub.setAccountId(accountId);
        sub.setRole(role);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(authKey);
        sub.setSubscribedAt(LocalDateTime.now());
        
        subscriptionRepository.save(sub);

        return ResponseEntity.ok(Map.of("message", "Subscribed successfully"));
    }
}
