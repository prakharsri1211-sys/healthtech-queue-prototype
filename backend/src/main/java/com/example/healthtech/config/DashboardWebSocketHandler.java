package com.example.healthtech.config;

import com.example.healthtech.service.QueueService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class DashboardWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(DashboardWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final QueueService queueService;
    private final com.example.healthtech.repository.mongodb.LiveQueueEntryRepository liveQueueEntryRepository;
    private final com.example.healthtech.service.PushNotificationService pushService;

    public DashboardWebSocketHandler(QueueService queueService, ObjectMapper objectMapper, com.example.healthtech.repository.mongodb.LiveQueueEntryRepository liveQueueEntryRepository, com.example.healthtech.service.PushNotificationService pushService) {
        this.queueService = queueService;
        this.objectMapper = objectMapper;
        this.liveQueueEntryRepository = liveQueueEntryRepository;
        this.pushService = pushService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        System.out.println("WebSocket connection established: " + session.getId());
        
        // Initial sync
        sendQueueSync(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("Received message: " + payload);
        
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");
            
            if ("ping".equals(type)) {
                session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
                return;
            }
            
            if ("REORDER".equals(type)) {
                String patientId = (String) data.get("patientId");
                String direction = (String) data.get("direction");
                queueService.pushDown(patientId, "UP".equals(direction) ? -1 : 1);
                broadcastQueueSync();
            } else if ("PUSH_DOWN_3".equals(type)) {
                String patientId = (String) data.get("patientId");
                queueService.pushDown(patientId, 3);
                broadcastQueueSync();
            } else if ("EMERGENCY_ALERT".equals(type)) {
                // Broadcast to everyone (Doctor will show popup, Mediator ignore popup but show status)
                broadcast(payload);
                // Send push notification to all staff
                try {
                    Map<String, String> pushPayload = Map.of(
                        "title", "🚨 EMERGENCY ALERT",
                        "body", "An emergency has been declared at the clinic!",
                        "url", "/dashboard"
                    );
                    pushService.sendPushToAll(objectMapper.writeValueAsString(pushPayload));
                } catch(Exception ex) {
                    logger.error("Failed to send emergency push notification to staff", ex);
                }
            } else if ("SET_ACTIVE".equals(type)) {
                String patientId = (String) data.get("patientId");
                queueService.setActivePatient(patientId);
                broadcastQueueSync();
            } else if ("RESTORE_TO_QUEUE".equals(type)) {
                String patientId = (String) data.get("patientId");
                queueService.restorePatient(patientId);
                broadcastQueueSync();
            } else if ("DISCHARGE".equals(type)) {
                String patientId = (String) data.get("patientId");
                if (patientId != null) {
                    String realPid = queueService.dischargePatient(patientId);
                    java.util.Map<String, Object> dischargeMsg = new java.util.HashMap<>();
                    dischargeMsg.put("type", "PATIENT_DISCHARGED");
                    dischargeMsg.put("patientId", realPid != null ? realPid : patientId);
                    broadcast(objectMapper.writeValueAsString(dischargeMsg));
                    broadcastQueueSync();
                }
            } else if ("PURGE".equals(type)) {
                queueService.purgeQueue();
                broadcastQueueSync();
            } else if ("DOCTOR_READY".equals(type)) {
                // Broadcast to notify Mediator that Doctor is ready for next patient
                broadcast(payload);
            } else if ("PATIENT_ARRIVED".equals(type)) {
                // Already updated via REST PUT, just broadcast a sync to refresh mediator
                broadcastQueueSync();
            } else if ("CALL_PATIENT".equals(type) || "SIGNAL_PATIENT".equals(type) || "TURN_SIGNAL".equals(type)) {
                // Broadcast to Tracker page
                broadcast(payload);
                // Trigger Background Push Notification to the Patient
                try {
                    String patientId = (String) data.get("patientId");
                    if (patientId != null) {
                        Map<String, String> pushPayload = Map.of(
                            "title", "🔔 It is your turn!",
                            "body", "The doctor is ready for you now. Please proceed to the office.",
                            "url", "/tracker"
                        );
                        pushService.sendPushToAccount(patientId, objectMapper.writeValueAsString(pushPayload));
                    }
                } catch(Exception ex) {
                    logger.error("Failed to send push notification to patient upon assignment", ex);
                }
            } else if ("SHIFT_STARTED".equals(type)) {
                // Broadcast shift starting events explicitly to Mediator and Tracker
                try {
                    Object docIdObj = data.get("doctorId");
                    Long doctorId = null;
                    if (docIdObj instanceof Number) {
                        doctorId = ((Number) docIdObj).longValue();
                    } else if (docIdObj instanceof String) {
                        doctorId = Long.parseLong((String) docIdObj);
                    }
                    String doctorName = (String) data.get("doctorName");
                    
                    java.util.Map<String, Object> broadcastMsg = new java.util.HashMap<>();
                    broadcastMsg.put("type", "SHIFT_STARTED");
                    broadcastMsg.put("doctorId", doctorId);
                    broadcastMsg.put("doctorName", doctorName);
                    broadcastMsg.put("timestamp", java.time.LocalDateTime.now().toString());
                    
                    broadcast(objectMapper.writeValueAsString(broadcastMsg));
                } catch (Exception e) {
                    e.printStackTrace();
                    broadcast(payload);
                }
            } else {
                // Default broadcast for other sync events
                broadcast(payload);
            }
        } catch (Exception e) {
            e.printStackTrace();
            broadcast(payload);
        }
    }

    private void sendQueueSync(WebSocketSession session) throws IOException {
        Map<String, Object> sync = Map.of(
            "type", "QUEUE_SYNC",
            "patients", queueService.getCurrentQueue(),
            "timestamp", System.currentTimeMillis()
        );
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(sync)));
    }

    public void broadcastQueueSync() {
        try {
            Map<String, Object> sync = Map.of(
                "type", "QUEUE_SYNC",
                "patients", queueService.getCurrentQueue(),
                "timestamp", System.currentTimeMillis()
            );
            broadcast(objectMapper.writeValueAsString(sync));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void broadcast(String message) {
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
