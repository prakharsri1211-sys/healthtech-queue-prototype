package com.example.healthtech.service;

import com.example.healthtech.model.DeviceSubscription;
import com.example.healthtech.repository.mongodb.DeviceSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.security.Security;
import java.util.List;

@Service
public class PushNotificationService {

    @Value("${vapid.public.key}")
    private String publicKey;

    @Value("${vapid.private.key}")
    private String privateKey;

    private PushService pushService;
    private final DeviceSubscriptionRepository subscriptionRepository;

    public PushNotificationService(DeviceSubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @PostConstruct
    private void init() {
        try {
            // Add BouncyCastle as a security provider
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            pushService = new PushService();
            pushService.setPublicKey(publicKey);
            pushService.setPrivateKey(privateKey);
            // Subject is required (usually a mailto or URL)
            pushService.setSubject("mailto:admin@healthtech.com");
        } catch (Exception e) {
            System.err.println("[WebPush] Failed to initialize PushService: " + e.getMessage());
        }
    }

    /**
     * Send a notification to a specific account (will send to all their devices).
     */
    public void sendPushToAccount(String accountId, String payloadJson) {
        List<DeviceSubscription> subs = subscriptionRepository.findByAccountId(accountId);
        for (DeviceSubscription sub : subs) {
            sendPush(sub, payloadJson);
        }
    }

    /**
     * Send a notification to all devices in the system (e.g. for emergencies).
     */
    public void sendPushToAll(String payloadJson) {
        List<DeviceSubscription> subs = subscriptionRepository.findAll();
        for (DeviceSubscription sub : subs) {
            sendPush(sub, payloadJson);
        }
    }

    private void sendPush(DeviceSubscription sub, String payloadJson) {
        try {
            Subscription.Keys keys = new Subscription.Keys(sub.getP256dh(), sub.getAuth());
            Subscription subscription = new Subscription(sub.getEndpoint(), keys);
            
            Notification notification = new Notification(subscription, payloadJson);
            org.apache.http.HttpResponse response = pushService.send(notification);
            
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode == 410 || statusCode == 404) {
                // Subscription has expired or is no longer valid
                System.out.println("[WebPush] Subscription expired for account " + sub.getAccountId() + ". Removing.");
                subscriptionRepository.delete(sub);
            }
        } catch (Exception e) {
            System.err.println("[WebPush] Error sending push to " + sub.getAccountId() + ": " + e.getMessage());
        }
    }
}
