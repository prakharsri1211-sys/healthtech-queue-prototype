package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "device_subscriptions")
public class DeviceSubscription {

    @Id
    private String id;
    
    private String accountId; // The ID of the user (Patient, Doctor, Mediator)
    private String role; // ROLE_PATIENT, ROLE_DOCTOR, ROLE_MEDIATOR
    
    private String endpoint;
    private String p256dh;
    private String auth;
    
    private LocalDateTime subscribedAt;

    public DeviceSubscription() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }

    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }

    public LocalDateTime getSubscribedAt() { return subscribedAt; }
    public void setSubscribedAt(LocalDateTime subscribedAt) { this.subscribedAt = subscribedAt; }
}
